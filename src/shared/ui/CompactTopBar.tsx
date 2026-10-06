import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar } from "./Avatar";
import styles from "./CompactTopBar.module.css";

interface CompactTopBarProps {
  label: string;
  memberName: string;
  signatureColor: string;
  unreadCount?: number;
}

// Deliberately compact: MASTER_Design_App_Famille_Belhadj.md §2 asks to avoid
// a giant serif salutation (the trait that made the prototype read too close
// to a Mental Loadless-style weather header).
export function CompactTopBar({ label, memberName, signatureColor, unreadCount = 0 }: CompactTopBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.label}>{label}</div>
      <div className={styles.actions}>
        <Link
          href="/notifications"
          className={styles.bell}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
        >
          <Bell size={22} strokeWidth={2.5} />
          {unreadCount > 0 && <span className={styles.dot} />}
        </Link>
        <Link href="/reglages" className={styles.avatarLink} aria-label="Réglages">
          <Avatar name={memberName} color={signatureColor} size={40} />
        </Link>
      </div>
    </div>
  );
}
