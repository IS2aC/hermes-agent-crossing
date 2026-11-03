# Tâches et activité

Deux domaines volontairement séparés.

| | Tâches locales | Activité observée |
|---|---|---|
| Origine | Créées ici | Hermes, l'application ou une simulation |
| Onglet | Tâches | Activité |
| Modifiable | Oui | Non |
| Lien avec un agent | Assignation visuelle à un personnage. **Aucun ordre n'est transmis** | Vient de l'agent |

Une activité n'est **jamais** transformée en tâche terminée. Une tâche locale terminée ne dit rien de l'état d'un agent.

## Ce que l'on voit de chaque surface

| Surface | Comment | Détail | Délai | Fiabilité |
|---|---|---|---|---|
| Chat de cette application | Flux du run | Outils, réflexion, autorisations | Direct | Confirmé |
| Telegram, CLI, autres | Relecture de `/api/sessions` | Nombre de messages et d'appels d'outils | 15 s au plus | **Déduit**, avec sa règle |
| Tâches planifiées | Relecture de `/api/jobs` | Résultat de la dernière exécution | 15 s au plus | Confirmé |

**Ce que l'on ne voit pas :** l'outil en cours d'exécution hors du chat de l'application, ni l'activité survenue pendant que l'application était arrêtée, ni le contenu des conversations d'autres surfaces dans le journal.

## Règles d'affichage

- Chaque ligne affiche sa source, et sa fiabilité si elle n'est pas confirmée.
- La première lecture sert de référence : l'historique n'apparaît pas comme une activité récente.
- Une panne d'observation est signalée, une fois au début et une fois à la fin. **Le trou n'est pas comblé.**
- Le texte des réponses, les commandes et les aperçus d'outils ne sont pas copiés dans le journal.

## Tâches

Titre, état (À faire, En cours, Terminée), personnage, filtres, détails et historique des changements.

## Rétention

Le journal est purgé après 30 jours. Les tâches sont conservées jusqu'à leur suppression.
