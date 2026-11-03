# Contrat de l'API Hermes utilisée

Version : v0.17.0, commit `2bd1977d`. Établi par **lecture du source**, à confirmer sur l'instance. Les tests de contrat s'exécutent contre `tests/fixtures/fakeHermes.ts`, écrit à partir de ce source : ils prouvent la cohérence avec ce qui a été lu, **pas** avec un vrai Hermes.

Authentification : `Authorization: Bearer <API_SERVER_KEY>`.

## Lectures

| Méthode | Route | Réponse utile | Erreurs |
|---|---|---|---|
| GET | `/health` | `{status, platform, version}` | — |
| GET | `/health/detailed` | `{status, version, gateway_state, active_agents, updated_at}` | — |
| GET | `/v1/capabilities` | `{model, features, endpoints}` | 401 |
| GET | `/api/sessions?limit&offset` | `{data: Session[], has_more}`, limite 200 | 401, 503 |
| GET | `/api/sessions/{id}` | `{session}` | 401, 404 |
| GET | `/api/sessions/{id}/messages` | `{data: Message[]}` | 401, 404 |
| GET | `/v1/runs/{id}` | `{run_id, status, output?, error?}` | 401, 404 |
| GET | `/v1/runs/{id}/events` | Flux SSE | 401, 404 |
| GET | `/api/jobs?include_disabled` | `{jobs: Job[]}` | 401, 501 |

## Actions réelles

**Ces appels ont un effet sur Hermes.**

| Méthode | Route | Corps | Effet | Réponse | Erreurs |
|---|---|---|---|---|---|
| POST | `/api/sessions` | `{title?}` | Crée une ligne de session | 201 `{session}` | 401, 400, 409 |
| POST | `/v1/runs` | `{input, session_id, conversation_history?}` | **Lance l'agent, avec de vrais outils** | 202 `{run_id, status}` | 401, 400, 429 |
| POST | `/v1/runs/{id}/stop` | `{}` | Interrompt l'agent | 200 | 401, 404 |
| POST | `/v1/runs/{id}/approval` | `{choice}` | Autorise ou refuse une commande | 200 | 400, 401, 404, 409 |

Hermes accepte `once`, `session`, `always` et `deny`. **Le backend n'envoie que `once` et `deny`** : une autorisation durable ne se donne pas depuis un bouton.

## Limites

- 10 runs simultanés, puis HTTP 429 (`_MAX_CONCURRENT_RUNS`).
- Flux orphelins nettoyés après 300 s (`_RUN_STREAM_TTL`). Une approbation laissée sans réponse pourrait donc être abandonnée au bout de ce délai. C'est une déduction du source, non observée.

## Événements d'un run

Format : `data: {json}\n\n`, sans ligne `event:`, plus des commentaires `: keepalive`.

| `event` | Champs | Traitement |
|---|---|---|
| `message.delta` | `delta` | Texte de la réponse |
| `tool.started` | `tool`, `preview` | Outil en cours |
| `tool.completed` | `tool`, `duration`, `error` | Fin d'outil |
| `reasoning.available` | `text` | Signale une réflexion. **Le texte n'est pas conservé** |
| `approval.request` | `command`, `description`, `choices` | Demande de décision |
| `approval.responded` | `choice`, `resolved` | Décision prise |
| `run.completed` | `output`, `usage` | Fin |
| `run.failed` | `error` | Échec |
| `run.cancelled` | — | Annulation |

Tout autre type est ignoré. Les événements des sous-agents ne sont pas transmis par Hermes (`:3706`).

## Statuts d'un run

`queued`, `running`, `waiting_for_approval`, `stopping`, `completed`, `failed`, `cancelled`. Toute autre valeur devient `unknown`.
