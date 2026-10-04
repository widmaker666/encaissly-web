import styles from "./Avatar.module.css";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  color?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps["size"]>, number> = { sm: 34, md: 56, lg: 72 };

/** Avatar rond (photo ou initiale) — remplace les tailles/styles dupliqués dans Profil/CreatriceDetail/Boutique. */
export default function Avatar({ name, src, size = "md", color }: AvatarProps) {
  const px = SIZE_PX[size];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={styles.avatarImg}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <div
      className={styles.avatar}
      style={{ width: px, height: px, background: color ?? "var(--color-primary)", fontSize: px * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
