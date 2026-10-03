import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { isPro } from "@/lib/access";
import { downloadFile } from "@/lib/download";
import styles from "./VentesExportButtons.module.css";

// Port web de encaissly-mobile/components/VentesExportButtons.tsx — mêmes
// règles, même backend (/export/{format}/ventes). Vue gérante uniquement,
// c'est à l'écran qui l'affiche d'appliquer cette condition (comme sur mobile).

const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type Format = "pdf" | "excel" | "csv";

const FORMATS: { type: Format; ext: string; icon: string; label: string; proOnly: boolean }[] = [
  { type: "pdf", ext: "pdf", icon: "📄", label: "PDF", proOnly: false },
  { type: "excel", ext: "xlsx", icon: "📊", label: "Excel", proOnly: true },
  { type: "csv", ext: "csv", icon: "📋", label: "CSV", proOnly: true },
];

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  /** Sans boutiqueId : toutes les boutiques de la gérante */
  boutiqueId?: string;
  /** Sans creatriceId : toutes les créatrices */
  creatriceId?: string;
  /** Début du nom de fichier, le mois est ajouté (ex. "ventes-boutique-2026-09.pdf") */
  filenameBase: string;
}

export default function VentesExportButtons({ boutiqueId, creatriceId, filenameBase }: Props) {
  const user = useAuthStore((s) => s.user);
  const pro = isPro(user);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
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
    if (isCurrent) return; // pas de mois futur
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
      creatriceId ? `creatriceId=${encodeURIComponent(creatriceId)}` : null,
      `mois=${key}`,
    ]
      .filter(Boolean)
      .join("&");
    setDownloading(format.type);
    await downloadFile(`/export/${format.type}/ventes?${params}`, `${filenameBase}-${key}.${format.ext}`);
    setDownloading(null);
  }

  function sub(format: (typeof FORMATS)[number]) {
    if (format.proOnly && !pro) return "Disponible en PRO";
    if (format.type === "pdf") return pro ? "Une ligne par vente + totaux" : "Mois en cours · avec filigrane";
    if (format.type === "excel") return "Fichier .xlsx mis en forme";
    return "Compatible Excel / Sheets";
  }

  return (
    <div className={styles.card}>
      <p className={styles.intro}>
        {creatriceId
          ? "Toutes ses ventes du mois, ligne par ligne, avec sa commission et son net."
          : "Les ventes de toutes les créatrices du mois, ligne par ligne, triées par créatrice."}
      </p>

      <div className={styles.monthRow}>
        <button type="button" className={styles.chevron} onClick={goPrev} disabled={chevronsLocked} aria-label="Mois précédent">
          ‹
        </button>
        <div className={styles.monthCenter}>
          <div className={styles.monthLabel}>
            {MOIS_FR[month]} {year}
          </div>
          {pro ? (
            isCurrent && <div className={styles.monthHint}>Mois en cours</div>
          ) : (
            <div className={styles.monthHint}>🔒 Autres mois : PRO / DUO</div>
          )}
        </div>
        <button type="button" className={styles.chevron} onClick={goNext} disabled={chevronsLocked || isCurrent} aria-label="Mois suivant">
          ›
        </button>
      </div>

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
