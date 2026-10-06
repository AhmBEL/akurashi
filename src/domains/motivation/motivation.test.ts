import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { DataStore } from "@/shared/data/types";
import { getChildReward, resetThresholds, saveRewardSystem, updateThreshold } from "@/domains/child/repository";
import { createFamilyMember, loadFamilyState } from "@/domains/family/repository";
import { createFamilyFromOnboarding } from "@/domains/onboarding/createFamily";
import { listNotifications } from "@/domains/notifications/repository";
import { createTask, getTasksOfMember } from "@/domains/tasks/repository";
import { getChildProgress, requestHelp, toggleTaskCompletion, undoLastAction } from "./repository";
import { motivationMessage } from "./services/motivationMessage";
import { computeProgress } from "./services/progress";
import type { RewardThreshold } from "@/domains/child/types";

let counter = 0;
let store: DataStore;
let familyId: string;
let ids: { parent1: string; parent2: string; child: string };

beforeEach(async () => {
  store = createLocalStore(`motivation-test-${counter++}`);
  await createFamilyFromOnboarding(
    store,
    {
      parentName: "Alex",
      children: [{ name: "Lou", age: 8, reward: true, rewardType: "badge", compensation: "financiere_libre", theme: "foret" }],
    },
    null
  );
  const state = (await loadFamilyState(store))!;
  familyId = state.family.id;
  const parent2 = await createFamilyMember(store, {
    familyId,
    name: "Sam",
    role: "parent",
    age: null,
    signatureColor: "prune",
    accessStatus: null,
    linkedAccountId: null,
  });
  ids = {
    parent1: state.members.find((m) => m.role === "parent")!.id,
    parent2: parent2.id,
    child: state.members.find((m) => m.role === "enfant")!.id,
  };
});

async function childTasks(count: number): Promise<string[]> {
  for (let i = 0; i < count; i++) {
    await createTask(store, {
      familyId,
      creatorId: ids.parent1,
      title: `Tâche ${i + 1}`,
      description: null,
      dueDate: null,
      dueTime: null,
      locationText: null,
      participantIds: [ids.child],
      discuss: false,
      recurrenceDays: [],
      isUrgent: false,
      isPrivate: false,
      categoryId: null,
    });
  }
  return (await getTasksOfMember(store, familyId, ids.child, ids.parent1)).map((task) => task.id);
}

const complete = (taskId: string, actorId = ids.child) =>
  toggleTaskCompletion(store, { familyId, taskId, subjectId: ids.child, actorId, completed: true });

describe("paliers de l'enfant", () => {
  it("crée les paliers par défaut du type choisi dès l'onboarding", async () => {
    const reward = (await getChildReward(store, ids.child))!;
    expect(reward.thresholds.map((t) => [t.label, t.thresholdValue])).toEqual([
      ["Tortue", 0],
      ["Lapin", 5],
      ["Lion", 15],
      ["Licorne", 35],
    ]);
  });

  it("remplace les paliers quand le type change, et n'en crée aucun pour « aucun » / compteur", async () => {
    await saveRewardSystem(store, ids.child, { type: "note", compensationType: "aucune", visualTheme: null });
    expect((await getChildReward(store, ids.child))!.thresholds.map((t) => t.label)).toEqual(["D", "C", "B", "A"]);

    await saveRewardSystem(store, ids.child, { type: "compteur", compensationType: "aucune", visualTheme: null });
    expect((await getChildReward(store, ids.child))!.thresholds).toHaveLength(0);

    await saveRewardSystem(store, ids.child, { type: "aucun", compensationType: "aucune", visualTheme: null });
    expect((await getChildReward(store, ids.child))!.thresholds).toHaveLength(0);
  });

  it("le premier palier reste à 0 ; les autres sont modifiables ; rétablissement possible", async () => {
    const [first, second] = (await getChildReward(store, ids.child))!.thresholds;
    await updateThreshold(store, first.id, { thresholdValue: 9, label: "Départ" });
    await updateThreshold(store, second.id, { thresholdValue: 8, amount: 500 });

    const edited = (await getChildReward(store, ids.child))!.thresholds;
    expect(edited[0]).toMatchObject({ label: "Départ", thresholdValue: 0 });
    expect(edited[1]).toMatchObject({ thresholdValue: 8, amount: 500 });

    const { rewardSystemId, config } = (await getChildReward(store, ids.child))!;
    await resetThresholds(store, rewardSystemId, config.type);
    expect((await getChildReward(store, ids.child))!.thresholds[0].label).toBe("Tortue");
  });
});

describe("progression, validation et annulation", () => {
  it("l'enfant coche une tâche : le compte avance et les parents sont notifiés", async () => {
    const [taskId] = await childTasks(1);
    await complete(taskId);

    const progress = await getChildProgress(store, ids.child);
    expect(progress.weekCount).toBe(1);
    expect(progress.progress?.current?.label).toBe("Tortue");
    expect(progress.progress?.remainingToNext).toBe(4);

    for (const parentId of [ids.parent1, ids.parent2]) {
      const [notification] = await listNotifications(store, parentId);
      expect(notification).toMatchObject({ category: "tache_terminee", read: false });
      expect(notification.title).toBe("Lou a terminé « Tâche 1 »");
    }
    expect((await getTasksOfMember(store, familyId, ids.child, ids.parent1))[0].done).toBe(true);
  });

  it("5 tâches validées : l'enfant passe au palier Lapin", async () => {
    for (const taskId of await childTasks(5)) await complete(taskId);

    const { progress, weekCount } = await getChildProgress(store, ids.child);
    expect(weekCount).toBe(5);
    expect(progress?.current?.label).toBe("Lapin");
    expect(progress?.next?.label).toBe("Lion");
  });

  it("un parent qui coche pour l'enfant n'est pas notifié de sa propre action, l'autre l'est", async () => {
    const [taskId] = await childTasks(1);
    await complete(taskId, ids.parent1);

    expect(await listNotifications(store, ids.parent1)).toHaveLength(0);
    expect(await listNotifications(store, ids.parent2)).toHaveLength(1);
  });

  it("annulation : la tâche redevient à faire, le compte baisse, un seul niveau", async () => {
    const [first, second] = await childTasks(2);
    await complete(first);
    await complete(second);

    const before = await getChildProgress(store, ids.child);
    expect(before.lastAction?.taskTitle).toBe("Tâche 2");

    expect(await undoLastAction(store, ids.child)).toBe(true);
    const after = await getChildProgress(store, ids.child);
    expect(after.weekCount).toBe(1);
    expect(after.lastAction).toBeNull(); // un seul niveau d'annulation
    expect(await undoLastAction(store, ids.child)).toBe(false);

    const tasks = await getTasksOfMember(store, familyId, ids.child, ids.parent1);
    expect(tasks.find((task) => task.title === "Tâche 2")?.done).toBe(false);
    expect(tasks.find((task) => task.title === "Tâche 1")?.done).toBe(true);
  });

  it("décocher une tâche annule sa validation", async () => {
    const [taskId] = await childTasks(1);
    await complete(taskId);
    await toggleTaskCompletion(store, { familyId, taskId, subjectId: ids.child, actorId: ids.parent1, completed: false });

    expect((await getChildProgress(store, ids.child)).weekCount).toBe(0);
  });

  it("la tâche d'un parent n'enregistre aucune validation d'enfant", async () => {
    await createTask(store, {
      familyId,
      creatorId: ids.parent1,
      title: "Impôts",
      description: null,
      dueDate: null,
      dueTime: null,
      locationText: null,
      participantIds: [ids.parent1],
      discuss: false,
      recurrenceDays: [],
      isUrgent: false,
      isPrivate: false,
      categoryId: null,
    });
    const [task] = await getTasksOfMember(store, familyId, ids.parent1, ids.parent1);
    await toggleTaskCompletion(store, { familyId, taskId: task.id, subjectId: ids.parent1, actorId: ids.parent1, completed: true });

    expect(await store.list("task_completions")).toHaveLength(0);
    expect(await listNotifications(store, ids.parent2)).toHaveLength(0);
  });

  it("« J'ai besoin d'aide » : notification urgente immédiate aux parents", async () => {
    await requestHelp(store, familyId, ids.child);

    for (const parentId of [ids.parent1, ids.parent2]) {
      const [notification] = await listNotifications(store, parentId);
      expect(notification).toMatchObject({ category: "aide", isUrgent: true });
      expect(notification.title).toContain("Lou");
    }
    expect(await listNotifications(store, ids.child)).toHaveLength(0);
  });
});

describe("computeProgress / motivationMessage", () => {
  const tier = (label: string, thresholdValue: number): RewardThreshold => ({ id: label, label, thresholdValue, amount: null, sortOrder: thresholdValue });
  const badges = [tier("Tortue", 0), tier("Lapin", 5), tier("Lion", 15), tier("Licorne", 35)];

  it("palier courant, suivant, reste et pourcentage", () => {
    expect(computeProgress(badges, 0)).toMatchObject({ remainingToNext: 5, pctToNext: 0, isTop: false });
    expect(computeProgress(badges, 0).current?.label).toBe("Tortue");
    const mid = computeProgress(badges, 10);
    expect(mid.current?.label).toBe("Lapin");
    expect(mid.next?.label).toBe("Lion");
    expect(mid).toMatchObject({ remainingToNext: 5, pctToNext: 50 });
    const top = computeProgress(badges, 40);
    expect(top).toMatchObject({ isTop: true, pctToNext: 100 });
    expect(top.current?.label).toBe("Licorne");
  });

  it("phrases tutoyées selon la situation", () => {
    expect(motivationMessage("badge", computeProgress(badges, 0))).toBe("C'est parti ! Chaque tâche te rapproche du palier suivant.");
    expect(motivationMessage("badge", computeProgress(badges, 2))).toBe("Bravo, plus que 3 tâches pour le badge du dessus !");
    expect(motivationMessage("badge", computeProgress(badges, 4))).toBe("Bravo, plus que 1 tâche pour le badge du dessus !");
    expect(motivationMessage("badge", computeProgress(badges, 35))).toBe("Bravo, tu as tout fait parfaitement !");
    expect(motivationMessage("etoile", computeProgress(badges, 2))).toContain("l'étoile du dessus");
    expect(motivationMessage("compteur", computeProgress([], 3))).toBe("3 tâches faites cette semaine, continue comme ça !");
  });
});
