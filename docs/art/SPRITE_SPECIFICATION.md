# Spécification des spritesheets

Source de vérité : `tools/art/character.mjs`. Toute modification passe par ce fichier.

## Format

| Propriété | Valeur |
|---|---|
| Fichier | PNG RGBA 8 bits, fond transparent |
| Cellule | 24×32 px |
| Colonnes | 4 |
| Lignes | 16 (4 animations × 4 directions) |
| Taille totale | 96×512 px |
| Point d'ancrage | `x=12, y=30` dans la cellule : centre des pieds |

## Disposition

Ordre des directions dans chaque animation : `down`, `left`, `right`, `up`.

| Lignes | Animation | Frames | Cadence |
|---|---|---|---|
| 0 à 3 | `idle` | 2 | 2 images/s |
| 4 à 7 | `walk` | 4 | 8 images/s |
| 8 à 11 | `work` | 4 | 6 images/s |
| 12 à 15 | `think` | 4 | 2 images/s |

Les cellules au-delà du nombre de frames sont vides. **Position d'une frame :** `x = frame × 24`, `y = (ligneDeDépart + indexDirection) × 32`.

`left` est obtenu par symétrie de `right` au moment de la génération. Le moteur ne fait aucune symétrie à l'exécution.

## Règles de qualité

Contrôlées automatiquement par `tools/art/quality.mjs` :

- dimensions exactes ;
- alpha égal à 0 ou 255 uniquement ;
- 16 couleurs au plus ;
- aucun pixel isolé ;
- aucune frame vide, et aucune cellule inutilisée occupée ;
- aucune frame ne touche le bord gauche, droit ou haut de la cellule ;
- pieds sur la ligne `y=29` dans **toutes** les frames, juste au-dessus de l'ancrage.

## Planche ou spritesheet

| | Spritesheet | Planche de présentation |
|---|---|---|
| Emplacement | `public/assets/characters/` | `docs/art/previews/` |
| Lue par le moteur | Oui | **Jamais** |
| Agrandie | Non | Oui, ×4, sur damier |
