import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";

// Le seul endroit autorisé à lire/écrire `notifications` (centre de notifications in-app).

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string | null;
  isUrgent: boolean;
  sentAt: string;
  read: boolean;
}

export interface NotifyInput {
  familyId: string;
  recipientId: string;
  category: string;
  title: string;
  body?: string | null;
  isUrgent?: boolean;
}

export async function notify(store: DataStore, input: NotifyInput): Promise<void> {
  await store.create<NotificationRow>("notifications", {
    family_id: input.familyId,
    recipient_id: input.recipientId,
    category: input.category,
    title: input.title,
    body: input.body ?? null,
    is_urgent: input.isUrgent ?? false,
    sent_at: new Date().toISOString(),
    read_at: null,
  } satisfies NewRow<NotificationRow>);
}

// Les plus récentes d'abord.
export async function listNotifications(store: DataStore, recipientId: string): Promise<NotificationItem[]> {
  const rows = await store.list<NotificationRow>("notifications", { recipient_id: recipientId });
  return rows
    .map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      isUrgent: row.is_urgent,
      sentAt: row.sent_at,
      read: row.read_at !== null,
    }))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export async function markNotificationRead(store: DataStore, id: string): Promise<void> {
  await store.update<NotificationRow>("notifications", id, { read_at: new Date().toISOString() });
}

export async function markAllNotificationsRead(store: DataStore, recipientId: string): Promise<void> {
  const unread = (await store.list<NotificationRow>("notifications", { recipient_id: recipientId })).filter(
    (row) => row.read_at === null
  );
  const now = new Date().toISOString();
  for (const row of unread) {
    await store.update<NotificationRow>("notifications", row.id, { read_at: now });
  }
}
