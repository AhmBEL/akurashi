import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { DataStore } from "@/shared/data/types";
import { createFamilyMember, loadFamilyState } from "@/domains/family/repository";
import { createFamilyFromOnboarding } from "@/domains/onboarding/createFamily";
import { listNotifications } from "@/domains/notifications/repository";
import { createTask, getTasksOfMember, setTaskCompletion, type CreateTaskInput } from "./repository";

let counter = 0;
let store: DataStore;
let familyId: string;
let ids: { parent1: string; parent2: string; child: string };

beforeEach(async () => {
  store = createLocalStore(`tasks-test-${counter++}`);
  await createFamilyFromOnboarding(store, { parentName: "Alex", children: [{ name: "Lou", age: 8 }] }, null);
  const state = await loadFamilyState(store);
  familyId = state!.family.id;
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
    parent1: state!.members.find((m) => m.role === "parent")!.id,
    parent2: parent2.id,
    child: state!.members.find((m) => m.role === "enfant")!.id,
  };
});

const task = (overrides: Partial<CreateTaskInput>): CreateTaskInput => ({
  familyId,
  creatorId: ids.parent1,
  title: "Tâche",
  description: null,
  dueDate: null,
  dueTime: null,
  locationText: null,
  participantIds: [],
  discuss: false,
  recurrenceDays: [],
  isUrgent: false,
  isPrivate: false,
  categoryId: null,
  ...overrides,
});

const titlesOf = async (memberId: string, viewerId = memberId) =>
  (await getTasksOfMember(store, familyId, memberId, viewerId)).map((t) => t.title);

describe("createTask — assignation et notifications", () => {
  it("auto-assignée : chez le créateur, aucune notification", async () => {
    await createTask(store, task({ title: "Poubelles", participantIds: [ids.parent1] }));

    expect(await titlesOf(ids.parent1)).toEqual(["Poubelles"]);
    expect(await titlesOf(ids.parent2)).toEqual([]);
    expect(await listNotifications(store, ids.parent1)).toHaveLength(0);
  });

  it("assignée à l'autre parent : apparaît chez lui avec une notification urgente", async () => {
    await createTask(store, task({ title: "Dentiste de Lou", participantIds: [ids.parent2], isUrgent: true }));

    expect(await titlesOf(ids.parent2)).toEqual(["Dentiste de Lou"]);
    expect(await titlesOf(ids.parent1)).toEqual([]);

    const [notification] = await listNotifications(store, ids.parent2);
    expect(notification).toMatchObject({ category: "tache_assignee", isUrgent: true, read: false });
    expect(notification.title).toContain("Alex");
    expect(notification.title).toContain("Dentiste de Lou");
    expect(await listNotifications(store, ids.parent1)).toHaveLength(0);

    const [view] = await getTasksOfMember(store, familyId, ids.parent2, ids.parent2);
    expect(view).toMatchObject({ assignmentStatus: "assignee", isUrgent: true });
    expect(view.creator?.name).toBe("Alex");
  });

  it("assignée à l'enfant : visible dans son profil, l'enfant est notifié", async () => {
    await createTask(store, task({ title: "Ranger sa chambre", participantIds: [ids.child] }));

    expect(await titlesOf(ids.child)).toEqual(["Ranger sa chambre"]);
    expect(await listNotifications(store, ids.child)).toHaveLength(1);
  });

  it("partagée : chez chaque participant, notification pour les autres seulement", async () => {
    await createTask(store, task({ title: "Courses", participantIds: [ids.parent1, ids.parent2] }));

    expect(await titlesOf(ids.parent1)).toEqual(["Courses"]);
    expect(await titlesOf(ids.parent2)).toEqual(["Courses"]);
    expect(await listNotifications(store, ids.parent1)).toHaveLength(0);
    expect(await listNotifications(store, ids.parent2)).toHaveLength(1);
    expect((await getTasksOfMember(store, familyId, ids.parent1, ids.parent1))[0].assignmentStatus).toBe("partagee");
  });

  it("« à discuter » : visible des deux parents, notifie l'autre parent mais pas l'enfant", async () => {
    await createTask(store, task({ title: "Vacances", discuss: true, participantIds: [ids.parent2] }));

    expect(await titlesOf(ids.parent1)).toEqual(["Vacances"]);
    expect(await titlesOf(ids.parent2)).toEqual(["Vacances"]);
    expect(await titlesOf(ids.child)).toEqual([]);
    expect((await listNotifications(store, ids.parent2))[0].category).toBe("tache_a_discuter");
    expect(await listNotifications(store, ids.child)).toHaveLength(0);
  });

  it("privée : invisible de l'autre parent, jamais assignée à un autre", async () => {
    await createTask(store, task({ title: "Cadeau surprise", isPrivate: true, participantIds: [ids.parent2] }));

    expect(await titlesOf(ids.parent1)).toEqual(["Cadeau surprise"]);
    expect(await titlesOf(ids.parent2)).toEqual([]);
    expect(await titlesOf(ids.parent1, ids.parent2)).toEqual([]);
    expect(await listNotifications(store, ids.parent2)).toHaveLength(0);
  });
});

describe("createTask — catégories, récurrence, complétion", () => {
  it("rattache la catégorie choisie", async () => {
    const categories = await store.list<{ id: string; name: string; created_at?: string; updated_at?: string }>("task_categories");
    const health = categories.find((category) => category.name === "Santé")!;
    await createTask(store, task({ title: "Dentiste", participantIds: [ids.parent1], categoryId: health.id }));

    expect((await getTasksOfMember(store, familyId, ids.parent1, ids.parent1))[0].categoryNames).toEqual(["Santé"]);
  });

  it("tâche récurrente cochée : faite aujourd'hui, à refaire demain", async () => {
    await createTask(store, task({ title: "Sport", participantIds: [ids.parent1], recurrenceDays: [0, 3] }));
    const [created] = await getTasksOfMember(store, familyId, ids.parent1, ids.parent1);
    expect(created.recurrenceDays).toEqual([0, 3]);
    expect(created.done).toBe(false);

    await setTaskCompletion(store, created.id, true);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0);
    expect((await getTasksOfMember(store, familyId, ids.parent1, ids.parent1, today))[0].done).toBe(true);
    expect((await getTasksOfMember(store, familyId, ids.parent1, ids.parent1, tomorrow))[0].done).toBe(false);
  });
});
