# API et événements

Commit `1a9ba71`. Extrait par lecture de `server/index.js` ; non testé.

## Routes HTTP

| Route | Protection | Rôle |
|---|---|---|
| `POST /event` | Jeton | Entrée des hooks (`:1786`) |
| `GET /config`, `GET /roster` | Ouvert sur loopback | Configuration et équipe (`:1718`, `:1732`) |
| `GET /agents`, `GET /agents/:id` | Ouvert sur loopback | Liste et inspecteur (`:2179`, `:2362`) |
| `GET /sessions`, `GET /signals` | Ouvert sur loopback | Sessions et signaux (`:2385`, `:2398`) |
| `GET /settings`, `POST /settings` | UI pour l'écriture | Réglages (`:2414`, `:2418`) |
| `GET /chat`, `POST /chat` | Sans `requireToken` | Chat (`:2045`, `:1972`) |
| `POST /chat/reply`, `/chat/inbox/read`, `/chat/seen`, `/chat/react` | Jeton | Fonctions du chat |
| `POST /chat/typing`, `GET`/`POST /chat/cron-state` | Sans `requireToken` | Indicateurs |
| `POST /chat/video-mode` | Jeton | Mode vidéo (`:2031`) |
| `GET /.well-known/agent-card.json`, `GET /a2a/agents`, `POST /a2a` | Jeton pour `POST` | A2A (`:2527-2554`) |
| Modules montés | Voir chaque module | `mountStatus`, `mountTasks`, `mountPermissions`, `mountRegistry`, `mountHealth` |

Les routes sans jeton s'appuient sur le contrôle d'hôte et d'origine. Une fois exposées sur un VPS, **toutes** exigeraient une véritable authentification.

## Événements WebSocket

| Famille | Types observés |
|---|---|
| Agents | `agent_spawned`, `agent_working`, `agent_completed`, `mcp_call`, `mcp_done` |
| Sessions | `session_started`, `session_ended`, `session_registry`, `session_prompt`, `session_cwd`, `session_model`, `session_turn_end`, `session_needs_you`, `session_error`, `session_compact`, `session_main`, `session_tool_done` |
| Chat | `chat_message`, `chat_seen`, `chat_reaction`, `chat_typing`, `inbox_update` |
| Autres | `signal`, `variant_change` |

La liste peut être incomplète : les événements des modules montés n'ont pas tous été relevés. L'étape 04 n'en dépend pas, car notre protocole est redéfini.

## Modèle de données

- **`Agent`, `AgentState`** : `src/types.ts:5-22`. Les états mêlent activité et mise en scène (`coffee-break`, `new-hire`, `walking-to-manager`).
- **`MainState`** : `working`, `waiting`, `idle`, `needs-you`, `error`, `compacting` (`src/types.ts:102`). Plus proche de ce qu'il nous faut.
- **Table SQL** : une seule, `messages` (`server/chat-db.js:51`).

## Synchronisation

Snapshot à la connexion, puis diffusion à tous les clients (couvert selon `TEST_PLAN.md`, non exécuté).

## Pour notre projet

- Garder le schéma **snapshot + événements**.
- Séparer `AgentState` en deux : **état observé** et **animation visuelle**. Une pause café n'est pas un état observé.
- Ajouter à chaque événement `source`, `confidence` et un identifiant pour l'idempotence.
