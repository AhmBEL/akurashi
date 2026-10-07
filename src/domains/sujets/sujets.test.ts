import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "@/shared/data/localStore";
import type { DataStore } from "@/shared/data/types";
import { addExpense } from "@/domains/budget/repository";
import { createFamilyMember, loadFamilyState } from "@/domains/family/repository";
import { createFamilyFromOnboarding } from "@/domains/onboarding/createFamily";
import { listNotifications } from "@/domains/notifications/repository";
import { createTask } from "@/domains/tasks/repository";
import {
  addComment,
  addLink,
  archiveExpiredSujets,
  closeSujet,
  createSujet,
  getSujetDetail,
  getSujets,
  removeLink,
  reopenSujet,
  setSujetParticipants,
  updateSujet,
  type CreateSujetInput,
} from "./repository";
import { SUJET_TEMPLATES } from "./defaults";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

let counter = 0;
let store: DataStore;
let familyId: string;
let ids: { alex: string; sam: string; lou: string; mia: string };

beforeEach(async () => {
  store = createLocalStore(`sujets-test-${counter++}`);
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
  const sam = await createFamilyMember(store, {
    familyId,
    name: "Sam",
    role: "parent",
    age: null,
    signatureColor: "prune",
    accessStatus: null,
    linkedAccountId: null,
  });
  ids = {
    alex: state.members.find((m) => m.name === "Alex")!.id,
    sam: sam.id,
    lou: state.members.find((m) => m.name === "Lou")!.id,
    mia: state.members.find((m) => m.name === "Mia")!.id,
  };
});

const input = (over: Partial<CreateSujetInput> = {}): CreateSujetInput => ({
  familyId,
  creatorId: ids.alex,
  title: "Anniversaire de Lou",
  description: null,
  template: "anniversaire",
  visibility: "famille",
  participantIds: [ids.sam, ids.lou],
  closureMode: "manuel",
  eventDate: null,
  suggestedTasks: [],
  ...over,
});

const detail = (sujetId: string, viewerId = ids.alex, today = day(2026, 10, 7)) => getSujetDetail(store, familyId, sujetId, viewerId, today);
const list = (viewerId: string, today = day(2026, 10, 7)) => getSujets(store, familyId, viewerId, today);

describe("création depuis un modèle", () => {
  it("crée le Sujet, ses participants (créateur inclus) et ses tâches suggérées, et notifie les ajoutés", async () => {
    const tasks = SUJET_TEMPLATES.find((t) => t.key === "anniversaire")!.tasks.slice(0, 3);
    const id = await createSujet(store, input({ suggestedTasks: [...tasks, "  ", "Tâche perso"] }));

    const view = (await detail(id))!;
    expect(view).toMatchObject({ title: "Anniversaire de Lou", visibility: "famille", status: "ouvert", canEdit: true, taskCount: 4 });
    expect(view.participants.map((p) => p.name).sort()).toEqual(["Alex", "Lou", "Sam"]);
    expect(view.tasks.map((t) => t.title).sort()).toEqual([...tasks, "Tâche perso"].sort());
    expect(view.tasks.every((t) => t.sujetId === id && t.assignmentStatus === "a_decider")).toBe(true);

    expect((await listNotifications(store, ids.sam))[0]).toMatchObject({ category: "sujet_invite", title: "Alex t'a ajouté au Sujet « Anniversaire de Lou »" });
    expect(await listNotifications(store, ids.alex)).toHaveLength(0);
  });

  it("refuse un titre vide, une clôture auto sans date, et un enfant comme créateur", async () => {
    await expect(createSujet(store, input({ title: "  " }))).rejects.toThrow("titre");
    await expect(createSujet(store, input({ closureMode: "auto_after_date", eventDate: null }))).rejects.toThrow("date");
    await expect(createSujet(store, input({ creatorId: ids.lou }))).rejects.toThrow("parent");
  });
});

describe("visibilité", () => {
  it("privé : le créateur seul ; entre parents : pas l'enfant ; famille : les participants", async () => {
    const prive = await createSujet(store, input({ title: "Cadeau surprise", visibility: "prive", participantIds: [ids.sam], suggestedTasks: ["Acheter"] }));
    const parents = await createSujet(store, input({ title: "Impôts", visibility: "parents", participantIds: [ids.sam, ids.lou] }));
    const famille = await createSujet(store, input({ title: "Vacances", participantIds: [ids.lou] }));

    expect((await list(ids.alex)).map((s) => s.title).sort()).toEqual(["Cadeau surprise", "Impôts", "Vacances"]);
    expect((await list(ids.sam)).map((s) => s.title)).toEqual(["Impôts"]);
    expect((await list(ids.lou)).map((s) => s.title)).toEqual(["Vacances"]);
    expect(await list(ids.mia)).toEqual([]);

    expect(await detail(prive, ids.sam)).toBeNull();
    expect(await detail(parents, ids.lou)).toBeNull();
    expect((await detail(famille, ids.lou))?.canEdit).toBe(false);
    // Les tâches d'un Sujet privé sont privées.
    expect((await detail(prive))!.tasks[0].isPrivate).toBe(true);
    expect((await detail(parents))!.participants.map((p) => p.name).sort()).toEqual(["Alex", "Sam"]);
  });

  it("changer la visibilité retire les participants qui n'ont plus le droit de voir", async () => {
    const id = await createSujet(store, input());
    await updateSujet(store, id, { visibility: "parents" });
    expect((await detail(id))!.participants.map((p) => p.name).sort()).toEqual(["Alex", "Sam"]);
    expect(await detail(id, ids.lou)).toBeNull();
  });

  it("participants modifiables, notification à l'ajouté", async () => {
    const id = await createSujet(store, input({ participantIds: [] }));
    await setSujetParticipants(store, id, [ids.sam, ids.mia, ids.lou], ids.alex);
    expect((await detail(id))!.participants).toHaveLength(4);
    await setSujetParticipants(store, id, [ids.sam], ids.alex);
    expect((await detail(id))!.participants.map((p) => p.name).sort()).toEqual(["Alex", "Sam"]);
    expect(await listNotifications(store, ids.mia)).toHaveLength(1);
  });
});

describe("clôture", () => {
  it("manuelle : archive, notifie, puis rouvre", async () => {
    const id = await createSujet(store, input());
    await closeSujet(store, id, ids.alex);
    expect((await detail(id))!.status).toBe("archive");
    expect((await listNotifications(store, ids.sam)).map((n) => n.category)).toContain("sujet_statut");

    await reopenSujet(store, id, ids.alex);
    expect((await detail(id))!.status).toBe("ouvert");
  });

  it("automatique : archivé le lendemain de la date, écrit une seule fois ; rouvrir demande une nouvelle date", async () => {
    const id = await createSujet(store, input({ closureMode: "auto_after_date", eventDate: "2026-10-10" }));
    expect((await detail(id, ids.alex, day(2026, 10, 10)))!.status).toBe("ouvert");
    expect((await detail(id, ids.alex, day(2026, 10, 11)))!.status).toBe("archive");

    expect(await archiveExpiredSujets(store, familyId, day(2026, 10, 10))).toBe(0);
    expect(await archiveExpiredSujets(store, familyId, day(2026, 10, 11))).toBe(1);
    expect(await archiveExpiredSujets(store, familyId, day(2026, 10, 12))).toBe(0);

    await expect(reopenSujet(store, id, ids.alex, undefined, day(2026, 10, 12))).rejects.toThrow("nouvelle date");
    await reopenSujet(store, id, ids.alex, "2026-10-30", day(2026, 10, 12));
    expect((await detail(id, ids.alex, day(2026, 10, 12)))!).toMatchObject({ status: "ouvert", eventDate: "2026-10-30" });
  });

  it("passer en automatique exige une date", async () => {
    const id = await createSujet(store, input());
    await expect(updateSujet(store, id, { closureMode: "auto_after_date" })).rejects.toThrow("date");
    await updateSujet(store, id, { closureMode: "auto_after_date", eventDate: "2026-12-01" });
    expect((await detail(id))!.closureMode).toBe("auto_after_date");
  });
});

describe("échanges, liens, tâches et budget", () => {
  it("un commentaire est partagé et notifie les autres participants", async () => {
    const id = await createSujet(store, input());
    await addComment(store, id, ids.sam, "  On invite les cousins ?  ");
    await addComment(store, id, ids.lou, "Oui !");
    await expect(addComment(store, id, ids.sam, "   ")).rejects.toThrow("message");

    const view = (await detail(id, ids.lou))!;
    expect(view.comments.map((c) => `${c.author?.name}: ${c.content}`)).toEqual(["Sam: On invite les cousins ?", "Lou: Oui !"]);
    const alexNotifications = await listNotifications(store, ids.alex);
    expect(alexNotifications.filter((n) => n.category === "sujet_commentaire")).toHaveLength(2);
    expect(alexNotifications[0].title).toContain("a écrit dans « Anniversaire de Lou »");
    expect((await listNotifications(store, ids.lou)).filter((n) => n.category === "sujet_commentaire")).toHaveLength(1);
  });

  it("liens http(s) uniquement, suppression possible", async () => {
    const id = await createSujet(store, input());
    await expect(addLink(store, id, ids.alex, "Piège", "javascript:alert(1)")).rejects.toThrow("http");
    await addLink(store, id, ids.alex, "Salle", "https://exemple.fr/salle");
    await addLink(store, id, ids.alex, "", "https://exemple.fr/gateau");
    const links = (await detail(id))!.links;
    expect(links.map((l) => l.label)).toEqual(["Salle", "https://exemple.fr/gateau"]);
    await removeLink(store, links[0].id);
    expect((await detail(id))!.links).toHaveLength(1);
  });

  it("les tâches ajoutées au Sujet comptent dans l'avancement ; le budget lié est réservé aux parents", async () => {
    const id = await createSujet(store, input({ suggestedTasks: ["Gâteau"] }));
    const taskId = await createTask(store, {
      familyId,
      creatorId: ids.alex,
      title: "Cadeau",
      description: null,
      dueDate: null,
      dueTime: null,
      locationText: null,
      participantIds: [ids.sam],
      discuss: false,
      recurrenceDays: [],
      isUrgent: false,
      isPrivate: false,
      categoryId: null,
      sujetId: id,
    });
    const [card] = await list(ids.alex);
    expect(card).toMatchObject({ taskCount: 2, doneCount: 0 });

    await addExpense(store, { familyId, actorId: ids.alex, categoryId: null, newCategoryName: "Fêtes", amountMinorUnits: 4000, responsibleId: ids.alex, spentOn: "2026-10-07", note: "Cadeau", taskId, requestValidation: true });
    expect((await detail(id))!.budget).toEqual({ validated: 0, pending: 4000 });
    expect((await detail(id, ids.lou))!.budget).toBeNull();
    expect((await detail(id, ids.lou))!.tasks.some((t) => t.title === "Cadeau")).toBe(true);
  });
});
