import { now } from "@/shared/lib/clock";
import type { Database } from "@/shared/lib/supabase/database.types";
import type { BaseRow, DataStore, NewRow } from "@/shared/data/types";
import { notify } from "@/domains/notifications/repository";
import { deriveAssignment, isTaskDone, isVisibleTo } from "./services/taskRules";
import type { MemberRef, TaskView } from "./types";

// Le seul endroit autorisé à lire/écrire `tasks` et ses tables de liaison,
// toujours via le DataStore.

type Tables = Database["public"]["Tables"];
type TaskRow = Tables["tasks"]["Row"];
type MemberRow = Tables["family_members"]["Row"];
type CategoryRow = Tables["task_categories"]["Row"];
// Tables de liaison à clé composite : pas de colonne `id` en base (seulement
// créer / lister ; pas de suppression par id côté Supabase).
type ParticipantRow = Tables["task_participants"]["Row"] & BaseRow;
type CategoryLinkRow = Tables["task_categories_link"]["Row"] & BaseRow;

export async function createTaskCategory(
  store: DataStore,
  familyId: string,
  name: string,
  needsContactPlace: boolean
): Promise<void> {
  await store.create<CategoryRow>("task_categories", {
    family_id: familyId,
    name,
    necessite_contact_lieu: needsContactPlace,
  });
}

export async function getTaskCategories(store: DataStore, familyId: string): Promise<Array<{ id: string; name: string }>> {
  const categories = await store.list<CategoryRow>("task_categories", { family_id: familyId });
  return categories.map(({ id, name }) => ({ id, name }));
}

export interface CreateTaskInput {
  familyId: string;
  creatorId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  locationText: string | null;
  participantIds: string[];
  discuss: boolean;
  recurrenceDays: number[];
  isUrgent: boolean;
  isPrivate: boolean;
  categoryId: string | null;
  sujetId?: string | null;
}

export async function createTask(store: DataStore, input: CreateTaskInput): Promise<string> {
  // Une tâche privée n'est visible que de son créateur : elle ne peut être qu'à lui.
  const participantIds = input.isPrivate ? [input.creatorId] : input.participantIds;
  const discuss = input.isPrivate ? false : input.discuss;
  const plan = deriveAssignment(input.creatorId, participantIds, discuss);

  const task = await store.create<TaskRow>("tasks", {
    family_id: input.familyId,
    title: input.title,
    description: input.description,
    due_date: input.dueDate,
    due_time: input.dueTime,
    subject_id: plan.subjectId,
    actor_id: input.creatorId,
    location_contact_id: null,
    location_text: input.locationText,
    assignment_status: plan.status,
    recurrence_type: input.recurrenceDays.length > 0 ? "weekly_pattern" : "none",
    recurrence_days: input.recurrenceDays,
    visibility: input.isPrivate ? "private" : "family",
    is_urgent: input.isUrgent,
    sujet_id: input.sujetId ?? null,
    completed_at: null,
  } satisfies NewRow<TaskRow>);

  for (const participant of plan.participants) {
    await store.create<ParticipantRow>("task_participants", {
      task_id: task.id,
      member_id: participant.memberId,
      role_in_task: participant.role,
    } satisfies NewRow<ParticipantRow>);
  }

  if (input.categoryId) {
    await store.create<CategoryLinkRow>("task_categories_link", {
      task_id: task.id,
      category_id: input.categoryId,
    } satisfies NewRow<CategoryLinkRow>);
  }

  await notifyAboutTask(store, input, plan.participants.map((p) => p.memberId), discuss);
  return task.id;
}

// Le créateur n'est jamais notifié de sa propre action.
async function notifyAboutTask(
  store: DataStore,
  input: CreateTaskInput,
  participantIds: string[],
  discuss: boolean
): Promise<void> {
  const members = (await store.list<MemberRow>("family_members", { family_id: input.familyId })).filter(
    (member) => !member.deleted_at
  );
  const creatorName = members.find((member) => member.id === input.creatorId)?.name ?? "Quelqu'un";

  if (discuss) {
    for (const parent of members.filter((m) => m.role === "parent" && m.id !== input.creatorId)) {
      await notify(store, {
        familyId: input.familyId,
        recipientId: parent.id,
        category: "tache_a_discuter",
        title: `${creatorName} voudrait discuter de « ${input.title} »`,
        isUrgent: input.isUrgent,
      });
    }
    return;
  }

  for (const memberId of participantIds.filter((id) => id !== input.creatorId)) {
    await notify(store, {
      familyId: input.familyId,
      recipientId: memberId,
      category: "tache_assignee",
      title: `${creatorName} t'a assigné « ${input.title} »`,
      isUrgent: input.isUrgent,
    });
  }
}

const toRef = (member: MemberRow | undefined): MemberRef | null =>
  member ? { id: member.id, name: member.name, signatureColor: member.signature_color } : null;

interface TaskContext {
  tasks: TaskRow[];
  members: MemberRow[];
  participants: ParticipantRow[];
  links: CategoryLinkRow[];
  categories: CategoryRow[];
}

async function loadTaskContext(store: DataStore, familyId: string): Promise<TaskContext> {
  const [tasks, members, participants, links, categories] = await Promise.all([
    store.list<TaskRow>("tasks", { family_id: familyId }),
    store.list<MemberRow>("family_members", { family_id: familyId }),
    store.list<ParticipantRow>("task_participants"),
    store.list<CategoryLinkRow>("task_categories_link"),
    store.list<CategoryRow>("task_categories", { family_id: familyId }),
  ]);
  return { tasks, members, participants, links, categories };
}

// Une seule façon de fabriquer une TaskView : tâches d'un membre et tâches d'un Sujet sont les mêmes objets.
function toTaskView(task: TaskRow, context: TaskContext, today: Date): TaskView {
  const memberById = new Map(context.members.map((member) => [member.id, member]));
  const categoryNameById = new Map(context.categories.map((category) => [category.id, category.name]));
  const recurrenceDays = task.recurrence_days;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.due_date,
    dueTime: task.due_time,
    locationText: task.location_text,
    assignmentStatus: task.assignment_status,
    isUrgent: task.is_urgent,
    isPrivate: task.visibility === "private",
    sujetId: task.sujet_id,
    recurrenceDays,
    completedAt: task.completed_at,
    done: isTaskDone({ completedAt: task.completed_at, recurrenceDays }, today),
    creator: toRef(task.actor_id ? memberById.get(task.actor_id) : undefined),
    participants: context.participants
      .filter((p) => p.task_id === task.id)
      .map((p) => toRef(memberById.get(p.member_id)))
      .filter((ref): ref is MemberRef => ref !== null),
    categoryNames: context.links
      .filter((link) => link.task_id === task.id)
      .map((link) => categoryNameById.get(link.category_id))
      .filter((name): name is string => name !== undefined),
  };
}

const byDoneThenDate = (a: TaskView, b: TaskView) =>
  Number(a.done) - Number(b.done) ||
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
  (a.dueTime ?? "").localeCompare(b.dueTime ?? "");

const isVisibleToViewer = (task: TaskRow, viewerId: string) =>
  isVisibleTo({ isPrivate: task.visibility === "private", creatorId: task.actor_id }, viewerId);

// Tâches d'un membre, vues par `viewerId` : celles dont il est participant, celles
// qu'il a créées sans assignation, et — pour un parent — les tâches « à discuter ».
export async function getTasksOfMember(
  store: DataStore,
  familyId: string,
  memberId: string,
  viewerId: string,
  today: Date = now()
): Promise<TaskView[]> {
  const context = await loadTaskContext(store, familyId);
  const subject = context.members.find((member) => member.id === memberId);

  return context.tasks
    .filter((task) => isVisibleToViewer(task, viewerId))
    .filter((task) => {
      const taskParticipants = context.participants.filter((p) => p.task_id === task.id);
      if (taskParticipants.some((p) => p.member_id === memberId)) return true;
      if (task.assignment_status === "a_discuter") return subject?.role === "parent";
      return taskParticipants.length === 0 && task.subject_id === memberId;
    })
    .map((task) => toTaskView(task, context, today))
    .sort(byDoneThenDate);
}

// Les tâches rattachées à un Sujet (visibles du `viewerId` comme partout ailleurs).
export async function getTasksOfSujet(
  store: DataStore,
  familyId: string,
  sujetId: string,
  viewerId: string,
  today: Date = now()
): Promise<TaskView[]> {
  const context = await loadTaskContext(store, familyId);
  return context.tasks
    .filter((task) => task.sujet_id === sujetId && isVisibleToViewer(task, viewerId))
    .map((task) => toTaskView(task, context, today))
    .sort(byDoneThenDate);
}

export async function setTaskCompletion(store: DataStore, taskId: string, completed: boolean): Promise<void> {
  await store.update<TaskRow>("tasks", taskId, { completed_at: completed ? now().toISOString() : null });
}
