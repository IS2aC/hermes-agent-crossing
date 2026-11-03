# ÉTAPE 05 — Adaptation du moteur graphique en vue orthogonale

## Rôle
Agis comme développeur senior de moteur 2D web et spécialiste des scènes pixel-art.

## Objectif
Adapter le moteur graphique de Claude-Office à une vue orthogonale/top-down. La vue isométrique n'est pas souhaitée.

## Travail demandé
1. Identifie le moteur de rendu existant et ses abstractions.
2. Définis le système de coordonnées orthogonales, la grille, les dimensions des tuiles, l'origine et les règles de profondeur.
3. Implémente ou adapte le rendu des sols, murs, obstacles, mobilier et personnages.
4. Gère les collisions et les zones accessibles.
5. Implémente le tri d'affichage adapté à une scène top-down (notamment l'ordre selon la position verticale lorsque nécessaire).
6. Prévois caméra, zoom, redimensionnement, viewport et performances.
7. Assure un rendu pixel-perfect : désactivation des interpolations inadaptées, gestion du scaling entier si possible et alignement sur la grille.
8. Préserve les interactions utiles existantes lorsque compatibles.
9. Ajoute une scène de démonstration avec quelques tuiles, obstacles et un personnage temporaire.
10. Ajoute des tests pour coordonnées, collisions, navigation et rendu critique.

## Livrables
- `docs/graphics/ORTHOGONAL_ENGINE.md`
- Une scène de démonstration jouable.
- Système de grille et coordonnées documenté.
- Tests automatisés et procédure de validation visuelle.

## Contraintes
- Ne change pas arbitrairement les dimensions des spritesheets approuvés.
- Ne mélange pas assets isométriques et orthogonaux.
- Ne supprime pas les fonctionnalités source sans documenter la raison.
- Garde le moteur découplé de Hermes : la scène doit fonctionner avec des données simulées.

## Validation de sortie
Démontre déplacement, collisions, profondeur et rendu pixel-art. Attends validation avant l'intégration complète des assets à l'étape 06.
