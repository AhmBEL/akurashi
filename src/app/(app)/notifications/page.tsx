"use client";

import { getStore } from "@/shared/data/getStore";
import { useAppData } from "@/shared/session/AppDataContext";
import { PillButton } from "@/shared/ui/PillButton";
import { useNotifications } from "@/domains/notifications/hooks";
import { markAllNotificationsRead, markNotificationRead } from "@/domains/notifications/repository";

const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Centre de notifications in-app : non lues en évidence, badge « Urgent ».
export default function NotificationsPage() {
  const { member } = useAppData();
  const items = useNotifications(member.id) ?? [];
  const hasUnread = items.some((item) => !item.read);

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 14 }}>Notifications</div>

      {hasUnread && (
        <PillButton variant="ghost" onClick={() => void markAllNotificationsRead(getStore(), member.id)} style={{ marginBottom: 14 }}>
          Tout marquer comme lu
        </PillButton>
      )}

      {items.length === 0 && <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Rien de nouveau.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.read && void markNotificationRead(getStore(), item.id)}
            style={{
              textAlign: "left",
              font: "inherit",
              color: "var(--fa-text)",
              background: "var(--fa-surface)",
              border: item.read ? "1px solid transparent" : "2px solid var(--fa-accent)",
              borderRadius: "24px 12px 22px 14px",
              padding: "13px 15px",
              cursor: "pointer",
              opacity: item.read ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {item.isUrgent && (
                <span style={{ background: "var(--fa-alert)", color: "#fff", borderRadius: 999, padding: "2px 9px", fontSize: 11.5 }}>
                  Urgent
                </span>
              )}
              <span style={{ fontSize: 14.5 }}>{item.title}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fa-muted)", marginTop: 4 }}>
              {TIME_FORMAT.format(new Date(item.sentAt))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
