import { describe, expect, it } from "vitest";
import { allowedParticipantIds, canSee, effectiveStatus, isValidLink, normalizeParticipants, progress, validateClosure } from "./sujetRules";

const members = [
  { id: "p1", role: "parent" as const },
  { id: "p2", role: "parent" as const },
  { id: "c1", role: "enfant" as const },
];

describe("visibilité", () => {
  it("on voit un Sujet si on l'a créé ou si on en est participant", () => {
    expect(canSee({ createdBy: "p1" }, [], "p1")).toBe(true);
    expect(canSee({ createdBy: "p1" }, ["p1", "c1"], "c1")).toBe(true);
    expect(canSee({ createdBy: "p1" }, ["p1"], "p2")).toBe(false);
  });

  it("la visibilité borne les participants possibles", () => {
    expect(allowedParticipantIds("prive", "p1", members)).toEqual(["p1"]);
    expect(allowedParticipantIds("parents", "p1", members)).toEqual(["p1", "p2"]);
    expect(allowedParticipantIds("famille", "p1", members)).toEqual(["p1", "p2", "c1"]);
  });

  it("participants retenus : dans le périmètre, sans doublon, créateur toujours inclus", () => {
    expect(normalizeParticipants("famille", "p1", members, ["c1", "c1"])).toEqual(["p1", "c1"]);
    expect(normalizeParticipants("parents", "p1", members, ["p2", "c1"])).toEqual(["p1", "p2"]);
    expect(normalizeParticipants("prive", "p1", members, ["p2", "c1"])).toEqual(["p1"]);
    expect(normalizeParticipants("famille", "p1", members, [])).toEqual(["p1"]);
  });
});

describe("clôture", () => {
  const auto = { status: "ouvert" as const, closureMode: "auto_after_date" as const, eventDate: "2026-10-10" };

  it("auto : ouvert jusqu'au jour de la date compris, archivé dès le lendemain", () => {
    expect(effectiveStatus(auto, "2026-10-09")).toBe("ouvert");
    expect(effectiveStatus(auto, "2026-10-10")).toBe("ouvert");
    expect(effectiveStatus(auto, "2026-10-11")).toBe("archive");
  });

  it("manuel : jamais archivé tout seul ; archivé reste archivé", () => {
    expect(effectiveStatus({ ...auto, closureMode: "manuel" }, "2030-01-01")).toBe("ouvert");
    expect(effectiveStatus({ status: "archive", closureMode: "manuel", eventDate: null }, "2026-01-01")).toBe("archive");
    expect(effectiveStatus({ ...auto, eventDate: null }, "2030-01-01")).toBe("ouvert");
  });

  it("la clôture automatique exige une date", () => {
    expect(validateClosure("auto_after_date", null)).toContain("date");
    expect(validateClosure("auto_after_date", "2026-10-10")).toBeNull();
    expect(validateClosure("manuel", null)).toBeNull();
  });
});

describe("liens et avancement", () => {
  it("seuls http(s) sont acceptés", () => {
    expect(isValidLink("https://exemple.fr/page")).toBe(true);
    expect(isValidLink(" http://exemple.fr ")).toBe(true);
    expect(isValidLink("javascript:alert(1)")).toBe(false);
    expect(isValidLink("exemple.fr")).toBe(false);
    expect(isValidLink("")).toBe(false);
  });

  it("avancement des tâches", () => {
    expect(progress([])).toEqual({ done: 0, total: 0, pct: 0 });
    expect(progress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3, pct: 67 });
  });
});
