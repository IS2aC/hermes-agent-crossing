# ÉTAPE 03 — Character Design System : méthode Master Character

## Rôle
Agis comme directeur artistique pixel-art, character designer 2D et technical artist spécialisé dans les spritesheets de jeux.

## Objectif
Créer un système cohérent de personnages pour Hermes-Agent-Crossing, selon la méthode A : **Master Character → Character Family**. Ne crée pas chaque personnage indépendamment.

## Direction artistique
- Pixel art lisible, chaleureux et professionnel.
- Vue orthogonale/top-down, non isométrique.
- Personnages lisibles à petite échelle.
- Silhouette, proportions et volumes cohérents entre tous les agents.
- Fond transparent pour les sprites.
- Les personnages doivent s'intégrer dans la grille et le moteur retenus après audit.

## Travail demandé
1. Définis une fiche de direction artistique : taille cible, grille, proportions, palette, contour, ombres, niveau de détail et règles d'animation. Justifie les choix à partir du moteur et des assets audités.
2. Sélectionne ou conçois un seul **Master Character** neutre.
3. Produis d'abord un prototype limité du Master Character :
   - face, dos, gauche, droite ;
   - idle ;
   - marche ;
   - travail ;
   - réflexion.
4. Documente le découpage du spritesheet : taille des cellules, ordre des directions, nombre de frames, cadence et point d'ancrage.
5. Définis une méthode de déclinaison de la famille : vêtements, couleurs, coiffure, accessoires et petits éléments distinctifs peuvent varier ; proportions, silhouette de base et règles d'animation restent cohérentes.
6. Prépare les fiches de personnages prioritaires : JARVIS et VEILLEUR, puis DATA ANALYST, DEVOPS, DEVELOPER, RESEARCHER et SECURITY. Ne présume pas de leur configuration Hermes réelle : ici, il s'agit uniquement de direction visuelle.
7. Définis un pipeline de génération et de retouche. Les images générées doivent être contrôlées et nettoyées pour garantir une vraie cohérence frame par frame.
8. Définis les règles de qualité : absence de pixels parasites, transparence correcte, alignement, cohérence des volumes, absence de déformation entre frames.

## Livrables
- `docs/art/ART_DIRECTION.md`
- `docs/art/SPRITE_SPECIFICATION.md`
- `docs/art/MASTER_CHARACTER.md`
- `docs/art/CHARACTER_FAMILY.md`
- `docs/art/ANIMATION_SPECIFICATION.md`
- Un prototype validable du Master Character et son spritesheet.
- Un plan de production des autres personnages.

## Règles essentielles
- Ne produis pas toute la famille avant validation du Master Character.
- Ne confonds pas une planche de présentation avec un spritesheet exploitable par le moteur.
- Si une image générée ne respecte pas les dimensions ou l'alignement, propose une étape de découpage/retouche plutôt que de l'intégrer directement.
- Utilise les assets de Claude-Office uniquement s'ils sont compatibles et si leur licence le permet.

## Validation de sortie
Présente le Master Character en aperçu, les spécifications et les écarts à corriger. Attends l'approbation explicite avant de décliner la famille.
