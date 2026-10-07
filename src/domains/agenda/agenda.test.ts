import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { DataStore } from "@/shared/data/types";
import { createFamilyMember, loadFamilyState, updateMember } from "@/domains/family/repository";
import { createFamilyFromOnboarding } from "@/domains/onboarding/createFamily";
import { createSujet } from "@/domains/sujets/repository";
import { createTask, getAgendaTasks, setTaskCompletion, type CreateTaskInput } from "@/domains/tasks/repository";
import { entriesOnDate } from "./services/agendaRules";

const TODAY = new Date(2026, 9, 7);

let counter = 0;
let store: DataStore;
let familyId: string;
let ids: { alex: string; sam: string; lou: string; mia: string };

beforeEach(async () => {
  store = createLocalStore(`agenda-test-${counter++}`);
  await createFamilyFromOnboarding(
    store,
    {
      parentName: "Alex",
      children: [
        { name: "Lou", age: 12, autonomous: true },
        { name: "Mia", age: 6 },
      ],
    },
    null
  );
  const state = (await loadFamilyState(store))!;
  familyId = state.family.id;
  const sam = await createFamilyMember(store, { familyId, name: "Sam", role: "parent", age: null, signatureColor: "prune", accessStatus: null, linkedAccountId: null });
  ids = {
    alex: state.members.find((m) => m.name === "Alex")!.id,
    sam: sam.id,
    lou: state.members.find((m) => m.name === "Lou")!.id,
    mia: state.members.find((m) => m.name === "Mia")!.id,
  };
  await updateMember(store, ids.lou, { rdvPriveAutorise: true });
});

const task = (over: Partial<CreateTaskInput>): Promise<string> =>
  createTask(store, {
    familyId,
    creatorId: ids.alex,
    title: "Tâche",
    description: null,
    dueDate: "2026-10-08",
    dueTime: null,
    locationText: null,
    participantIds: [ids.alex],
    discuss: false,
    recurrenceDays: [],
    isUrgent: false,
    isPrivate: false,
    categoryId: null,
    ...over,
  });

const agenda = (viewerId: string) => getAgendaTasks(store, familyId, viewerId, TODAY);
const titles = async (viewerId: string) => (await agenda(viewerId)).map((t) => t.title).sort();

describe("une tâche datée apparaît seule dans l'agenda", () => {
  it("datée : oui ; sans date : non ; récurrente : seulement avec une heure", async () => {
    await task({ title: "Dentiste", dueDate: "2026-10-08", dueTime: "14:00", dueEndTime: "15:30" });
    await task({ title: "Sans date", dueDate: null });
    await task({ title: "Natation", dueDate: null, dueTime: "17:00", recurrenceDays: [1] });
    await task({ title: "Poubelles", dueDate: null, recurrenceDays: [1] });

    expect(await titles(ids.alex)).toEqual(["Dentiste", "Natation"]);
    const entries = (await agenda(ids.alex)).flatMap((t) => entriesOnDate([t], "2026-10-08", "2026-10-07"));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ startTime: "14:00", endTime: "15:30", date: "2026-10-08" });
  });

  it("cocher une tâche la marque faite dans l'agenda", async () => {
    const id = await task({ title: "Banque" });
    await setTaskCompletion(store, id, true);
    const [view] = await agenda(ids.alex);
    expect(entriesOnDate([view], "2026-10-08", "2026-10-07")[0].done).toBe(true);
  });

  it("une tâche d'un Sujet est incluse", async () => {
    const sujetId = await createSujet(store, {
      familyId, creatorId: ids.alex, title: "Anniversaire", description: null, template: null, visibility: "famille",
      participantIds: [], closureMode: "manuel", eventDate: null, suggestedTasks: [],
    });
    await task({ title: "Réserver la salle", sujetId, dueDate: "2026-10-20" });
    expect(await titles(ids.alex)).toEqual(["Réserver la salle"]);
  });
});

describe("qui voit quoi", () => {
  it("la tâche privée d'un parent est invisible de l'autre ; celle de la famille est visible", async () => {
    await task({ title: "Cadeau surprise", isPrivate: true });
    await task({ title: "Réunion école", participantIds: [ids.alex, ids.sam] });
    expect(await titles(ids.alex)).toEqual(["Cadeau surprise", "Réunion école"]);
    expect(await titles(ids.sam)).toEqual(["Réunion école"]);
  });

  it("le créneau privé d'un enfant apparaît aux parents comme « Occupé », sans détail", async () => {
    await task({
      creatorId: ids.lou, participantIds: [ids.lou], isPrivate: true,
      title: "Rendez-vous secret", description: "Pas pour les parents", locationText: "Parc", dueTime: "16:00", dueEndTime: "17:00",
    });
    const [forParent] = await agenda(ids.sam);
    expect(forParent).toMatchObject({ title: "Occupé", description: null, locationText: null, busyOnly: true, dueTime: "16:00" });
    expect(forParent.participants.map((p) => p.name)).toEqual(["Lou"]);
    expect(JSON.stringify(forParent)).not.toContain("secret");
    expect(JSON.stringify(forParent)).not.toContain("Parc");

    const [forChild] = await agenda(ids.lou);
    expect(forChild).toMatchObject({ title: "Rendez-vous secret", busyOnly: false });
  });

  it("un enfant autonome ne voit que ses éléments ; un enfant accompagné n'a pas d'agenda", async () => {
    await task({ title: "Impôts", participantIds: [ids.alex] });
    await task({ title: "Piscine", participantIds: [ids.lou, ids.alex] });
    expect(await titles(ids.lou)).toEqual(["Piscine"]);
    expect(await agenda(ids.mia)).toEqual([]);
  });
});

describe("heure de fin", () => {
  it("refusée sans début ou avant le début", async () => {
    await expect(task({ dueTime: "14:00", dueEndTime: "13:00" })).rejects.toThrow("après");
    await expect(task({ dueTime: null, dueEndTime: "13:00" })).rejects.toThrow("début");
    await expect(task({ dueTime: "14:00", dueEndTime: "15:00" })).resolves.toBeTruthy();
  });
});
