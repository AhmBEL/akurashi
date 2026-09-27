"use client";

import styles from "./QuickCreateSheet.module.css";

export interface QuickCreateItem {
  mark: string;
  label: string;
  sub: string;
  onSelect: () => void;
}

interface QuickCreateSheetProps {
  open: boolean;
  onClose: () => void;
  items: QuickCreateItem[];
}

export function QuickCreateSheet({ open, onClose, items }: QuickCreateSheetProps) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Créer</div>
        <div className={styles.list}>
          {items.map((item) => (
            <button key={item.label} className={styles.item} onClick={item.onSelect}>
              <span className={styles.mark}>{item.mark}</span>
              <span>
                <span className={styles.itemLabel}>{item.label}</span>
                <span className={styles.itemSub}>{item.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
