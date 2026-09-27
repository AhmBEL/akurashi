import styles from "./Avatar.module.css";

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = 34 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size * 0.94, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
