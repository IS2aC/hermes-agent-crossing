# Hermes Agent Crossing

## Développement

Prérequis : Node.js 22 et Corepack. Depuis la racine :

```sh
corepack pnpm install
corepack pnpm dev
```

Le front Vite est disponible sur http://localhost:5173, le serveur sur http://localhost:8080/healthz et les services simulés sur les ports 8642 (API Hermes) et 9119 (Dashboard).

Pour lancer la stack Docker de développement :

```sh
docker compose -f docker-compose.dev.yml up --build
```

`CROSSING_ADMIN_PASSWORD_HASH` et `CROSSING_SESSION_SECRET` doivent être configurés hors environnement de développement. Les valeurs de dev compose sont exclusivement locales et ne doivent pas être utilisées en production.
