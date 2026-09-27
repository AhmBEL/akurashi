import Link from "next/link";
import { Lock, MessageSquareText, CalendarDays, Users } from "lucide-react";
import styles from "./QuickAccessRow.module.css";

const ITEMS = [
  { href: "/documents", label: "Documents", icon: Lock },
  { href: "/sujets", label: "Sujets", icon: MessageSquareText },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/enfants", label: "Enfant(s)", icon: Users },
] as const;

export function QuickAccessRow() {
  return (
    <div className={styles.row}>
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={styles.item}>
          <Icon size={17} strokeWidth={2.5} />
          {label}
        </Link>
      ))}
    </div>
  );
}
