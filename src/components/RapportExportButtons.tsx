import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { isPro } from "@/lib/access";
import { downloadFile } from "@/lib/download";
import styles from "./VentesExportButtons.module.css";

// Rapport "classique" (récap total / par créatrice) — /export/{format} ou
// /export/{format}/boutique. Contrairement à VentesExportButtons (détail
// ligne par ligne, toujours un mois précis), celui-ci peut aussi bien sortir
// un mois précis que tout l'historique d'un coup — les deux restent
// disponibles en FREE, seul le choix d'un MOIS PASSÉ précis est PRO/DUO.

const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type Format = "pdf" | "excel" | "csv";
type Periode = "tout" | "mois";

const FORMATS: { type: Format; ext: string; icon: string; label: string; proOnly: boolean }[] = [
  { type: "pdf", ext: "pdf", icon: "📄", label: "PDF", proOnly: false },
  { type: "excel", ext: "xlsx", icon: "📊", label: "Excel", proOnly: true },
  { type: "csv", ext: "csv", icon: "📋", label: "CSV", proOnly: true },
];

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  /** "/export/{format}" (créatrice) ou "/export/{format}/boutique" (gérante) */
  scope: "personal" | "boutique";
  boutiqueId?: string;
  filenameBase: string;
}

export default function RapportExportButtons({ scope, boutiqueId, filenameBase }: Props) {
  const user = useAuthStore((s) => s.user);
  const pro = isPro(user);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [periode, setPeriode] = useState<Periode>("tout");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [downloading, setDownloading] = useState<Format | null>(null);

  const key = `${year}-${pad(month + 1)}`;
  const isCurrent = key === currentKey;
  const chevronsLocked = !pro;

  function goPrev() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function goNext() {
    if (isCurrent) return;
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  async function handleDownload(format: (typeof FORMATS)[number]) {
    const params = [
      boutiqueId ? `boutiqueId=${encodeURIComponent(boutiqueId)}` : null,
      periode === "mois" ? `mois=${key}` : null,
    ]
      .filter(Boolean)
      .join("&");
    const path = `/export/${format.type}${scope === "boutique" ? "/boutique" : ""}${params ? `?${params}` : ""}`;
    const suffix = periode === "mois" ? `-${key}` : "";
    setDownloading(format.type);
    await downloadFile(path, `${filenameBase}${suffix}.${format.ext}`);
    setDownloading(null);
  }

  function sub(format: (typeof FORMATS)[number]) {
    if (format.proOnly && !pro) return "Disponible en PRO";
    if (format.type === "pdf") return "Une ligne par créatrice + totaux";
    if (format.type === "excel") return "Fichier .xlsx mis en forme";
    return "Compatible Excel / Sheets";
  }

  return (
    <div className={styles.card}>
      <div className={styles.periodeToggle}>
        <button type="button" className={periode === "tout" ? `${styles.periodeBtn} ${styles.periodeBtnActive}` : styles.periodeBtn} onClick={() => setPeriode("tout")}>
          Tout l'historique
        </button>
        <button type="button" className={periode === "mois" ? `${styles.periodeBtn} ${styles.periodeBtnActive}` : styles.periodeBtn} onClick={() => setPeriode("mois")}>
          Un mois précis
        </button>
      </div>

      {periode === "mois" && (
        <div className={styles.monthRow}>
          <button type="button" className={styles.chevron} onClick={goPrev} disabled={chevronsLocked} aria-label="Mois précédent">
            ‹
          </button>
          <div className={styles.monthCenter}>
            <div className={styles.monthLabel}>
              {MOIS_FR[month]} {year}
            </div>
            {pro ? isCurrent && <div className={styles.monthHint}>Mois en cours</div> : <div className={styles.monthHint}>🔒 Autres mois : PRO / DUO</div>}
          </div>
          <button type="button" className={styles.chevron} onClick={goNext} disabled={chevronsLocked || isCurrent} aria-label="Mois suivant">
            ›
          </button>
        </div>
      )}

      {FORMATS.map((format) => {
        const locked = format.proOnly && !pro;
        const loading = downloading === format.type;
        return (
          <button
            key={format.type}
            type="button"
            className={locked ? `${styles.formatBtn} ${styles.formatBtnLocked}` : styles.formatBtn}
            onClick={() => !locked && handleDownload(format)}
            disabled={locked || !!downloading}
          >
            <span className={styles.formatIcon}>{format.icon}</span>
            <span className={styles.formatText}>
              <span className={styles.formatLabel}>Récupérer en {format.label}</span>
              <span className={styles.formatSub}>{sub(format)}</span>
            </span>
            <span className={styles.formatEnd}>{loading ? "…" : locked ? "🔒" : "↓"}</span>
          </button>
        );
      })}
    </div>
  );
}
