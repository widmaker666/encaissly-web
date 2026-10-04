// Contenu légal d'Encaissly — fichier IDENTIQUE dans encaissly-web/src/constants/legal.ts
// et encaissly-mobile/constants/legal.ts : toute modification doit être reportée
// dans les deux (puis mettre à jour LEGAL_UPDATED_AT).

export const LEGAL_UPDATED_AT = "4 octobre 2026";

export const EDITEUR = {
  nom: "Alexandre Hontcharouk",
  statut: "Entrepreneur individuel (EI) — micro-entreprise",
  siret: "980 542 377 00034",
  adresse: "425 cours Émile Zola, 69100 Villeurbanne, France",
  email: "contact.encaissly@gmail.com",
};

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalPart {
  id: string;
  title: string;
  intro?: string;
  sections: LegalSection[];
}

export const LEGAL_PARTS: LegalPart[] = [
  {
    id: "mentions",
    title: "Mentions légales",
    sections: [
      {
        title: "Éditeur",
        body: `Le site encaissly-web.vercel.app et l'application mobile Encaissly sont édités par :\n${EDITEUR.nom}\n${EDITEUR.statut}\nSIRET : ${EDITEUR.siret}\nAdresse : ${EDITEUR.adresse}\nEmail : ${EDITEUR.email}\nTVA non applicable, article 293 B du Code général des impôts.\n\nDirecteur de la publication : ${EDITEUR.nom}.`,
      },
      {
        title: "Hébergement",
        body: "• Site web : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com\n• Serveur de l'application (API) : Railway Corporation, 548 Market St PMB 68956, San Francisco, CA 94104, États-Unis — railway.com\n• Base de données : Neon (neon.tech), serveurs situés dans l'Union européenne (Francfort, Allemagne).",
      },
      {
        title: "Propriété intellectuelle",
        body: "Le nom Encaissly, le logo, l'interface, les textes et le code de l'application sont la propriété de l'éditeur. Toute reproduction sans autorisation est interdite. Les contenus que vous ajoutez (photos, noms d'articles, etc.) restent votre propriété : vous nous autorisez seulement à les stocker et les afficher pour faire fonctionner le service.",
      },
    ],
  },
  {
    id: "cgu",
    title: "Conditions générales d'utilisation (CGU)",
    intro: "Les présentes CGU encadrent l'utilisation d'Encaissly, sur le site comme dans l'application. La création d'un compte vaut acceptation de ces CGU.",
    sections: [
      {
        title: "1. Le service",
        body: "Encaissly est un outil de caisse et de suivi pour les boutiques de créateurs et les créatrices : enregistrement des ventes, calcul des commissions, statistiques, exports. Le service est accessible gratuitement (plan FREE) ou avec un abonnement payant (PRO ou DUO, voir les CGV).\n\nEncaissly est en phase de test : des fonctionnalités peuvent évoluer, et des interruptions ponctuelles peuvent survenir.",
      },
      {
        title: "2. Compte",
        body: "Pour utiliser Encaissly, vous devez avoir 18 ans ou plus et créer un compte avec une adresse email valide (ou via Google). Vous êtes responsable de la confidentialité de votre mot de passe et de l'exactitude des informations saisies.\n\nVous pouvez supprimer votre compte à tout moment depuis l'onglet Profil.",
      },
      {
        title: "3. Utilisation acceptable",
        body: "Vous vous engagez à ne pas :\n• utiliser le service pour une activité illégale ou frauduleuse ;\n• saisir des données de personnes sans y être autorisé ;\n• tenter d'accéder aux données d'autres utilisateurs ou de perturber le service.\n\nEn cas de manquement grave, l'éditeur peut suspendre le compte concerné après vous en avoir informé, sauf urgence.",
      },
      {
        title: "4. Données des créatrices saisies par une gérante",
        body: "Lorsqu'une gérante enregistre une créatrice (nom, email, téléphone, taux de commission, ventes), elle est responsable de ces données au sens du RGPD et doit en informer la créatrice. Encaissly agit alors comme sous-traitant : ces données sont uniquement stockées et traitées pour le compte de la gérante, de manière sécurisée, et ne sont jamais utilisées à d'autres fins.",
      },
      {
        title: "5. Responsabilité",
        body: "Encaissly est un outil d'aide à la gestion : il ne remplace ni un logiciel de comptabilité certifié ni un expert-comptable. Vous restez responsable de vos déclarations fiscales et sociales et de la vérification des montants. L'éditeur met tout en œuvre pour assurer la disponibilité et la fiabilité du service, sans pouvoir garantir l'absence totale d'erreur ou d'interruption. Nous vous conseillons d'exporter régulièrement vos données.",
      },
      {
        title: "6. Modification des CGU",
        body: "Les CGU peuvent évoluer. En cas de changement important, vous serez prévenu par email ou dans l'application au moins 15 jours avant son entrée en vigueur. Si vous n'êtes pas d'accord, vous pouvez supprimer votre compte.",
      },
    ],
  },
  {
    id: "cgv",
    title: "Conditions générales de vente (CGV)",
    intro: "Les présentes CGV s'appliquent aux abonnements payants souscrits sur Encaissly, par des professionnels comme par des particuliers (consommateurs).",
    sections: [
      {
        title: "1. Offres et prix",
        body: "• PRO : 9 € par mois ou 79 € par an\n• DUO (gérante + créatrice) : 15 € par mois ou 129 € par an\n\nPrix en euros, TVA non applicable (article 293 B du CGI). Le détail des fonctionnalités de chaque offre est affiché dans l'onglet Profil avant la souscription. Le plan FREE reste gratuit et sans engagement.",
      },
      {
        title: "2. Souscription et paiement",
        body: "L'abonnement est souscrit depuis l'onglet Profil. Le paiement se fait par carte bancaire via Stripe, prestataire de paiement sécurisé : Encaissly n'a jamais accès à vos coordonnées bancaires. Le premier prélèvement a lieu à la souscription, puis à chaque échéance (mensuelle ou annuelle).",
      },
      {
        title: "3. Durée et renouvellement",
        body: "L'abonnement est sans engagement de durée minimale et se renouvelle automatiquement à chaque échéance, jusqu'à résiliation. Pour un abonnement annuel, vous serez prévenu par email avant son renouvellement.\n\nEn cas de modification des prix, vous serez informé au moins 30 jours avant l'échéance concernée et pourrez résilier avant qu'elle ne s'applique.",
      },
      {
        title: "4. Résiliation",
        body: "Vous pouvez résilier à tout moment, en quelques clics, depuis l'onglet Profil (« Résilier l'abonnement »). La résiliation prend effet à la fin de la période déjà payée : vous gardez l'accès aux fonctionnalités payantes jusqu'à cette date, puis votre compte repasse automatiquement en plan FREE. Aucun nouveau prélèvement n'est effectué.\n\nLa période en cours n'est pas remboursée au prorata, sauf exercice du droit de rétractation (article 5) ou disposition légale contraire.",
      },
      {
        title: "5. Droit de rétractation (particuliers)",
        body: "Si vous êtes un consommateur, vous disposez d'un délai de 14 jours à compter de la souscription pour vous rétracter, sans avoir à vous justifier (articles L.221-18 et suivants du Code de la consommation).\n\nEn souscrivant, vous demandez expressément à accéder immédiatement aux fonctionnalités payantes. En cas de rétractation, vous serez remboursé sous 14 jours, par le même moyen de paiement, déduction faite d'un montant proportionnel à la période déjà utilisée (article L.221-25).\n\nPour vous rétracter, envoyez une déclaration claire à ${EDITEUR.email}, par exemple :\n« Je vous notifie par la présente ma rétractation du contrat d'abonnement Encaissly souscrit le [date], avec l'adresse email [email du compte]. »",
      },
      {
        title: "6. Réclamations et litiges",
        body: `Pour toute réclamation, écrivez à ${EDITEUR.email} : nous répondons sous 15 jours. Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents sont ceux prévus par la loi ; un consommateur peut saisir la juridiction de son lieu de domicile.`,
      },
    ],
  },
  {
    id: "confidentialite",
    title: "Politique de confidentialité",
    intro: "Cette politique explique quelles données personnelles Encaissly traite, pourquoi, combien de temps, et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.",
    sections: [
      {
        title: "1. Responsable du traitement",
        body: `${EDITEUR.nom} (${EDITEUR.statut}), ${EDITEUR.adresse}.\nContact pour toute question sur vos données : ${EDITEUR.email}.\n\nPour les données des créatrices saisies par une gérante, la gérante est responsable du traitement et Encaissly est sous-traitant (voir CGU, article 4).`,
      },
      {
        title: "2. Données traitées",
        body: "• Compte : email, mot de passe (chiffré, jamais lisible), prénom et nom (facultatifs), photo de profil (facultative), rôle et plan, date d'acceptation des CGU.\n• Connexion Google (si vous l'utilisez) : email et nom transmis par Google.\n• Activité : boutiques, événements, articles (avec photos éventuelles), ventes (article, prix, quantité, mode de paiement, date), commissions.\n• Créatrices : nom, email et téléphone (facultatifs), taux de commission.\n• Abonnement : identifiant client Stripe et historique de facturation (vos données de carte sont gérées uniquement par Stripe).\n• Notifications : messages liés à votre activité, préférence d'emails.\n\nNous ne collectons aucune donnée de localisation, aucun contact du téléphone et ne faisons aucun suivi publicitaire.",
      },
      {
        title: "3. Pourquoi et sur quelle base légale",
        body: "• Fournir le service (compte, ventes, commissions, statistiques, exports) : exécution du contrat (CGU).\n• Gérer l'abonnement et la facturation : exécution du contrat, et obligation légale pour la conservation des factures.\n• Envoyer les emails liés au service (invitation, mot de passe oublié, notifications) : exécution du contrat ; les emails de notification sont désactivables dans le Profil.\n• Sécuriser le service et prévenir les abus : intérêt légitime.\n\nVos données ne sont jamais vendues ni utilisées à des fins publicitaires.",
      },
      {
        title: "4. Destinataires et prestataires",
        body: "Vos données sont accessibles uniquement à l'éditeur et, pour les données partagées (ventes, commissions), à la gérante ou à la créatrice concernée. Elles sont hébergées ou traitées par des prestataires techniques qui agissent sur nos instructions :\n• Neon — base de données (Union européenne)\n• Railway — serveur de l'application (États-Unis)\n• Vercel — hébergement du site web (États-Unis)\n• Cloudinary — stockage des photos (États-Unis)\n• Stripe — paiement des abonnements (Irlande / États-Unis)\n• Google — connexion avec Google (États-Unis)\n• Resend — envoi des emails (États-Unis)\n• Expo — distribution et mises à jour de l'application mobile (États-Unis)",
      },
      {
        title: "5. Transferts hors de l'Union européenne",
        body: "Certains prestataires sont situés aux États-Unis. Ces transferts sont encadrés par le Data Privacy Framework UE–États-Unis lorsque le prestataire y est certifié, et à défaut par les clauses contractuelles types de la Commission européenne. Vous pouvez en demander le détail à l'adresse de contact.",
      },
      {
        title: "6. Durées de conservation",
        body: "• Compte : tant qu'il est actif. À la suppression du compte, vos données d'identification (email, nom, mot de passe, photo) sont effacées immédiatement et vos notifications supprimées.\n• Ventes, fiches créatrices et boutiques : elles font partie de la comptabilité de la boutique et sont conservées tant que le compte de la gérante existe ; après suppression de votre compte, elles ne sont plus rattachées à votre identité.\n• Factures d'abonnement : 10 ans (obligation comptable, article L.123-22 du Code de commerce), chez Stripe.",
      },
      {
        title: "7. Sécurité",
        body: "Mots de passe chiffrés (bcrypt), communications chiffrées (HTTPS/TLS), accès aux données limité à chaque compte, paiements délégués à Stripe (certifié PCI-DSS). En cas de violation de données présentant un risque pour vous, vous serez informé dans les conditions prévues par le RGPD.",
      },
      {
        title: "8. Cookies et stockage local",
        body: "Encaissly n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Seul un stockage technique, strictement nécessaire, est utilisé sur votre appareil pour garder votre session ouverte et mémoriser vos préférences d'affichage : il ne nécessite pas de consentement.",
      },
      {
        title: "9. Vos droits",
        body: `Vous disposez des droits suivants sur vos données :\n• Accès et copie\n• Rectification (directement dans le Profil)\n• Effacement (bouton « Supprimer mon compte » dans le Profil)\n• Limitation et opposition au traitement\n• Portabilité (exports CSV, Excel et PDF de vos ventes, ou copie complète sur demande)\n• Directives sur le sort de vos données après votre décès\n\nPour exercer ces droits, écrivez à ${EDITEUR.email}. Nous répondons sous un mois maximum. Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).`,
      },
      {
        title: "10. Modifications",
        body: "Cette politique peut être mise à jour. La date de dernière mise à jour figure en haut de cette page ; en cas de changement important, vous serez prévenu par email ou dans l'application.",
      },
    ],
  },
];
