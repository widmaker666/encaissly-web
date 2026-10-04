import type { ButtonHTMLAttributes } from "react";
import styles from "./Chip.module.css";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Filtre cliquable (pill) — remplace .chip/.pill/.modeChip dupliqués dans Ventes/Stats/VenteCreateModal. */
export default function Chip({ active, className, type = "button", ...rest }: ChipProps) {
  const classes = [styles.chip, active ? styles.active : "", className].filter(Boolean).join(" ");
  return <button type={type} className={classes} aria-pressed={active} {...rest} />;
}
