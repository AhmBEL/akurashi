"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/shared/session/AppDataContext";
import { useCategoryOptions } from "@/domains/budget/hooks";
import { AddExpenseSheet } from "@/domains/budget/components/AddExpenseSheet";
import { isModuleActive } from "@/domains/family/settings";
import { BottomNav } from "./BottomNav";
import { QuickCreateSheet } from "./QuickCreateSheet";
import { InstallBanner } from "./InstallBanner";
import styles from "./AppChrome.module.css";

export function AppChrome({ children }: { children: ReactNode }) {
  const { family, members, member } = useAppData();
  const budgetCategories = useCategoryOptions(family.id) ?? [];
  const [quickOpen, setQuickOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const router = useRouter();

  const goTo = (path: string) => () => {
    setQuickOpen(false);
    router.push(path);
  };

  // Le menu « + » ne propose que ce qui est actif (budget, modules).
  const { settings } = family;
  const quickItems = [
    ...(settings.budgetEnabled && member.role === "parent"
      ? [
          {
            mark: "DE",
            label: "Ajouter une dépense",
            sub: "Le plus fréquent",
            onSelect: () => {
              setQuickOpen(false);
              setAddExpenseOpen(true);
            },
          },
        ]
      : []),
    ...(isModuleActive(settings, "agenda")
      ? [{ mark: "RD", label: "Rendez-vous", sub: "Un créneau dans l'agenda famille", onSelect: goTo("/agenda") }]
      : []),
    ...(isModuleActive(settings, "sujets")
      ? [{ mark: "SU", label: "Sujet", sub: "Un projet à suivre à plusieurs", onSelect: goTo("/sujets") }]
      : []),
    ...(isModuleActive(settings, "documents")
      ? [{ mark: "DO", label: "Document", sub: "Un fichier dans le coffre sécurisé", onSelect: goTo("/documents") }]
      : []),
  ];

  return (
    <>
      <div className={styles.content}>
        <InstallBanner />
        {children}
      </div>
      <div className={styles.navWrap}>
        <BottomNav onOpenQuickCreate={() => setQuickOpen(true)} />
      </div>
      <QuickCreateSheet open={quickOpen} onClose={() => setQuickOpen(false)} items={quickItems} />
      <AddExpenseSheet
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        familyId={family.id}
        categories={budgetCategories}
        members={members.map((member) => ({ id: member.id, name: member.name }))}
      />
    </>
  );
}
