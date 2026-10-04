import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

/** Conteneur de base (fond surface, radius, ombre légère) — remplace .card/.statCard etc. */
export default function Card({ padding = "md", className, ...rest }: CardProps) {
  const classes = [styles.card, styles[`pad-${padding}`], className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}

interface CardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  padding?: "sm" | "md" | "lg";
}

/** Même rendu que Card mais en vrai <button> — pour les cards cliquables (boutique, créatrice…), accessible au clavier. */
export function CardButton({ padding = "md", className, type = "button", ...rest }: CardButtonProps) {
  const classes = [styles.card, styles[`pad-${padding}`], styles.clickable, className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...rest} />;
}
