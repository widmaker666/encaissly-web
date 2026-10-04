import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "outline" | "danger" | "dangerOutline" | "link" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

/** Bouton unique pour toute l'appli — remplace les ~15 variantes dupliquées par page. */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [styles.btn, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
