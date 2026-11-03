# Modèle d'événement

Type : `ActivityEvent`, dans `src/domain/activity.ts`.

| Champ | Rôle |
|---|---|
| `id` | Clé d'idempotence, stable pour un même fait |
| `provenance` | `hermes`, `application` ou `simulation` |
| `confidence` | `confirmed`, `inferred` avec sa règle, ou `unknown` |
| `occurredAt` | Date du fait, à défaut date d'observation |
| `type` | Type d'origine, sans réinterprétation |
| `agentId`, `sessionId`, `runId` | Rattachement, si connu. `runId` porte aussi l'identifiant d'une tâche pour les événements `task.*` |
| `summary` | Résumé sans contenu sensible |

## Identifiants

| Source | Forme | Effet |
|---|---|---|
| Run | `run:<runId>:<seq>` | Stable tant que le run existe |
| Session observée | `session:<agent>:<id>:<compteurs>` | Un seul événement par état observé |
| Tâche planifiée | `job:<agent>:<id>:<date>:<statut>` | Un seul par exécution |
| Tâche locale | `task:<id>:<type>:<date>:<aléa>` | Chaque changement compte |
| Observation | `observer:<agent>:<état>:<date>` | Début et fin de panne |

## Idempotence, à trois niveaux

1. **Bus :** mémoire des 5 000 derniers identifiants.
2. **Base :** `ON CONFLICT (id) DO NOTHING`, qui tient même après un redémarrage.
3. **Navigateur :** fusion par identifiant, utile après une reconnexion.

## Ordre et reconnexion

- Tri par `occurredAt`, puis `id` : un événement tardif se range à sa place.
- À chaque reconnexion, le navigateur recharge la dernière page et fusionne.
- Pagination par date, 200 événements au plus par page.

**Limite :** deux événements de même date peuvent être coupés par la pagination (`occurred_at < before`). Le risque est faible, car les dates sont à la milliseconde, mais il existe.

## Suivi perdu

Après un redémarrage du backend, le suivi de l'observation repart de zéro. La première lecture redevient une référence : **l'activité survenue pendant l'arrêt n'apparaît pas**.
