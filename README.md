# Encaissly — version web

Version PC/navigateur d'Encaissly. Tape sur le même backend (`boutique-backend`) et la même base que l'appli mobile — ce n'est pas un produit séparé, juste une autre porte d'entrée (grand écran pour la gérante, et la seule façon pour une testeuse sur iPhone d'essayer l'appli sans compte développeur Apple).

Voir le plan complet : `../.claude/plans/robust-splashing-bubble.md` (côté `encaissly-mobile`).

## Démarrer

```bash
npm install
cp .env.example .env   # ajuster VITE_API_URL si besoin (prod par défaut)
npm run dev
```

## Stack

Vite + React 19 + TypeScript, React Router 7, TanStack Query 5, Zustand 5 (+ `persist`), axios, CSS Modules.

## Structure

```
src/
├── main.tsx, router.tsx    routes + garde de connexion
├── layouts/                menu latéral + zone de contenu
├── lib/                    base commune : money.ts, date.ts, access.ts, errors.ts
├── pages/                  un fichier par écran
├── services/api.ts         tous les appels API
├── stores/auth.store.ts    session (Zustand + persist localStorage)
└── styles/theme.css        couleurs et polices (#7a41bb, Now + Urbanist)
```

`lib/` existe pour ne pas reproduire les divergences du mobile (plusieurs versions du formatage de montant/dates, du calcul de rôle DUO...) — toute nouvelle page doit passer par ces fonctions plutôt que recoder localement.
