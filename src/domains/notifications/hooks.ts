"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { listNotifications, type NotificationItem } from "./repository";

export function useNotifications(memberId: string): NotificationItem[] | undefined {
  return useStoreQuery(`notifications:${memberId}`, (store) => listNotifications(store, memberId), ["notifications"]);
}

export function useUnreadCount(memberId: string): number {
  return useNotifications(memberId)?.filter((item) => !item.read).length ?? 0;
}
