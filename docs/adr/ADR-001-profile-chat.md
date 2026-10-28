# ADR-001 — Chat avec un profil Hermes nommé

- Statut : remplacé par ADR-002, accepté par Isaac (2026-10-28)
- Date : 2026-10-28
- Contexte : SPEC §5.2 suppose que l'API server accepte `/p/<profile>/…` et qu'une clé par profil sélectionne ce profil. Le code Hermes 0.17.0 (`v2026.6.19`) en `/opt/hermes/gateway/platforms/api_server.py` enregistre des routes standard (`/health`, `/v1/capabilities`, `/api/sessions`, etc.) sans préfixe profil. Les captures de l'instance donnent 404 pour `/p/x/health` et `/p/x/v1/capabilities`. Le dashboard expose toutefois `/api/profiles` et son champ `gateway_running`.
- Décision proposée : ne pas déclarer de chat possible pour tous les profils via une clé distincte sur un seul API server. L'adapter expose pour l'instant le chat seulement pour la cible effectivement desservie par l'API server; les autres profils sont en lecture seule via Dashboard.
- Option ultérieure à étudier : un endpoint/API server isolé et authentifié par profil, ou une API explicitement profile-aware livrée par Hermes. Aucune option n'est ici présumée disponible; tester l'isolation de runtime, sessions et permissions avant de la choisir.
- Conséquences : modification de l'hypothèse multi-profil et des modèles de configuration (SPEC §5.1/§7.1 à réconcilier); risque de ne pas satisfaire le chat de tous les agents. Gate : approbation du reviewer et décision de `dev_manager` avant de construire cette partie.
- Preuves : `api_server.py` route registration ~4248–4288 et handler capabilities ~1142; captures `api_profile_x_health.json`, `api_profile_x_capabilities.json`, `dash_profiles.json`.
