import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";
import { startOfWeek, toDateString } from "@/shared/lib/date";
import { getChildReward, type ChildReward } from "@/domains/child/repository";
import type { RewardThreshold } from "@/domains/child/types";
import { notify } from "@/domains/notifications/repository";
import { setTaskCompletion } from "@/domains/tasks/repository";
import { computeProgress, type TierProgress } from "./services/progress";

// Le seul endroit autorisé à lire/écrire `task_completions` : journal des
// validations d'un enfant (pattern subject/actor), source du compte hebdomadaire
// des paliers et de l'annulation de la dernière action.

type Tables = Database["public"]["Tables"];
type CompletionRow = Tables["task_completions"]["Row"];
type TaskRow = Tables["tasks"]["Row"];
type MemberRow = Tables["family_members"]["Row"];

const byNewest = (a: CompletionRow, b: CompletionRow) => (b.created_at ?? "").localeCompare(a.created_at ?? "");

async function activeMembers(store: DataStore, familyId: string): Promise<MemberRow[]> {
  return (await store.list<MemberRow>("family_members", { family_id: familyId })).filter((member) => !member.deleted_at);
}

export interface ToggleCompletionInput {
  familyId: string;
  taskId: string;
  subjectId: string; // le membre dont on voit la liste (l'enfant concerné)
  actorId: string; // le profil qui coche (l'enfant, ou un parent pour lui)
  completed: boolean;
}

// Cocher / décocher une tâche. Pour un enfant : la validation est journalisée
// (sujet = l'enfant, acteur = qui a coché) et les parents sont notifiés.
export async function toggleTaskCompletion(store: DataStore, input: ToggleCompletionInput): Promise<void> {
  await setTaskCompletion(store, input.taskId, input.completed);

  const members = await activeMembers(store, input.familyId);
  const subject = members.find((member) => member.id === input.subjectId);
  if (subject?.role !== "enfant") return;

  if (!input.completed) {
    const latest = (await store.list<CompletionRow>("task_completions", { task_id: input.taskId, subject_id: input.subjectId }))
      .filter((row) => row.undone_at === null)
      .sort(byNewest)[0];
    if (latest) await store.update<CompletionRow>("task_completions", latest.id, { undone_at: new Date().toISOString() });
    return;
  }

  await store.create<CompletionRow>("task_completions", {
    family_id: input.familyId,
    task_id: input.taskId,
    subject_id: input.subjectId,
    actor_id: input.actorId,
    completed_on: toDateString(new Date()),
    undone_at: null,
  } satisfies NewRow<CompletionRow>);

  const task = await store.get<TaskRow>("tasks", input.taskId);
  for (const parent of members.filter((member) => member.role === "parent" && member.id !== input.actorId)) {
    await notify(store, {
      familyId: input.familyId,
      recipientId: parent.id,
      category: "tache_terminee",
      title: `${subject.name} a terminé « ${task?.title ?? "une tâche"} »`,
    });
  }
}

export interface LastAction {
  completionId: string;
  taskId: string;
  taskTitle: string;
}

export interface ChildProgress {
  reward: ChildReward | null;
  weekCount: number;
  progress: TierProgress<RewardThreshold> | null; // null = pas de paliers (aucun / compteur)
  lastAction: LastAction | null;
}

// Un seul niveau d'annulation : seule la toute dernière validation peut être
// annulée ; une fois annulée, plus rien à annuler jusqu'à la prochaine action.
async function findLastAction(store: DataStore, childId: string): Promise<CompletionRow | null> {
  const latest = (await store.list<CompletionRow>("task_completions", { subject_id: childId })).sort(byNewest)[0];
  return latest && latest.undone_at === null ? latest : null;
}

export async function getChildProgress(store: DataStore, childId: string, today: Date = new Date()): Promise<ChildProgress> {
  const monday = startOfWeek(today);
  const weekStart = toDateString(monday);
  const nextWeekStart = toDateString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7));

  const [reward, completions, last] = await Promise.all([
    getChildReward(store, childId),
    store.list<CompletionRow>("task_completions", { subject_id: childId }),
    findLastAction(store, childId),
  ]);

  const weekCount = completions.filter(
    (row) => row.undone_at === null && row.completed_on >= weekStart && row.completed_on < nextWeekStart
  ).length;

  const hasTiers = reward !== null && reward.thresholds.length > 0;
  const task = last ? await store.get<TaskRow>("tasks", last.task_id) : null;

  return {
    reward,
    weekCount,
    progress: hasTiers ? computeProgress(reward.thresholds, weekCount) : null,
    lastAction: last ? { completionId: last.id, taskId: last.task_id, taskTitle: task?.title ?? "une tâche" } : null,
  };
}

export async function undoLastAction(store: DataStore, childId: string): Promise<boolean> {
  const last = await findLastAction(store, childId);
  if (!last) return false;

  await store.update<CompletionRow>("task_completions", last.id, { undone_at: new Date().toISOString() });
  await setTaskCompletion(store, last.task_id, false);
  return true;
}

// « J'ai besoin d'aide » : notification urgente immédiate aux parents, sans géolocalisation.
export async function requestHelp(store: DataStore, familyId: string, childId: string): Promise<void> {
  const members = await activeMembers(store, familyId);
  const child = members.find((member) => member.id === childId);

  for (const parent of members.filter((member) => member.role === "parent")) {
    await notify(store, {
      familyId,
      recipientId: parent.id,
      category: "aide",
      title: `${child?.name ?? "Ton enfant"} a besoin d'aide`,
      isUrgent: true,
    });
  }
}
