import { describe, expect, it } from "vitest";
import { bucketOf, deriveAssignment, describeRecurrence, isDueToday, isTaskDone, isVisibleTo } from "./taskRules";

// Mercredi 14 octobre 2026 (heure locale).
const wednesday = new Date(2026, 9, 14, 10, 0);

describe("deriveAssignment", () => {
  it("déduit l'assignation des participants", () => {
    expect(deriveAssignment("me", [], false)).toMatchObject({ status: "a_decider", participants: [] });
    expect(deriveAssignment("me", ["me"], false)).toMatchObject({
      status: "auto_assignee",
      subjectId: "me",
      participants: [{ memberId: "me", role: "auto" }],
    });
    expect(deriveAssignment("me", ["other"], false)).toMatchObject({
      status: "assignee",
      subjectId: "other",
      participants: [{ memberId: "other", role: "assigne" }],
    });
    const shared = deriveAssignment("me", ["me", "other", "other"], false);
    expect(shared.status).toBe("partagee");
    expect(shared.subjectId).toBe("me");
    expect(shared.participants).toHaveLength(2);
  });

  it("« à discuter » prime et n'assigne personne", () => {
    expect(deriveAssignment("me", ["other"], true)).toMatchObject({ status: "a_discuter", participants: [] });
  });
});

describe("isTaskDone", () => {
  it("ponctuelle : faite dès qu'elle est cochée", () => {
    expect(isTaskDone({ completedAt: null, recurrenceDays: [] }, wednesday)).toBe(false);
    expect(isTaskDone({ completedAt: new Date(2026, 9, 1).toISOString(), recurrenceDays: [] }, wednesday)).toBe(true);
  });

  it("récurrente : faite pour aujourd'hui seulement, à refaire le lendemain", () => {
    const doneToday = { completedAt: new Date(2026, 9, 14, 8, 0).toISOString(), recurrenceDays: [2] };
    expect(isTaskDone(doneToday, wednesday)).toBe(true);
    expect(isTaskDone(doneToday, new Date(2026, 9, 15, 8, 0))).toBe(false);
  });
});

describe("isDueToday", () => {
  it("ponctuelle : sans date, du jour ou en retard", () => {
    expect(isDueToday({ dueDate: null, recurrenceDays: [] }, wednesday)).toBe(true);
    expect(isDueToday({ dueDate: "2026-10-14", recurrenceDays: [] }, wednesday)).toBe(true);
    expect(isDueToday({ dueDate: "2026-10-10", recurrenceDays: [] }, wednesday)).toBe(true);
    expect(isDueToday({ dueDate: "2026-10-15", recurrenceDays: [] }, wednesday)).toBe(false);
  });

  it("récurrente : seulement les jours cochés (lundi = 0)", () => {
    expect(isDueToday({ dueDate: null, recurrenceDays: [0, 3] }, wednesday)).toBe(false);
    expect(isDueToday({ dueDate: null, recurrenceDays: [0, 2] }, wednesday)).toBe(true);
  });
});

describe("bucketOf / isVisibleTo / describeRecurrence", () => {
  it("range les tâches dans les trois blocs", () => {
    expect(bucketOf({ recurrenceDays: [], participantCount: 2 })).toBe("ponctuelles");
    expect(bucketOf({ recurrenceDays: [0], participantCount: 1 })).toBe("perso");
    expect(bucketOf({ recurrenceDays: [0], participantCount: 0 })).toBe("perso");
    expect(bucketOf({ recurrenceDays: [0], participantCount: 3 })).toBe("famille");
  });

  it("une tâche privée n'est visible que de son créateur", () => {
    expect(isVisibleTo({ isPrivate: true, creatorId: "me" }, "me")).toBe(true);
    expect(isVisibleTo({ isPrivate: true, creatorId: "me" }, "other")).toBe(false);
    expect(isVisibleTo({ isPrivate: false, creatorId: "me" }, "other")).toBe(true);
  });

  it("décrit la récurrence dans l'ordre de la semaine", () => {
    expect(describeRecurrence([3, 0])).toBe("lun. jeu.");
  });
});
