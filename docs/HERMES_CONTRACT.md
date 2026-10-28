# Contrat d'intégration Hermes

Version vérifiée : Hermes Agent 0.17.0 (`v2026.6.19`), source locale `/opt/hermes`; captures anonymisées de l'instance de référence dans `packages/hermes-mock/fixtures/`.

Ce document distingue les routes confirmées par le code source des réponses constatées sur l'instance. Les chemins `/p/<profile>/…` ne sont pas des routes Hermes individuelles du serveur dans cette version : l'instance interrogée les a retournés en 404. Ne pas préfixer ces chemins.

## Surfaces et authentification

- API server (port usuel 8642) : `Authorization: Bearer <clé>`. Une clé correspond au profil auquel l'API server est lancé/configuré. Le serveur exposé ne route pas vers les homes Hermes des autres profils via `/p/<profile>/…`.
- Dashboard (port usuel 9119) : API protégée par le middleware du dashboard. Le token de session est accepté selon le mode configuré; l'instance de référence utilisait l'auth basic et établissait une session/cookie via `POST /auth/password-login` (fourni comme constat, non rejoué). Les routes plugin Kanban sont protégées comme le reste de l'API.
- Dans la capture, `/api/profiles` révèle des profils `dev-manager` (tiret) et `x`; ne pas confondre ces noms avec les identifiants SPEC `dev_manager` et `agent_x` sans mapping explicite.

## API server — routes à utiliser

Les routes ci-dessous sont enregistrées dans `/opt/hermes/gateway/platforms/api_server.py` (notamment `connect`, lignes ~4248–4290). Les handlers vérifient le Bearer pour les routes protégées. Les GET sont confirmés par les fixtures indiquées. Les routes de mutation sont documentées par le code/capabilities mais n'ont pas été appelées pendant cette discovery.

| Méthode | Chemin | Résultat / statut | Preuve |
|---|---|---|---|
| GET | `/health` | 200, objet liveness; capture health basic | `api_health_noauth.json` |
| GET | `/health/detailed` | 200, version, état gateway, plateformes, agents actifs, timestamps | `api_health_detailed.json` |
| GET | `/v1/capabilities` | 200, description versionnée des features/endpoints; Bearer requis | `api_capabilities.json` |
| GET | `/v1/models` | confirmé par route/capabilities | `api_models.json` |
| GET | `/v1/skills` | confirmé par route/capabilities | `api_skills.json` |
| GET | `/v1/toolsets` | confirmé par route/capabilities | `api_toolsets.json` |
| GET / POST | `/api/sessions` | liste / création de session; création = mutation | capabilities; aucun POST exécuté |
| GET | `/api/sessions/{session_id}` | ressource session | capabilities |
| GET / PATCH / DELETE | `/api/sessions/{session_id}` | lecture / modification / suppression | capabilities; mutations non exercées |
| GET | `/api/sessions/{session_id}/messages` | historique | capabilities |
| POST | `/api/sessions/{session_id}/chat/stream` | chat SSE de session; route enregistrée | capabilities; non exercé |
| POST | `/api/sessions/{session_id}/chat` | chat non-streaming | capabilities; non exercé |
| POST | `/v1/runs` | soumission d'un run structuré | capabilities; non exercé |
| GET | `/v1/runs/{run_id}` | statut | capabilities; non exercé |
| GET | `/v1/runs/{run_id}/events` | flux SSE d'événements | capabilities; non exercé |
| POST | `/v1/runs/{run_id}/approval` | réponse d'approbation | capabilities; non exercé |
| POST | `/v1/runs/{run_id}/stop` | arrêt de run | capabilities; non exercé |

`GET /v1/capabilities` annonce notamment `X-Hermes-Session-Id` pour la continuité; CORS est configurable, non garanti. Le chemin de chat multi-profil spécifié dans SPEC n'est donc pas confirmé : l'API server sert son agent serveur, pas un sélecteur arbitraire de profil.

### Conversation avec un profil nommé

Aucun endpoint API server observé ne permet de choisir un profil différent pour chaque requête. Le préfixe `/p/<profile>/…` n'est pas supporté dans cette version (constat 404 de l'instance pour `/p/x/health` et `/p/x/v1/capabilities`). Par conséquent, le BFF ne doit pas construire ces URLs ni envoyer des clés de profil différentes en supposant que le serveur commute le runtime.

- Pour le v1, un client API server dédié par profil est autorisé par ADR-002 : démarrer une instance Hermes séparée dans le contexte/configuration du profil, avec un port et une clé dédiés. Ne pas construire `/p/<profile>/…`; sans endpoint + clé propre, afficher le profil en lecture seule. Pour chaque profil activer `API_SERVER_ENABLED=true`, définir `API_SERVER_PORT` (port différent par instance) et `API_SERVER_KEY` dans son `.env`; restreindre l’écoute au réseau privé Crossing. Configurer `HERMES_API_URL_<PROFILE>` et `HERMES_KEY_<PROFILE>` dans Crossing (profil en majuscules, tirets en `_`). Le profil `default` accepte aussi `HERMES_API_URL` et `HERMES_API_KEY`. Voir `docs/adr/ADR-002-profile-api-clients.md`.


## Dashboard API

| Méthode | Chemin | Confirmation |
|---|---|---|
| GET | `/api/status` | 200; version et état global (`dash_status.json`) |
| GET | `/api/profiles` | 200; tableau `profiles` avec `name`, `model`, `provider`, `gateway_running`, `skill_count`, `description`, `is_default` (`dash_profiles.json`) |
| GET | `/api/plugins/kanban/board?board=<id>` | 200; `columns[]`, chaque colonne a `name` et `tasks[]` (`dash_kanban_board.json`) |
| GET | `/api/plugins/kanban/workers/active?board=<id>` | 200; `{workers:[],count,checked_at}` (`dash_kanban_workers_active.json`) |
| GET | `/api/plugins/kanban/inspect` | 404 constaté; ne pas utiliser. Utiliser `workers/active` (`dash_kanban_inspect.json`) |
| GET | `/api/analytics/usage?days=…` | confirmé sur instance; réponse dans `dash_analytics_usage.json` |
| GET | `/api/plugins/kanban/config` | confirmé sur instance; `dash_kanban_config.json` |
| GET | `/api/auth/me` | capture d'auth (`dash_auth_me.json`) |

L'instance confirme la sélection des boards via paramètre `board` pour le board et workers. Les endpoints d'écriture Kanban (POST/PATCH/commentaires) et le WebSocket d'événements n'ont pas été exercés en lecture seule; vérifier leur contrat de payload/auth avant développement. `POST /auth/password-login` est le flux d'auth basic indiqué par Isaac, mais interdit durant cette discovery GET-only.

## Limites et sécurité des fixtures

Les réponses proviennent de captures fournies par Isaac, annoncées anonymisées; elles sont conservées comme JSON avec noms de fichiers reflétant la requête. Elles ne contiennent pas de secrets d'auth volontairement. Les fixtures sont des exemples datés d'une instance, pas un schéma exhaustif ni une garantie de stabilité inter-version. Toujours filtrer/assainir les réponses avant ajout au dépôt.

Aucun appel réseau au serveur réel n'a été effectué durant cette reprise, conformément à la consigne. Les lectures de code source ont porté sur `/opt/hermes`; aucun fichier de ce répertoire n'a été modifié.
