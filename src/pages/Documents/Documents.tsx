import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { boutiqueService, creatriceService, statsService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isGerante, isPro as checkIsPro } from "@/lib/access";
import { downloadFile } from "@/lib/download";
import { formatMontant } from "@/lib/money";
import { formatMonthYear } from "@/lib/date";
import type { Boutique, Creatrice } from "@/types";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import PeriodePicker, { formatPeriode } from "@/components/PeriodePicker";
import { fieldControl } from "@/components/Field";
import styles from "./Documents.module.css";

// Un seul écran pour tous les exports (avant : 6 blocs répartis entre Stats,
// fiches boutique/créatrice et tableau de bord). Mêmes routes serveur, mêmes
// règles de plan — le serveur reste l'autorité :
//   FREE   : PDF seulement, mois en cours uniquement
//   PRO/DUO: PDF + Excel + CSV, n'importe quel mois ou tout l'historique

type Doc = "ventes" | "recap";
type Format = "pdf" | "excel" | "csv";

const FORMATS: { type: Format; ext: string; label: string; proOnly: boolean }[] = [
  { type: "pdf", ext: "pdf", label: "PDF", proOnly: false },
  { type: "excel", ext: "xlsx", label: "Excel", proOnly: true },
  { type: "csv", ext: "csv", label: "CSV", proOnly: true },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function moisCourant() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Documents() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);
  const pro = checkIsPro(user);
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  // Arrivée depuis une fiche créatrice : « Détail des ventes » déjà réglé sur elle
  const creatricePreset = gerante ? searchParams.get("creatriceId") : null;

  const [doc, setDoc] = useState<Doc>("ventes");
  const [pour, setPour] = useState<"boutique" | "creatrice">(creatricePreset ? "creatrice" : "boutique");
  const [creatriceId, setCreatriceId] = useState(creatricePreset ?? "");
  const [boutiqueId, setBoutiqueId] = useState("");
  const [mois, setMois] = useState<string | null>(pro ? null : moisCourant());
  const [downloading, setDownloading] = useState<Format | null>(null);

  const { data: boutiques = [] } = useQuery<Boutique[]>({
    queryKey: ["mes-boutiques-documents"],
    queryFn: boutiqueService.getMesBoutiques,
    enabled: gerante,
  });
  const { data: creatrices = [] } = useQuery<Creatrice[]>({
    queryKey: ["creatrices"],
    queryFn: creatriceService.getAll,
    enabled: gerante,
  });

  // FREE : toujours le mois en cours (le serveur l'impose aussi)
  const moisEffectif = pro ? mois : moisCourant();
  const parCreatrice = gerante && doc === "ventes" && pour === "creatrice";
  const creatriceChoisie = creatrices.find((c) => c.id === creatriceId);
  // Le récapitulatif porte sur UNE boutique (celle choisie, sinon la 1re côté serveur)
  const boutiqueEffective = boutiqueId || (doc === "recap" && boutiques.length > 1 ? boutiques[0]?.id : "") || "";

  // Aperçu : nombre de ventes et CA de la période (hors choix « une créatrice », sans route dédiée)
  const { data: apercu } = useQuery({
    queryKey: ["documents-apercu", currentMode, moisEffectif ?? "tout", boutiqueEffective],
    queryFn: () =>
      statsService.getGlobal({
        mode: currentMode,
        ...(moisEffectif ? { mois: moisEffectif } : {}),
        ...(gerante && boutiqueEffective ? { boutiqueId: boutiqueEffective } : {}),
      }),
    enabled: !parCreatrice,
  });
  const nbVentes: number = apercu?.stats?._count ?? 0;
  const ca: number = apercu?.stats?._sum?.prixVente ?? 0;

  function buildRequest(format: Format): { path: string; filename: string } {
    const suffix = moisEffectif ? `-${moisEffectif}` : "-tout";
    const q = (params: (string | null)[]) => params.filter(Boolean).join("&");

    if (!gerante) {
      const query = q([moisEffectif ? `mois=${moisEffectif}` : null]);
      return { path: `/export/${format}${query ? `?${query}` : ""}`, filename: `ventes${suffix}.${FORMATS.find((f) => f.type === format)!.ext}` };
    }
    const ext = FORMATS.find((f) => f.type === format)!.ext;
    if (doc === "recap") {
      const query = q([boutiqueEffective ? `boutiqueId=${encodeURIComponent(boutiqueEffective)}` : null, moisEffectif ? `mois=${moisEffectif}` : null]);
      return { path: `/export/${format}/boutique${query ? `?${query}` : ""}`, filename: `rapport-boutique${suffix}.${ext}` };
    }
    const query = q([
      boutiqueId ? `boutiqueId=${encodeURIComponent(boutiqueId)}` : null,
      parCreatrice && creatriceId ? `creatriceId=${encodeURIComponent(creatriceId)}` : null,
      moisEffectif ? `mois=${moisEffectif}` : null,
    ]);
    const base = parCreatrice && creatriceChoisie ? `ventes-${slug(creatriceChoisie.nom)}` : "ventes-boutique";
    return { path: `/export/${format}/ventes${query ? `?${query}` : ""}`, filename: `${base}${suffix}.${ext}` };
  }

  async function handleDownload(format: Format) {
    const { path, filename } = buildRequest(format);
    setDownloading(format);
    await downloadFile(path, filename);
    setDownloading(null);
  }

  // Numérotation dynamique : les étapes inutiles (créatrice, un seul choix…) disparaissent
  const showDocStep = gerante;
  const showPourStep = gerante && doc === "ventes";
  const showBoutiqueStep = gerante && boutiques.length > 1;
  let n = 0;
  const next = () => ++n;

  const periodeLabel = moisEffectif ? formatPeriode(moisEffectif) : "tous les mois";
  const canDownload = !parCreatrice || !!creatriceId;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Documents</h1>
        <p className={styles.subtitle}>Tous tes exports au même endroit</p>
      </div>

      <Card className={styles.card}>
        {showDocStep && (
          <div className={styles.step}>
            <span className={styles.num}>{next()}</span>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Quel document ?</h2>
              <div className={styles.options}>
                <button type="button" className={doc === "ventes" ? `${styles.option} ${styles.optionOn}` : styles.option} aria-pressed={doc === "ventes"} onClick={() => setDoc("ventes")}>
                  <strong>Détail des ventes</strong>
                  <span>Une ligne par vente, avec commission et net</span>
                </button>
                <button type="button" className={doc === "recap" ? `${styles.option} ${styles.optionOn}` : styles.option} aria-pressed={doc === "recap"} onClick={() => setDoc("recap")}>
                  <strong>Récapitulatif</strong>
                  <span>Une ligne par créatrice, avec totaux</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.step}>
          <span className={styles.num}>{next()}</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Quelle période ?</h2>
            {pro ? (
              <PeriodePicker value={mois} onChange={setMois} />
            ) : (
              <div className={styles.locked}>
                <Badge color="primary">{formatMonthYear().replace(/^./, (c) => c.toUpperCase())}</Badge>
                <span>🔒 Plan FREE : mois en cours uniquement. Les autres mois sont réservés à PRO / DUO.</span>
              </div>
            )}
          </div>
        </div>

        {showPourStep && (
          <div className={styles.step}>
            <span className={styles.num}>{next()}</span>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Pour qui ?</h2>
              <div className={styles.options}>
                <button type="button" className={pour === "boutique" ? `${styles.option} ${styles.optionOn}` : styles.option} aria-pressed={pour === "boutique"} onClick={() => setPour("boutique")}>
                  <strong>Toute la boutique</strong>
                  <span>Les ventes de toutes tes créatrices</span>
                </button>
                <button type="button" className={pour === "creatrice" ? `${styles.option} ${styles.optionOn}` : styles.option} aria-pressed={pour === "creatrice"} onClick={() => setPour("creatrice")}>
                  <strong>Une créatrice</strong>
                  <span>{creatriceChoisie ? creatriceChoisie.nom : "Choisis-la ci-dessous"}</span>
                </button>
              </div>
              {pour === "creatrice" && (
                <select className={`${fieldControl} ${styles.select}`} value={creatriceId} onChange={(e) => setCreatriceId(e.target.value)} aria-label="Créatrice">
                  <option value="">Choisir une créatrice…</option>
                  {creatrices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {showBoutiqueStep && (
          <div className={styles.step}>
            <span className={styles.num}>{next()}</span>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Quelle boutique ?</h2>
              <select className={`${fieldControl} ${styles.select}`} value={doc === "recap" ? boutiqueEffective : boutiqueId} onChange={(e) => setBoutiqueId(e.target.value)} aria-label="Boutique">
                {doc === "ventes" && <option value="">Toutes mes boutiques</option>}
                {boutiques.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className={styles.step}>
          <span className={styles.num}>{next()}</span>
          <div className={styles.stepBody}>
            <h2 className={styles.stepTitle}>Quel format ?</h2>
            <div className={styles.formats}>
              {FORMATS.map((format) => {
                const locked = format.proOnly && !pro;
                const loading = downloading === format.type;
                return (
                  <button
                    key={format.type}
                    type="button"
                    className={locked ? `${styles.format} ${styles.formatLocked}` : styles.format}
                    onClick={() => !locked && handleDownload(format.type)}
                    disabled={locked || !!downloading || !canDownload}
                    aria-label={locked ? `${format.label} (réservé aux plans PRO et DUO)` : `Télécharger en ${format.label}`}
                  >
                    <span>{format.label}</span>
                    {locked ? <Badge color="primary">PRO</Badge> : <span aria-hidden="true">{loading ? "…" : "↓"}</span>}
                  </button>
                );
              })}
            </div>
            {!canDownload && <p className={styles.hint}>Choisis d'abord une créatrice.</p>}
            {canDownload && !parCreatrice && (
              <p className={styles.hint}>
                Aperçu : {nbVentes} vente{nbVentes > 1 ? "s" : ""} · {formatMontant(ca)} · {periodeLabel}
              </p>
            )}
            {!pro && <p className={styles.hint}>Excel et CSV : plans PRO / DUO.</p>}
          </div>
        </div>
      </Card>

      {gerante && boutiques.length === 0 && <Notice>Crée d'abord une boutique pour pouvoir exporter des ventes.</Notice>}
    </div>
  );
}
