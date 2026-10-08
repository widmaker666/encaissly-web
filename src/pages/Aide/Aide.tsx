import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import styles from "./Aide.module.css";

// Port de encaissly-mobile/pages/Aide — contenu adapté aux parcours web
// (sidebar au lieu d'onglets, boutons et emplacements différents du
// mobile par endroits) plutôt que recopié mot pour mot.

interface HelpItem {
  title: string;
  body: string;
  badge?: "PRO" | "DUO";
}
interface HelpSection {
  title: string;
  items: HelpItem[];
}

export default function Aide() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);
  const duo = isDuo(user);

  const [openKey, setOpenKey] = useState<string | null>(null);

  const sections: HelpSection[] = [
    {
      title: "Démarrage",
      items: [
        {
          title: "Quelle différence entre Gérante et Créatrice ?",
          body: "La Gérante gère la boutique, ses créatrices et les stats globales. La Créatrice voit uniquement ses propres ventes et commissions. Le mode DUO permet de cumuler les deux rôles sur un seul compte.",
        },
        gerante
          ? {
              title: "Créer ma boutique",
              body: "Depuis le Tableau de bord, clique sur « Créer ma première boutique », donne-lui un nom et valide. Tu pourras ensuite ajouter des créatrices et enregistrer des ventes.",
            }
          : {
              title: "Créer un événement",
              body: "Va dans l'onglet Événements (en vue Créatrice) et clique sur « + Nouvel événement ». Donne-lui un nom (ex : Marché de Noël). En plan FREE, tu es limitée à 1 événement.",
            },
      ],
    },
    ...(gerante
      ? [
          {
            title: "Créatrices",
            items: [
              {
                title: "Ajouter une créatrice",
                body: "Dans Créatrices, clique sur « + Nouvelle créatrice », renseigne son nom et son taux de commission, puis valide. Elle apparaît immédiatement dans ta liste.",
              },
            ],
          },
        ]
      : []),
    {
      title: "Articles",
      items: [
        {
          title: "Créer un article",
          body: "Depuis la fiche d'une créatrice (Créatrices → clique sur son nom → Voir les articles), bouton « + Nouvel article » : renseigne le nom, le prix et le stock, puis valide.",
        },
        {
          title: "Importer un CSV / Excel",
          body: "Depuis le même écran, le bouton « Importer » charge un fichier CSV ou Excel contenant plusieurs articles en une fois.",
        },
      ],
    },
    {
      title: "Ventes",
      items: [
        {
          title: "Enregistrer une vente",
          body: "Dans Ventes, bouton « + Ajouter une vente ». Choisis la créatrice, sélectionne l'article (ou saisis-en un non répertorié), le mode de paiement, puis valide.",
        },
        {
          title: "Modifier ou supprimer une vente",
          body: "Clique directement sur une vente dans le tableau pour l'ouvrir, la corriger ou la supprimer.",
        },
      ],
    },
    {
      title: "Stats & export",
      items: [
        {
          title: "Lire mes statistiques",
          body: "L'écran Stats affiche le chiffre d'affaires, le ticket moyen, l'évolution par rapport à la période précédente, et le détail par créatrice ou événement.",
        },
        {
          title: "Exporter un rapport",
          body: "Depuis Stats (section Téléchargements) ou une fiche boutique/créatrice, choisis « Tout l'historique » ou « Un mois précis », puis le format : PDF, Excel ou CSV.",
        },
        {
          title: "Excel et CSV",
          body: "Réservés aux plans PRO et DUO. Le PDF reste disponible en FREE, avec un filigrane.",
          badge: "PRO",
        },
      ],
    },
    {
      title: "Mon compte",
      items: [
        {
          title: "Comment modifier mon email ?",
          body: "La modification d'email n'est pas disponible dans l'appli pour l'instant. Écris-nous à contact.encaissly@gmail.com.",
        },
      ],
    },
    {
      title: "Abonnement",
      items: [
        {
          title: "Passer PRO / DUO",
          body: "Dans Profil, section Abonnement, choisis ta formule (mensuelle ou annuelle) et valide. Le paiement est géré par Stripe.",
        },
        {
          title: "Puis-je avoir plusieurs boutiques ?",
          body: "Oui, avec le plan PRO. En plan FREE, tu es limitée à 1 boutique et 3 créatrices maximum.",
        },
        ...(duo
          ? [
              {
                title: "Mode DUO : basculer de vue",
                body: "Un bouton Gérante/Créatrice apparaît en haut de chaque écran principal pour basculer entre les deux vues, sans changer de compte.",
                badge: "DUO" as const,
              },
            ]
          : []),
        {
          title: "Résilier mon abonnement",
          body: "Dans Profil, section Abonnement, clique sur « Résilier l'abonnement ». Tu repasses immédiatement en plan FREE.",
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <Button variant="link" onClick={() => navigate("/profil")}>
        ‹ Profil
      </Button>

      <div>
        <h1 className={styles.title}>Aide</h1>
        <p className={styles.intro}>Retrouve ici comment faire les actions essentielles dans Encaissly.</p>
      </div>

      {sections.map((section, si) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <Card className={styles.card}>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              const isOpen = openKey === key;
              return (
                <div key={key}>
                  {ii > 0 && <div className={styles.divider} />}
                  <button type="button" className={styles.itemHeader} onClick={() => setOpenKey(isOpen ? null : key)}>
                    <span className={styles.itemTitleRow}>
                      <span className={styles.itemTitleTxt}>{item.title}</span>
                      {item.badge && (
                        <Badge color={item.badge === "PRO" ? "success" : "warning"} variant="solid">
                          {item.badge}
                        </Badge>
                      )}
                    </span>
                    <span className={styles.chevron}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && <p className={styles.itemBody}>{item.body}</p>}
                </div>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
