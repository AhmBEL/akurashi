"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { QuickCreateSheet } from "./QuickCreateSheet";
import { AddExpenseSheet } from "@/domains/budget/components/AddExpenseSheet";
import styles from "./AppChrome.module.css";

interface AppChromeProps {
  children: ReactNode;
  familyId: string;
  budgetCategories: { id: string; name: string }[];
  members: { id: string; name: string }[];
}

export function AppChrome({ children, familyId, budgetCategories, members }: AppChromeProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const router = useRouter();

  const quickItems = [
    {
      mark: "DE",
      label: "Ajouter une dépense",
      sub: "Le plus fréquent",
      onSelect: () => {
        setQuickOpen(false);
        setAddExpenseOpen(true);
      },
    },
    {
      mark: "RD",
      label: "Rendez-vous",
      sub: "Un créneau dans l'agenda famille",
      onSelect: () => {
        setQuickOpen(false);
        router.push("/agenda");
      },
    },
    {
      mark: "SU",
      label: "Sujet",
      sub: "Un projet à suivre à plusieurs",
      onSelect: () => {
        setQuickOpen(false);
        router.push("/sujets");
      },
    },
    {
      mark: "DO",
      label: "Document",
      sub: "Un fichier dans le coffre sécurisé",
      onSelect: () => {
        setQuickOpen(false);
        router.push("/documents");
      },
    },
  ];

  return (
    <>
      <div className={styles.content}>{children}</div>
      <div className={styles.navWrap}>
        <BottomNav onOpenQuickCreate={() => setQuickOpen(true)} />
      </div>
      <QuickCreateSheet open={quickOpen} onClose={() => setQuickOpen(false)} items={quickItems} />
      <AddExpenseSheet
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        familyId={familyId}
        categories={budgetCategories}
        members={members}
      />
    </>
  );
}
