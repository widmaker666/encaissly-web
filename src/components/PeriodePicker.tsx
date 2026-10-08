import { useState } from "react";
import Chip from "@/components/Chip";
import styles from "./PeriodePicker.module.css";

const MOIS_LABELS = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ANNEE_MIN = 2024;

/** "2026-10" → "octobre 2026" ; null → "Tous les mois". */
export function formatPeriode(mois: string | null): string {
  return mois ? `${MOIS_LONGS[Number(mois.slice(5)) - 1]} ${mois.slice(0, 4)}` : "Tous les mois";
}

interface PeriodePickerProps {
  /** null = tous les mois, sinon "YYYY-MM" */
  value: string | null;
  onChange: (mois: string | null) => void;
}

/** Choix « Tous les mois » ou d'un mois précis d'une année — partagé Stats / fiche créatrice. */
export default function PeriodePicker({ value, onChange }: PeriodePickerProps) {
  const now = new Date();
  const [annee, setAnnee] = useState(value ? Number(value.slice(0, 4)) : now.getFullYear());

  return (
    <div className={styles.periode}>
      <div className={styles.periodeRow}>
        <Chip active={value === null} onClick={() => onChange(null)}>
          Tous les mois
        </Chip>
        <div className={styles.yearNav}>
          <button type="button" className={styles.yearBtn} aria-label="Année précédente" disabled={annee <= ANNEE_MIN} onClick={() => setAnnee(annee - 1)}>
            ‹
          </button>
          <span className={styles.yearLabel}>{annee}</span>
          <button type="button" className={styles.yearBtn} aria-label="Année suivante" disabled={annee >= now.getFullYear()} onClick={() => setAnnee(annee + 1)}>
            ›
          </button>
        </div>
      </div>
      <div className={styles.moisGrid}>
        {MOIS_LABELS.map((label, i) => {
          const mois = `${annee}-${String(i + 1).padStart(2, "0")}`;
          const futur = annee === now.getFullYear() && i > now.getMonth();
          return (
            <Chip key={mois} active={value === mois} disabled={futur} onClick={() => onChange(mois)}>
              {label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
