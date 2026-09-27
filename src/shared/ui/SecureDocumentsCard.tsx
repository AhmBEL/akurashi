import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "./Card";
import styles from "./SecureDocumentsCard.module.css";

export function SecureDocumentsCard() {
  return (
    <Link href="/documents" style={{ textDecoration: "none", display: "block" }}>
      <Card radius="34px 16px 30px 20px" className={styles.card}>
        <span className={styles.icon}>
          <Lock size={20} strokeWidth={2.75} />
        </span>
        <span>
          <span className={styles.title}>Documents</span>
          <div className={styles.sub}>Espace protégé</div>
        </span>
      </Card>
    </Link>
  );
}
