# Spécification des animations

| Animation | Frames | Cadence | Boucle | Description |
|---|---|---|---|---|
| `idle` | 2 | 2 i/s | Oui | Respiration : la tête descend de 1 px |
| `walk` | 4 | 8 i/s | Oui | Foulée, position de passage où le corps monte de 1 px, autre foulée, passage |
| `work` | 4 | 6 i/s | Oui | Mains qui tapent en alternance, petit mouvement de tête |
| `think` | 4 | 2 i/s | Oui | Main au menton, léger mouvement de tête |

## Règles

- **Départ :** toute nouvelle animation commence à la frame 0.
- **Changement de direction :** conserve la frame en cours.
- **Animation manquante :** retour à une représentation neutre (étape 06).
- **Sens :** le moteur choisit l'animation selon un état fourni. Il ne décide jamais qu'un agent « travaille ». Ce sujet est celui de l'étape 11.

## Hors périmètre actuel

`célébration`, `alerte`, `assis`. Le système permet de les ajouter, mais elles ne sont pas nécessaires au MVP. L'état « inconnu » n'a pas d'animation propre : il utilise la pose `idle` figée et une bulle neutre.
