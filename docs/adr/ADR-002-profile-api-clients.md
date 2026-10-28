# ADR-002 — Clients API Hermes séparés par profil

- Statut : accepté par Isaac (propriétaire produit), 2026-10-28.
- Contexte : Hermes 0.17.0 ne prend pas en charge le routage `/p/<profile>/…` sur une instance API server. L’ADR-001 proposait par conséquent de réserver le chat à un seul agent.
- Décision : Crossing construit un client API indépendant pour chaque profil possédant une URL et une clé dédiées. Le profil `default` peut utiliser `HERMES_API_URL` et `HERMES_API_KEY`; les autres utilisent `HERMES_API_URL_<PROFILE>` et `HERMES_KEY_<PROFILE>`, où le profil est en majuscules et les tirets remplacés par `_`. Une clé n’est jamais utilisée avec une URL partagée pour changer de runtime.
- Mode dégradé : sans URL et clé toutes deux configurées, un agent est affiché en lecture seule, avec un motif explicatif. Les données de profil/modèle/état restent issues du Dashboard. La création de tâches Kanban demeure disponible indépendamment de l’accès chat.
- Détection : chaque endpoint configuré est contrôlé séparément par `GET /health` puis `GET /v1/capabilities`. En cas d’échec de health (incluant auth), l’agent n’est pas interactif. L’échec capabilities ne masque pas les autres capacités du profil.
- Mock : doit présenter deux endpoints API indépendants (default et un profil secondaire), ainsi qu’un profil Dashboard sans API.
- Documentation : activer un serveur Hermes par profil avec `API_SERVER_ENABLED=true`, `API_SERVER_PORT` et `API_SERVER_KEY` dans le `.env` de ce profil; exposer le port uniquement sur le réseau privé Crossing.
- Conséquences : davantage d’instances/ports et de secrets à gérer; isolation de runtime explicite. Ce choix remplace la décision proposée dans ADR-001.
