# États visuels des personnages

Code : `src/characters/visualState.ts`, fonctions pures sans dépendance au moteur ni à l'API. Le moteur reçoit un état et l'affiche : **il ne sait rien de Hermes.**

## Ordre de décision

Du plus sûr au moins sûr. La première règle applicable l'emporte.

| # | Condition | Animation | Fiabilité |
|---|---|---|---|
| 1 | Connexion au serveur perdue | `unknown` | Inconnu |
| 2 | Aucun agent associé | `unbound` | Confirmé |
| 3 | Découverte impossible | `unknown` | Inconnu |
| 4 | Agent injoignable ou introuvable | `unavailable` | Confirmé |
| 5 | Run actif, silencieux depuis plus de 10 min | `unknown` | Inconnu |
| 6 | Run actif | Voir la table des runs | Confirmé |
| 7 | État général lisible | Voir la table de l'état général | Déduit |
| 8 | Aucune donnée | `unknown` | Inconnu |

## Correspondance : événements de run

| Événement Hermes | Animation |
|---|---|
| `reasoning.available` | `think` |
| `tool.started`, `tool.completed` | `work` |
| `approval.request` | `waiting` |
| `approval.responded` | `work` |
| `run.completed`, `run.failed`, `run.cancelled` | Fin du run : retour à l'état général |

## Correspondance : état général

Source : `active_agents` et `gateway_state` de `/health/detailed`. **Toujours déduit**, avec la règle affichée.

| État | Animation |
|---|---|
| `idle` | `idle` |
| `working` | `work` |
| `unknown` | `unknown` |
| `unavailable` | `unavailable` |

## Rendu

| Animation | Rendu | Animé ? |
|---|---|---|
| `idle` | Respiration | Oui |
| `work` | Frappe | Oui |
| `think` | Main au menton, bulle `…` | Oui |
| `walk` | Marche | Oui, déplacement local uniquement |
| `waiting` | Pose figée, bulle `!` | **Non** |
| `unknown` | Pose figée, bulle `?` | **Non** |
| `unavailable` | Pose figée, bulle `✕` | **Non** |
| `unbound` | Pose figée, sans bulle | **Non** |

**`idle` contient une respiration.** C'est une animation décorative : elle n'est jamais une preuve d'activité, et le panneau de debug indique sa source.

## Stabilité

- Une animation reste affichée au moins **1,5 s**, pour éviter le clignotement.
- **Exception :** `unknown`, `unavailable`, `waiting` et `unbound` s'affichent aussitôt. Retarder un problème ou une demande serait trompeur.

## Événements tardifs

- Après la fin d'un run, ses événements sont ignorés : ils ne le rouvrent pas.
- Un événement plus ancien que le dernier connu ne change rien.
- La fin d'un autre run n'interrompt pas le run en cours.

## Ce qui ne déclenche jamais d'animation

- Un délai ou le temps qui passe.
- Une tâche locale.
- Une activité Telegram déduite des compteurs de session : elle est au journal, mais elle ne dit pas ce que fait l'agent maintenant. C'est `active_agents` qui peut alors donner `work`.

## Déplacements

Seul le visiteur se déplace, sur action de l'utilisateur. Un événement Hermes ne fait marcher personne.

## Panneau de debug

L'onglet **États** affiche pour chaque personnage l'animation, la fiabilité, la source et la règle.
