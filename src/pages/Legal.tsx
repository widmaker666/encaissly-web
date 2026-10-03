import { useNavigate } from "react-router";
import styles from "./Legal.module.css";

// Même texte que encaissly-mobile/pages/Legal/index.tsx — contenu légal,
// ne pas reformuler, juste reporté tel quel.

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Présentation",
    body: "Encaissly est une application mobile de caisse destinée aux boutiques de créateurs. Elle est éditée par Encaissly SAS et permet d'enregistrer des ventes, suivre les commissions des créatrices, et gérer les statistiques d'activité.",
  },
  {
    title: "2. Données collectées",
    body: "En créant un compte, nous collectons :\n• Votre adresse email\n• Votre nom et prénom (facultatifs)\n• Les données liées à votre activité (ventes, montants, créatrices)\n\nCes données sont nécessaires au fonctionnement du service et ne sont jamais vendues à des tiers.",
  },
  {
    title: "3. Utilisation des données",
    body: "Vos données sont utilisées exclusivement pour :\n• Gérer votre compte et votre abonnement\n• Afficher vos statistiques de vente\n• Vous envoyer des notifications liées à votre activité (si activé)\n• Gérer la facturation via Stripe",
  },
  {
    title: "4. Hébergement et sécurité",
    body: "Les données sont hébergées en Europe (Neon / AWS eu-central-1). Les mots de passe sont hachés (bcrypt) et ne sont jamais stockés en clair. Les communications sont chiffrées (HTTPS/TLS).",
  },
  {
    title: "5. Durée de conservation",
    body: "Vos données sont conservées pendant la durée de votre abonnement et 12 mois après sa résiliation, conformément à nos obligations légales. Vous pouvez demander la suppression de votre compte à tout moment.",
  },
  {
    title: "6. Vos droits (RGPD)",
    body: "Conformément au RGPD, vous disposez des droits suivants :\n• Accès à vos données\n• Rectification de vos données\n• Suppression de votre compte\n• Portabilité de vos données\n• Opposition au traitement\n\nPour exercer ces droits, contactez-nous à : support@encaissly.fr",
  },
  {
    title: "7. Cookies et tracking",
    body: "L'application n'utilise pas de cookies de tracking publicitaire. Seules les données strictement nécessaires au fonctionnement sont collectées.",
  },
  {
    title: "8. Paiements",
    body: "Les paiements sont traités par Stripe, Inc. Encaissly ne stocke jamais vos coordonnées bancaires. Consultez la politique de confidentialité de Stripe sur stripe.com.",
  },
  {
    title: "9. Modifications",
    body: "Nous pouvons mettre à jour ces conditions. En cas de modification substantielle, vous serez notifié par email ou via l'application. La poursuite de l'utilisation après notification vaut acceptation.",
  },
  {
    title: "10. Contact",
    body: "Pour toute question relative à vos données ou à ces conditions :\nEmail : support@encaissly.fr",
  },
];

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Retour">
          ‹
        </button>
        <h1 className={styles.headerTitle}>CGU & Confidentialité</h1>
      </header>

      <div className={styles.content}>
        <p className={styles.lastUpdate}>Dernière mise à jour : juin 2026</p>
        {SECTIONS.map((s) => (
          <section key={s.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{s.title}</h2>
            <p className={styles.sectionBody}>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
