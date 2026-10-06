import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { createLocalStore } from "./localStore";
import type { BaseRow } from "./types";

interface TestRow extends BaseRow {
  family_id: string;
  title: string;
  done: boolean | null;
}

let counter = 0;
const freshStore = () => createLocalStore(`test-db-${counter++}`);
const newRow = (family_id: string, title: string) => ({ family_id, title, done: null });

describe("LocalStore", () => {
  it("crée une ligne avec id et horodatages, puis la relit", async () => {
    const store = freshStore();
    const created = await store.create<TestRow>("tasks", newRow("f1", "Poubelles"));

    expect(created.id).toBeTruthy();
    expect(created.created_at).toBeTruthy();
    expect(await store.get<TestRow>("tasks", created.id)).toEqual(created);
    expect(await store.get<TestRow>("tasks", "inconnu")).toBeNull();
  });

  it("filtre par égalité et isole les tables", async () => {
    const store = freshStore();
    await store.create<TestRow>("tasks", newRow("f1", "A"));
    await store.create<TestRow>("tasks", newRow("f2", "B"));
    await store.create<TestRow>("other", newRow("f1", "C"));

    const f1 = await store.list<TestRow>("tasks", { family_id: "f1" });
    expect(f1.map((row) => row.title)).toEqual(["A"]);
    expect(await store.list<TestRow>("tasks")).toHaveLength(2);
    expect(await store.list<TestRow>("tasks", { done: null })).toHaveLength(2);
  });

  it("met à jour et supprime", async () => {
    const store = freshStore();
    const row = await store.create<TestRow>("tasks", newRow("f1", "A"));

    const updated = await store.update<TestRow>("tasks", row.id, { done: true });
    expect(updated.done).toBe(true);
    expect(updated.title).toBe("A");
    await expect(store.update<TestRow>("tasks", "inconnu", { done: true })).rejects.toThrow();

    await store.remove("tasks", row.id);
    expect(await store.list<TestRow>("tasks")).toEqual([]);
  });

  it("notifie les abonnés de la table concernée uniquement", async () => {
    const store = freshStore();
    const onTasks = vi.fn();
    const onOther = vi.fn();
    const unsubscribe = store.subscribe("tasks", onTasks);
    store.subscribe("other", onOther);

    await store.create<TestRow>("tasks", newRow("f1", "A"));
    expect(onTasks).toHaveBeenCalledTimes(1);
    expect(onOther).not.toHaveBeenCalled();

    unsubscribe();
    await store.create<TestRow>("tasks", newRow("f1", "B"));
    expect(onTasks).toHaveBeenCalledTimes(1);
  });

  it("exporte, efface puis réimporte à l'identique", async () => {
    const store = freshStore();
    await store.create<TestRow>("tasks", newRow("f1", "A"));
    await store.create<TestRow>("other", newRow("f1", "B"));
    const before = await store.list<TestRow>("tasks");
    const blob = await store.exportAll();

    await store.clearAll();
    expect(await store.list<TestRow>("tasks")).toEqual([]);

    await store.importAll(blob);
    expect(await store.list<TestRow>("tasks")).toEqual(before);
    expect(await store.list<TestRow>("other")).toHaveLength(1);
  });

  it("refuse un fichier d'import invalide", async () => {
    const store = freshStore();
    await expect(store.importAll({ version: 2 } as never)).rejects.toThrow("invalide");
  });
});
