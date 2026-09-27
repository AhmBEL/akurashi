"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Plus, Lock, Users, type LucideIcon } from "lucide-react";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  onOpenQuickCreate: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/agenda", label: "Agenda", icon: Calendar },
];

const ITEMS_AFTER: NavItem[] = [
  { href: "/documents", label: "Documents", icon: Lock },
  { href: "/enfants", label: "Enfants", icon: Users },
];

export function BottomNav({ onOpenQuickCreate }: BottomNavProps) {
  const pathname = usePathname();

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = pathname === href;
    return (
      <Link key={href} href={href} className={styles.item} style={{ color: active ? "var(--fa-accent)" : "var(--fa-muted)" }}>
        <Icon size={23} strokeWidth={2.75} />
        {label}
      </Link>
    );
  };

  return (
    <nav className={styles.nav}>
      {ITEMS.map(renderItem)}
      <div className={styles.createWrap}>
        <button className={styles.createButton} onClick={onOpenQuickCreate} title="Créer" aria-label="Créer">
          <Plus size={28} strokeWidth={2.9} />
        </button>
      </div>
      {ITEMS_AFTER.map(renderItem)}
    </nav>
  );
}
