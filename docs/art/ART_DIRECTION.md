# Direction artistique

## Intention

Un petit bureau chaleureux et professionnel, vu de dessus, lisible d'un coup d'œil. Le personnage doit être reconnaissable à sa silhouette et à sa couleur, même sur un petit écran.

## Pourquoi ces choix

L'audit (étape 02) n'a rien laissé de réutilisable. Les valeurs sont donc choisies pour la cible, pas héritées de Claude-Office, dont les images dépassent 800 px de haut et sont réduites par le navigateur.

| Paramètre | Valeur | Justification |
|---|---|---|
| Vue | Orthogonale, style RPG : on voit le dessus et la face des objets | Lisible, sans perspective isométrique |
| Grille | Tuiles de 16×16 px | Standard du genre, adaptée aux échelles entières |
| Cellule de personnage | 24×32 px | Laisse de la marge pour le mouvement et les accessoires |
| Personnage visible | 12 px de large sur 22 de haut | Environ 1 tuile de large et 1,4 de haut ; grosse tête, donc visage lisible |
| Échelle d'affichage | Entière uniquement (×2, ×3, ×4) | Pixels nets |

## Proportions

Tête 11 lignes, buste 6 lignes, jambes 6 lignes (avec superpositions). La tête représente la moitié de la hauteur : c'est ce qui donne le ton chaleureux.

## Palette

- **13 couleurs maximum** par personnage en base, 16 avec accessoires.
- **Contour** unique, sombre et violacé (`#2b2433`), plus doux que le noir.
- **Chaque couleur a une version ombrée**, décalée vers le froid.
- **Master Character** volontairement neutre : gris-bleu, pour ne suggérer aucun rôle.

## Ombre et lumière

- Lumière venant du haut à gauche, sans dégradé ni antialiasing.
- Une seule teinte d'ombre par matière.
- Un seul reflet (cheveux).

## Niveau de détail

- Yeux sur 2 pixels, pas de bouche ni de nez.
- Pas de texte dans les sprites.
- Pas de pixel isolé.

## Animation

- Peu de frames, mouvement franc.
- Le haut du corps bouge de 1 px au maximum.
- **Une animation n'a pas valeur d'information** : c'est le domaine qui choisit l'état, le sprite ne fait que l'afficher.
