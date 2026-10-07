import { describe, expect, it } from "vitest";
import type { AgendaTask } from "@/domains/tasks/types";
import { validateTimeRange } from "@/domains/tasks/services/taskRules";
import { assignMemberColors, busyBands, datesBetween, entriesByDate, entriesOnDate, layoutDay, monthGrid, shiftAnchor, timeToMinutes, weekDates } from "./agendaRules";

const task = (over: Partial<AgendaTask> & { id: string }): AgendaTask => ({
  title: over.id,
  description: null,
  dueDate: null,
  dueTime: null,
  dueEndTime: null,
  locationText: null,
  assignmentStatus: "auto_assignee",
  isUrgent: false,
  isPrivate: false,
  sujetId: null,
  recurrenceDays: [],
  completedAt: null,
  done: false,
  creator: { id: "p1", name: "Alex", signatureColor: "sauge" },
  participants: [],
  categoryNames: [],
  busyOnly: false,
  ...over,
});

const ids = (tasks: AgendaTask[], date: string) => entriesOnDate(tasks, date, "2026-10-07").map((entry) => entry.taskId);

describe("placement des tâches sur le calendrier", () => {
  it("une tâche datée apparaît à sa date seulement ; une tâche sans date n'apparaît pas", () => {
    const tasks = [task({ id: "rdv", dueDate: "2026-10-08" }), task({ id: "sans-date" })];
    expect(ids(tasks, "2026-10-08")).toEqual(["rdv"]);
    expect(ids(tasks, "2026-10-09")).toEqual([]);
  });

  it("récurrente avec heure : chaque semaine aux jours choisis ; sans heure : jamais", () => {
    // 1 = mardi (lundi = 0)
    const tasks = [task({ id: "natation", recurrenceDays: [1], dueTime: "17:00:00" }), task({ id: "poubelles", recurrenceDays: [1] })];
    expect(ids(tasks, "2026-10-06")).toEqual(["natation"]); // mardi
    expect(ids(tasks, "2026-10-13")).toEqual(["natation"]);
    expect(ids(tasks, "2026-10-07")).toEqual([]); // mercredi
  });

  it("une récurrente avec date de début n'apparaît pas avant elle", () => {
    const tasks = [task({ id: "cours", recurrenceDays: [1], dueTime: "17:00", dueDate: "2026-10-13" })];
    expect(ids(tasks, "2026-10-06")).toEqual([]);
    expect(ids(tasks, "2026-10-13")).toEqual(["cours"]);
  });

  it("tri par heure, éléments sans heure en dernier ; une récurrente n'est « faite » qu'aujourd'hui", () => {
    const tasks = [
      task({ id: "b", dueDate: "2026-10-07" }),
      task({ id: "a", dueDate: "2026-10-07", dueTime: "09:30" }),
      task({ id: "rec", recurrenceDays: [2], dueTime: "08:00", done: true }),
    ];
    const today = entriesOnDate(tasks, "2026-10-07", "2026-10-07");
    expect(today.map((e) => e.taskId)).toEqual(["rec", "a", "b"]);
    expect(today.find((e) => e.taskId === "rec")?.done).toBe(true);
    expect(entriesOnDate(tasks, "2026-10-14", "2026-10-07").find((e) => e.taskId === "rec")?.done).toBe(false);
  });

  it("entriesByDate couvre toute la plage, bornes incluses", () => {
    const map = entriesByDate([task({ id: "x", dueDate: "2026-10-31" })], "2026-10-30", "2026-11-02", "2026-10-07");
    expect([...map.keys()]).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(map.get("2026-10-31")?.map((e) => e.taskId)).toEqual(["x"]);
  });
});

describe("temps occupé", () => {
  const entry = (id: string, start: string | null, end: string | null, ownerId: string | null = "p1") =>
    entriesOnDate([task({ id, dueDate: "2026-10-07", dueTime: start, dueEndTime: end, participants: ownerId ? [{ id: ownerId, name: ownerId, signatureColor: "sauge" }] : [] })], "2026-10-07", "2026-10-07")[0];

  it("seuls les éléments avec début et fin dessinent une bande", () => {
    expect(busyBands([entry("a", "14:00", "15:30"), entry("b", "16:00", null), entry("c", null, null)])).toEqual([
      { ownerId: "p1", startMin: 840, endMin: 930 },
    ]);
  });

  it("les bandes qui se chevauchent d'une même personne fusionnent, pas celles de personnes différentes", () => {
    const bands = busyBands([entry("a", "09:00", "10:00"), entry("b", "09:30", "11:00"), entry("c", "11:00", "12:00"), entry("d", "09:00", "10:00", "p2")]);
    expect(bands).toEqual([
      { ownerId: "p1", startMin: 540, endMin: 720 },
      { ownerId: "p2", startMin: 540, endMin: 600 },
    ]);
  });

  it("minutes depuis minuit, avec ou sans secondes", () => {
    expect(timeToMinutes("14:30")).toBe(870);
    expect(timeToMinutes("14:30:00")).toBe(870);
  });

  it("l'heure de fin exige un début et doit le suivre", () => {
    expect(validateTimeRange("14:00", null)).toBeNull();
    expect(validateTimeRange("14:00", "15:30")).toBeNull();
    expect(validateTimeRange("14:00:00", "15:30:00")).toBeNull();
    expect(validateTimeRange("14:00", "14:00")).toContain("après");
    expect(validateTimeRange("14:00", "13:00")).toContain("après");
    expect(validateTimeRange(null, "13:00")).toContain("début");
  });
});

describe("calendrier", () => {
  it("la semaine va du lundi au dimanche", () => {
    expect(weekDates(new Date(2026, 9, 7))).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(weekDates(new Date(2026, 9, 11))[0]).toBe("2026-10-05"); // dimanche
  });

  it("grille du mois en semaines complètes : 5 ou 6 semaines, passage d'année", () => {
    const october = monthGrid(2026, 9);
    expect(october).toHaveLength(5);
    expect(october[0][0]).toBe("2026-09-28");
    expect(october[4][6]).toBe("2026-11-01");
    expect(monthGrid(2026, 7)).toHaveLength(6); // août 2026 : 1er = samedi
    const december = monthGrid(2026, 11);
    expect(december[december.length - 1][6]).toBe("2027-01-03");
  });

  it("navigation : un mois, une semaine ou un jour", () => {
    const anchor = new Date(2026, 9, 31);
    expect(shiftAnchor(anchor, "mois", 1)).toEqual(new Date(2026, 10, 1));
    expect(shiftAnchor(anchor, "semaine", -1)).toEqual(new Date(2026, 9, 24));
    expect(shiftAnchor(anchor, "jour", 1)).toEqual(new Date(2026, 10, 1));
    expect(datesBetween("2026-10-07", "2026-10-07")).toEqual(["2026-10-07"]);
  });
});

describe("couleurs", () => {
  it("une couleur distincte par personne, même si les enfants héritent de celle d'un parent", () => {
    const colors = assignMemberColors([
      { id: "p1", role: "parent", signatureColor: "sauge" },
      { id: "c1", role: "enfant", signatureColor: "sauge" },
      { id: "c2", role: "enfant", signatureColor: "sauge" },
      { id: "p2", role: "parent", signatureColor: "prune" },
    ]);
    expect(colors.p1).toBe("sauge");
    expect(colors.p2).toBe("prune");
    expect(new Set(Object.values(colors)).size).toBe(4);
  });
});

describe("disposition d'une journée", () => {
  const day = (...specs: Array<[string, string, string | null]>) =>
    entriesOnDate(specs.map(([id, start, end]) => task({ id, dueDate: "2026-10-07", dueTime: start, dueEndTime: end })), "2026-10-07", "2026-10-07");

  it("des éléments successifs restent seuls sur leur colonne", () => {
    const placed = layoutDay(day(["a", "09:00", "10:00"], ["b", "10:00", "11:00"]));
    expect(placed.map((p) => [p.column, p.columns])).toEqual([[0, 1], [0, 1]]);
  });

  it("des éléments qui se chevauchent se placent côte à côte", () => {
    const placed = layoutDay(day(["a", "09:00", "11:00"], ["b", "10:00", "10:30"], ["c", "10:15", "12:00"], ["d", "13:00", null]));
    const byId = Object.fromEntries(placed.map((p) => [p.entry.taskId, p]));
    expect([byId.a.column, byId.b.column, byId.c.column]).toEqual([0, 1, 2]);
    expect(byId.a.columns).toBe(3);
    expect([byId.d.column, byId.d.columns, byId.d.endMin - byId.d.startMin]).toEqual([0, 1, 60]);
  });

  it("les éléments sans heure ne sont pas placés sur la frise", () => {
    expect(layoutDay(day(["a", "09:00", "10:00"]).concat(entriesOnDate([task({ id: "z", dueDate: "2026-10-07" })], "2026-10-07", "2026-10-07")))).toHaveLength(1);
  });
});
