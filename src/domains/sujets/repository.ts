import type { Database } from "@/shared/lib/supabase/database.types";
import type { BaseRow, DataStore, NewRow } from "@/shared/data/types";
import { now } from "@/shared/lib/clock";
import { toDateString } from "@/shared/lib/date";
import { getBudgetOfTasks } from "@/domains/budget/repository";
import { notify } from "@/domains/notifications/repository";
import { createTask, getTasksOfSujet } from "@/domains/tasks/repository";
import { isTaskDone, isVisibleTo } from "@/domains/tasks/services/taskRules";
import type { MemberRef } from "@/domains/tasks/types";
import { canSee, effectiveStatus, isValidLink, normalizeParticipants, validateClosure } from "./services/sujetRules";
import type {
  ClosureMode,
  CommentView,
  LinkView,
  SujetCardView,
  SujetDetailView,
  SujetStatus,
  SujetTemplateKey,
  SujetVisibility,
} from "./types";

// Le seul endroit autorisé à lire/écrire `sujets`, `sujet_participants`,
// `sujet_links` et les commentaires de Sujet (`task_comments`), toujours via le DataStore.

type Tables = Database["public"]["Tables"];
type SujetRow = Tables["sujets"]["Row"];
type MemberRow = Tables["family_members"]["Row"];
type TaskRow = Tables["tasks"]["Row"];
// Table de liaison à clé composite : pas de colonne `id` en base.
type ParticipantRow = Tables["sujet_participants"]["Row"] & BaseRow;
type CommentRow = Tables["task_comments"]["Row"];
type LinkRow = Tables["sujet_links"]["Row"];

const toRef = (member: MemberRow | undefined): MemberRef | null =>
  member ? { id: member.id, name: member.name, signatureColor: member.signature_color } : null;

const activeMembers = async (store: DataStore, familyId: string): Promise<MemberRow[]> =>
  (await store.list<MemberRow>("family_members", { family_id: familyId })).filter((member) => !member.deleted_at);

const participantIdsOf = (participants: ParticipantRow[], sujetId: string) =>
  participants.filter((participant) => participant.sujet_id === sujetId).map((participant) => participant.member_id);

async function getRow(store: DataStore, sujetId: string): Promise<SujetRow> {
  const row = await store.get<SujetRow>("sujets", sujetId);
  if (!row) throw new Error("Sujet introuvable.");
  return row;
}

// ------------------------------------------------------------------ création

export interface CreateSujetInput {
  familyId: string;
  creatorId: string;
  title: string;
  description: string | null;
  template: SujetTemplateKey | null;
  visibility: SujetVisibility;
  participantIds: string[];
  closureMode: ClosureMode;
  eventDate: string | null;
  suggestedTasks: string[];
}

export async function createSujet(store: DataStore, input: CreateSujetInput): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error("Donne un titre au Sujet.");
  const closureError = validateClosure(input.closureMode, input.eventDate);
  if (closureError) throw new Error(closureError);

  const members = await activeMembers(store, input.familyId);
  const creator = members.find((member) => member.id === input.creatorId);
  if (creator?.role !== "parent") throw new Error("Seul un parent peut ouvrir un Sujet.");

  const sujet = await store.create<SujetRow>("sujets", {
    family_id: input.familyId,
    title,
    description: input.description?.trim() || null,
    template: input.template,
    closure_mode: input.closureMode,
    status: "ouvert",
    visibility: input.visibility,
    event_date: input.eventDate,
    created_by: input.creatorId,
  } satisfies NewRow<SujetRow>);

  const participantIds = normalizeParticipants(input.visibility, input.creatorId, members, input.participantIds);
  for (const memberId of participantIds) {
    await store.create<ParticipantRow>("sujet_participants", { sujet_id: sujet.id, member_id: memberId } satisfies NewRow<ParticipantRow>);
  }
  await notifyAdded(store, sujet, creator.name, participantIds.filter((id) => id !== input.creatorId));

  // Tâches suggérées : de vraies tâches liées au Sujet, sans assignation (« à décider »).
  for (const taskTitle of input.suggestedTasks.map((name) => name.trim()).filter(Boolean)) {
    await createTask(store, {
      familyId: input.familyId,
      creatorId: input.creatorId,
      title: taskTitle,
      description: null,
      dueDate: null,
      dueTime: null,
      locationText: null,
      participantIds: [],
      discuss: false,
      recurrenceDays: [],
      isUrgent: false,
      isPrivate: input.visibility === "prive",
      categoryId: null,
      sujetId: sujet.id,
    });
  }
  return sujet.id;
}

async function notifyAdded(store: DataStore, sujet: SujetRow, actorName: string, recipientIds: string[]): Promise<void> {
  for (const recipientId of recipientIds) {
    await notify(store, {
      familyId: sujet.family_id,
      recipientId,
      category: "sujet_invite",
      title: `${actorName} t'a ajouté au Sujet « ${sujet.title} »`,
    });
  }
}

// ------------------------------------------------------------------- lecture

interface TaskCount {
  total: number;
  done: number;
}

export async function getSujets(store: DataStore, familyId: string, viewerId: string, today: Date = now()): Promise<SujetCardView[]> {
  const [sujets, participants, tasks, members] = await Promise.all([
    store.list<SujetRow>("sujets", { family_id: familyId }),
    store.list<ParticipantRow>("sujet_participants"),
    store.list<TaskRow>("tasks", { family_id: familyId }),
    activeMembers(store, familyId),
  ]);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const todayKey = toDateString(today);

  const counts = new Map<string, TaskCount>();
  for (const task of tasks) {
    if (!task.sujet_id || !isVisibleTo({ isPrivate: task.visibility === "private", creatorId: task.actor_id }, viewerId)) continue;
    const count = counts.get(task.sujet_id) ?? { total: 0, done: 0 };
    count.total += 1;
    if (isTaskDone({ completedAt: task.completed_at, recurrenceDays: task.recurrence_days }, today)) count.done += 1;
    counts.set(task.sujet_id, count);
  }

  return sujets
    .filter((sujet) => canSee({ createdBy: sujet.created_by }, participantIdsOf(participants, sujet.id), viewerId))
    .map((sujet): SujetCardView => {
      const count = counts.get(sujet.id) ?? { total: 0, done: 0 };
      return {
        id: sujet.id,
        title: sujet.title,
        template: sujet.template,
        visibility: sujet.visibility,
        closureMode: sujet.closure_mode,
        eventDate: sujet.event_date,
        status: effectiveStatus({ status: sujet.status, closureMode: sujet.closure_mode, eventDate: sujet.event_date }, todayKey),
        participants: participantIdsOf(participants, sujet.id)
          .map((id) => toRef(memberById.get(id)))
          .filter((ref): ref is MemberRef => ref !== null),
        taskCount: count.total,
        doneCount: count.done,
      };
    })
    .sort((a, b) => (a.eventDate ?? "9999").localeCompare(b.eventDate ?? "9999"));
}

// null : Sujet introuvable ou que `viewerId` n'a pas le droit de voir.
export async function getSujetDetail(
  store: DataStore,
  familyId: string,
  sujetId: string,
  viewerId: string,
  today: Date = now()
): Promise<SujetDetailView | null> {
  const row = await store.get<SujetRow>("sujets", sujetId);
  if (!row || row.family_id !== familyId) return null;

  const [participants, members, comments, links, tasks] = await Promise.all([
    store.list<ParticipantRow>("sujet_participants", { sujet_id: sujetId }),
    activeMembers(store, familyId),
    store.list<CommentRow>("task_comments", { sujet_id: sujetId }),
    store.list<LinkRow>("sujet_links", { sujet_id: sujetId }),
    getTasksOfSujet(store, familyId, sujetId, viewerId, today),
  ]);
  const participantIds = participants.map((participant) => participant.member_id);
  if (!canSee({ createdBy: row.created_by }, participantIds, viewerId)) return null;

  const memberById = new Map(members.map((member) => [member.id, member]));
  const viewer = memberById.get(viewerId);
  const done = tasks.filter((task) => task.done).length;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    template: row.template,
    visibility: row.visibility,
    closureMode: row.closure_mode,
    eventDate: row.event_date,
    status: effectiveStatus({ status: row.status, closureMode: row.closure_mode, eventDate: row.event_date }, toDateString(today)),
    participants: participantIds.map((id) => toRef(memberById.get(id))).filter((ref): ref is MemberRef => ref !== null),
    taskCount: tasks.length,
    doneCount: done,
    creator: toRef(row.created_by ? memberById.get(row.created_by) : undefined),
    canEdit: viewer?.role === "parent" && (row.created_by === viewerId || participantIds.includes(viewerId)),
    tasks,
    comments: comments
      .map((comment): CommentView => ({
        id: comment.id,
        author: toRef(memberById.get(comment.author_id)),
        content: comment.content,
        createdAt: comment.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    links: links.map((link): LinkView => ({ id: link.id, label: link.label, url: link.url })),
    // L'enfant ne voit jamais l'argent.
    budget: viewer?.role === "parent" ? await getBudgetOfTasks(store, familyId, tasks.map((task) => task.id)) : null,
  };
}

// ------------------------------------------------------------ modification

export interface UpdateSujetInput {
  title?: string;
  description?: string | null;
  visibility?: SujetVisibility;
  closureMode?: ClosureMode;
  eventDate?: string | null;
}

export async function updateSujet(store: DataStore, sujetId: string, patch: UpdateSujetInput): Promise<void> {
  const row = await getRow(store, sujetId);
  const title = patch.title !== undefined ? patch.title.trim() : row.title;
  if (!title) throw new Error("Le titre ne peut pas être vide.");
  const closureMode = patch.closureMode ?? row.closure_mode;
  const eventDate = patch.eventDate !== undefined ? patch.eventDate : row.event_date;
  const closureError = validateClosure(closureMode, eventDate);
  if (closureError) throw new Error(closureError);

  await store.update<SujetRow>("sujets", sujetId, {
    title,
    description: patch.description !== undefined ? patch.description?.trim() || null : row.description,
    closure_mode: closureMode,
    event_date: eventDate,
    visibility: patch.visibility ?? row.visibility,
  });

  // Un changement de visibilité retire les participants qui n'ont plus le droit de voir le Sujet.
  if (patch.visibility && patch.visibility !== row.visibility) {
    const current = (await store.list<ParticipantRow>("sujet_participants", { sujet_id: sujetId })).map((p) => p.member_id);
    await setSujetParticipants(store, sujetId, current, row.created_by as string);
  }
}

export async function setSujetParticipants(store: DataStore, sujetId: string, participantIds: string[], actorId: string): Promise<void> {
  const row = await getRow(store, sujetId);
  const members = await activeMembers(store, row.family_id);
  const creatorId = row.created_by ?? actorId;
  const next = normalizeParticipants(row.visibility, creatorId, members, participantIds);
  const current = (await store.list<ParticipantRow>("sujet_participants", { sujet_id: sujetId })).map((p) => p.member_id);

  for (const memberId of current.filter((id) => !next.includes(id))) {
    await store.removeWhere("sujet_participants", { sujet_id: sujetId, member_id: memberId });
  }
  const added = next.filter((id) => !current.includes(id));
  for (const memberId of added) {
    await store.create<ParticipantRow>("sujet_participants", { sujet_id: sujetId, member_id: memberId } satisfies NewRow<ParticipantRow>);
  }
  const actor = members.find((member) => member.id === actorId);
  await notifyAdded(store, row, actor?.name ?? "Un parent", added.filter((id) => id !== actorId));
}

// ------------------------------------------------------------------ clôture

async function setStatus(store: DataStore, row: SujetRow, status: SujetStatus, actorId: string, verb: string): Promise<void> {
  await store.update<SujetRow>("sujets", row.id, { status });
  const [members, participants] = await Promise.all([
    activeMembers(store, row.family_id),
    store.list<ParticipantRow>("sujet_participants", { sujet_id: row.id }),
  ]);
  const actorName = members.find((member) => member.id === actorId)?.name ?? "Un parent";
  for (const participant of participants.filter((p) => p.member_id !== actorId)) {
    await notify(store, {
      familyId: row.family_id,
      recipientId: participant.member_id,
      category: "sujet_statut",
      title: `${actorName} ${verb} le Sujet « ${row.title} »`,
    });
  }
}

export async function closeSujet(store: DataStore, sujetId: string, actorId: string): Promise<void> {
  const row = await getRow(store, sujetId);
  if (row.status === "archive") return;
  await setStatus(store, row, "archive", actorId, "a clôturé");
}

// Rouvrir un Sujet à clôture automatique dont la date est passée demande une nouvelle date.
export async function reopenSujet(
  store: DataStore,
  sujetId: string,
  actorId: string,
  newEventDate?: string | null,
  today: Date = now()
): Promise<void> {
  const row = await getRow(store, sujetId);
  const eventDate = newEventDate !== undefined ? newEventDate : row.event_date;
  if (row.closure_mode === "auto_after_date" && (!eventDate || eventDate < toDateString(today))) {
    throw new Error("Pour rouvrir ce Sujet, choisis une nouvelle date de fin.");
  }
  if (newEventDate !== undefined) await store.update<SujetRow>("sujets", sujetId, { event_date: newEventDate });
  await setStatus(store, row, "ouvert", actorId, "a rouvert");
}

// Écrit le statut « archivé » des Sujets à clôture automatique dont la date est passée
// (idempotent). L'affichage est de toute façon dérivé par `effectiveStatus`.
export async function archiveExpiredSujets(store: DataStore, familyId: string, today: Date = now()): Promise<number> {
  const todayKey = toDateString(today);
  const expired = (await store.list<SujetRow>("sujets", { family_id: familyId })).filter(
    (row) =>
      row.status === "ouvert" &&
      effectiveStatus({ status: row.status, closureMode: row.closure_mode, eventDate: row.event_date }, todayKey) === "archive"
  );
  for (const row of expired) await store.update<SujetRow>("sujets", row.id, { status: "archive" });
  return expired.length;
}

// -------------------------------------------------------- échanges et liens

export async function addComment(store: DataStore, sujetId: string, authorId: string, content: string): Promise<void> {
  const text = content.trim();
  if (!text) throw new Error("Écris un message.");
  const row = await getRow(store, sujetId);
  await store.create<CommentRow>("task_comments", {
    task_id: null,
    sujet_id: sujetId,
    author_id: authorId,
    content: text,
  } satisfies NewRow<CommentRow>);

  const [members, participants] = await Promise.all([
    activeMembers(store, row.family_id),
    store.list<ParticipantRow>("sujet_participants", { sujet_id: sujetId }),
  ]);
  const authorName = members.find((member) => member.id === authorId)?.name ?? "Quelqu'un";
  for (const participant of participants.filter((p) => p.member_id !== authorId)) {
    await notify(store, {
      familyId: row.family_id,
      recipientId: participant.member_id,
      category: "sujet_commentaire",
      title: `${authorName} a écrit dans « ${row.title} »`,
      body: text.length > 120 ? `${text.slice(0, 117)}…` : text,
    });
  }
}

export async function addLink(store: DataStore, sujetId: string, addedBy: string, label: string, url: string): Promise<void> {
  const cleanUrl = url.trim();
  if (!isValidLink(cleanUrl)) throw new Error("Le lien doit commencer par http:// ou https://.");
  await store.create<LinkRow>("sujet_links", {
    sujet_id: sujetId,
    label: label.trim() || cleanUrl,
    url: cleanUrl,
    added_by: addedBy,
  } satisfies NewRow<LinkRow>);
}

export async function removeLink(store: DataStore, linkId: string): Promise<void> {
  await store.remove("sujet_links", linkId);
}
