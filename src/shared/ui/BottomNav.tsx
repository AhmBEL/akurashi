"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Plus, Lock, Users, type LucideIcon } from "lucide-react";
import { useAppData } from "@/shared/session/AppDataContext";
import { isModuleActive } from "@/domains/family/settings";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  onOpenQuickCreate: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function BottomNav({ onOpenQuickCreate }: BottomNavProps) {
  const pathname = usePathname();
  const { family, members } = useAppData();

  // La navigation ne montre que les modules actifs (onboarding / Réglages) ;
  // l'onglet Enfants n'existe que s'il y a des enfants.
  const items: NavItem[] = [
    { href: "/", label: "Accueil", icon: Home },
    ...(isModuleActive(family.settings, "agenda") ? [{ href: "/agenda", label: "Agenda", icon: Calendar }] : []),
    ...(isModuleActive(family.settings, "documents") ? [{ href: "/documents", label: "Documents", icon: Lock }] : []),
    ...(members.some((member) => member.role === "enfant") ? [{ href: "/enfants", label: "Enfants", icon: Users }] : []),
  ];
  const middle = Math.ceil(items.length / 2);

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
      {items.slice(0, middle).map(renderItem)}
      <div className={styles.createWrap}>
        <button className={styles.createButton} onClick={onOpenQuickCreate} title="Créer" aria-label="Créer">
          <Plus size={28} strokeWidth={2.9} />
        </button>
      </div>
      {items.slice(middle).map(renderItem)}
    </nav>
  );
}
