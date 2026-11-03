# Audit des capacités de Hermes

**Version installée, selon l'opérateur :** Hermes Agent v0.17.0, build 2026.6.19, commit `2bd1977d`.

## Portée réelle de cet audit

| Source | Statut |
|---|---|
| Code source de `NousResearch/hermes-agent` au commit `2bd1977d8fad185c9b4be47884f7e87f1add0ce3` | **Lu.** Le commit porte bien le message `chore: release v0.17.0 (2026.6.19)` |
| Instance déployée sur le VPS | **Non vue.** Aucun accès depuis cet environnement |
| Exécution de Hermes | **Non faite.** Code lu, jamais lancé |

Tout ce qui suit décrit donc **le code de cette version, pas ton instance**. Sa configuration peut changer le résultat. Pour le vérifier, lance sur le VPS, pour chaque profil, le contrôle en lecture seule :

```bash
HERMES_URL=http://hôte:8642 HERMES_KEY=... npx tsx tools/hermes-probe.ts
```

Il n'exécute aucune action et n'affiche ni la clé, ni le contenu des conversations.

## Ports

| Port | Rôle dans le source | Utilisation ici |
|---|---|---|
| 8642 | Serveur API de la gateway (`gateway/platforms/api_server.py:89`). **Démarrage refusé sans `API_SERVER_KEY`** (`:4306`) | **Oui**, côté backend uniquement |
| 9119 | Dashboard d'administration, qui gère le `.env` selon sa documentation | **Non** |

**Le rôle réel de ces ports sur ton VPS reste à confirmer** avec le contrôle ci-dessus.

## Matrice des capacités

Références : `gateway/platforms/api_server.py`.

| Capacité | Route | Auth | Lecture ou action | Statut |
|---|---|---|---|---|
| Santé | `GET /health` (`:1093`) | Non | Lecture | Source lu |
| Santé détaillée, `active_agents` | `GET /health/detailed` (`:1099`) | **Non** | Lecture | Source lu |
| Capacités déclarées | `GET /v1/capabilities` (`:1142`) | Bearer | Lecture | Source lu |
| Liste des sessions, **toutes surfaces** | `GET /api/sessions` (`:1378`) | Bearer | Lecture | Source lu |
| Détail et messages | `GET /api/sessions/{id}`, `/messages` | Bearer | Lecture | Source lu |
| Créer une session | `POST /api/sessions` (`:1407`) | Bearer | **Action** | Source lu |
| Lancer un agent | `POST /v1/runs` (`:3710`) | Bearer | **Action : outils réels** | Source lu |
| État d'un run | `GET /v1/runs/{id}` (`:4006`) | Bearer | Lecture | Source lu |
| Événements d'un run | `GET /v1/runs/{id}/events` (`:4021`) | Bearer | Lecture | Source lu |
| Arrêter un run | `POST /v1/runs/{id}/stop` (`:4159`) | Bearer | **Action** | Source lu |
| Répondre à une approbation | `POST /v1/runs/{id}/approval` (`:4071`) | Bearer | **Action** | Source lu |
| Tâches planifiées | `GET /api/jobs` (`:3161`) | Bearer | Lecture | Source lu |
| Découverte des profils | **Aucune route** | — | — | **Indisponible** |
| Créer ou supprimer un profil | **Aucune route** | — | — | **Indisponible** |
| Flux global d'activité | **Aucune route** | — | — | **Indisponible** |

Le connecteur n'utilise pas les routes d'écriture des tâches planifiées, ni `DELETE`/`PATCH` sur les sessions, ni `/fork`.

## Ce que le source a changé dans le projet

La documentation web lue à l'étape 00 décrit une version plus récente. Sur cette version, plusieurs affirmations sont **fausses**.

### 1. Protection des sessions : absente dans cette version

La documentation annonçait un refus HTTP 409 pour une session d'une autre surface. **Ce contrôle n'existe pas dans `_handle_session_chat`** (`:1560`), et `permission_denied` n'apparaît pas dans le fichier. En v0.17, l'API pourrait donc écrire dans une conversation Telegram.

**Décision :** l'application refuse elle-même d'écrire dans une session dont la source n'est pas `api_server`.

### 2. Un run ne recharge pas l'historique

`session_id` ne recharge rien dans `_handle_runs` : l'historique n'est repris que depuis `conversation_history` ou `previous_response_id` (`:3748-3770`). **Le backend doit donc l'envoyer**, sinon l'agent perd le fil. Seuls `role` et `content` passent : le détail des appels d'outils passés n'est pas transmis.

### 3. Pas de `clarify` ni de `resolve-unknown`

Ces routes de la documentation n'existent pas ici. Elles ne sont pas utilisées.

### 4. Identifier un profil

Hors profil `default`, le champ `model` vaut le nom du profil (`:806-816`), ce qui permet de vérifier qu'une URL mène bien au bon profil.

## Le choix pour le chat : les runs

| Critère | `/v1/runs` | `/api/sessions/{id}/chat/stream` |
|---|---|---|
| Arrêt réel | **Oui** (`/stop`) | Non, seulement couper la connexion |
| Approbations | **Oui** (`approval.request`) | **Non** : aucun canal de notification n'est enregistré |
| État consultable après coupure | **Oui** (`GET /v1/runs/{id}`) | Non |
| Historique rechargé | Non, à fournir | Oui |

Les runs l'emportent, car l'arrêt et les approbations touchent à la sécurité.

**Limite à connaître :** les états de run sont en mémoire (`_run_statuses`). Un redémarrage de Hermes les perd. Une seule lecture du flux est possible par run, car la file est retirée à la fin de la lecture (`:4064`), et un run peut donc perdre des événements après une coupure : son état final reste lisible, tant que Hermes n'a pas redémarré.

## Voir l'activité hors du bureau (Q7)

**C'est faisable, en partie, sans flux global :**

| Donnée | Source | Ce qu'elle prouve |
|---|---|---|
| `source`, `last_active`, `message_count`, `tool_call_count` | `GET /api/sessions` | Une conversation Telegram, CLI ou cron a avancé |
| `active_agents` | `GET /health/detailed` | Un agent tourne, sans dire quoi ni où |
| `last_status`, `last_run_at` | `GET /api/jobs` | État d'une tâche planifiée |

**Il faut interroger régulièrement** : l'activité apparaît avec du retard, et rien n'indique l'outil en cours d'exécution. Le risque R1 passe donc de « bloquant » à « accepté, avec une visibilité partielle ».

## Profils

- Un profil est un répertoire Hermes (`HERMES_HOME`), et il a sa propre gateway par défaut.
- `HERMES_HOME=/opt/data` correspond probablement au profil `default`. Les profils nommés sont alors sous `/opt/data/profiles/<nom>/`.
- Le multiplexage (`gateway.multiplex_profiles`, désactivé par défaut) sert les profils sous `/p/<nom>/`. **Le source de `api_server.py` ne mentionne pas ce préfixe**, et seule la documentation du dépôt le décrit. Il est à vérifier s'il est activé chez toi.

**Conséquence : la liste des profils est une configuration déclarée**, avec une URL et une clé par profil. Un profil n'est affiché comme joignable que s'il répond.

## Points à vérifier sur l'instance

1. Les profils `jarvis` et `veilleur` ont-ils leur serveur API activé, avec leur propre port et leur propre clé ?
2. Quel est leur nom exact ?
3. Le multiplexage est-il activé ?
4. `active_agents` se met-il bien à jour pendant une conversation Telegram ?
5. Comment se comporte l'historique reconstruit : y a-t-il des doublons dans les messages enregistrés ? Le source indique une déduplication (`run_agent.py:1568`), mais c'est à observer.
