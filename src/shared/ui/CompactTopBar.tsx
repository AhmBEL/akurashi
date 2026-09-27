import Link from "next/link";
import { Avatar } from "./Avatar";
import styles from "./CompactTopBar.module.css";

interface CompactTopBarProps {
  label: string;
  memberName: string;
  signatureColor: string;
}

// Deliberately compact: MASTER_Design_App_Famille_Belhadj.md §2 asks to avoid
// a giant serif salutation (the trait that made the prototype read too close
// to a Mental Loadless-style weather header).
export function CompactTopBar({ label, memberName, signatureColor }: CompactTopBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.label}>{label}</div>
      <Link href="/reglages" className={styles.avatarLink} aria-label="Réglages">
        <Avatar name={memberName} color={signatureColor} size={40} />
      </Link>
    </div>
  );
}
