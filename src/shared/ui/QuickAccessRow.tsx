"use client";

import Link from "next/link";
import { Lock, MessageSquareText, CalendarDays, Users, type LucideIcon } from "lucide-react";
import { useAppData } from "@/shared/session/AppDataContext";
import { isModuleActive, type ModuleKey } from "@/domains/family/settings";
import styles from "./QuickAccessRow.module.css";

interface AccessItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: ModuleKey; // absent = toujours visible (sous réserve de `needsChildren`)
  needsChildren?: boolean;
}

const ITEMS: AccessItem[] = [
  { href: "/documents", label: "Documents", icon: Lock, module: "documents" },
  { href: "/sujets", label: "Sujets", icon: MessageSquareText, module: "sujets" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, module: "agenda" },
  { href: "/enfants", label: "Enfant(s)", icon: Users, needsChildren: true },
];

export function QuickAccessRow() {
  const { family, members } = useAppData();
  const hasChildren = members.some((member) => member.role === "enfant");

  const visible = ITEMS.filter(
    (item) => (!item.module || isModuleActive(family.settings, item.module)) && (!item.needsChildren || hasChildren)
  );
  if (visible.length === 0) return null;

  return (
    <div className={styles.row}>
      {visible.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={styles.item}>
          <Icon size={17} strokeWidth={2.5} />
          {label}
        </Link>
      ))}
    </div>
  );
}
