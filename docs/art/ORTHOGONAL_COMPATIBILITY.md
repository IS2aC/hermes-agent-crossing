# Compatibilité avec la vue orthogonale

Matrice de décision pour l'étape 03. Le détail par fichier est dans [catalog/asset-inventory.csv](catalog/asset-inventory.csv).

| Catégorie | Fichiers | Compatibilité | Raison |
|---|---|---|---|
| Fonds de salle | 4 | **Inutilisable** | Pièce peinte en perspective isométrique, sans grille |
| Personnages par défaut | 50 | **À redessiner** | Vues diagonales, pas de face/dos/gauche/droite ; pas de frames d'animation |
| Mobilier | 6 | **À redessiner** | Angle isométrique |
| Décor, appareils, culture | 14 | **À redessiner** | Dessin haute résolution, trait incompatible avec une grille pixel à petite échelle |
| Effets et icônes | 17 | **Adaptable pour l'idée seulement** | Forme lisible, mais à redessiner à l'échelle |
| Chats | 12 | **À redessiner** si souhaités | Liés au skin |
| Skin, docs, icônes | 176 | **Inutilisable** | Hors licence ou hors sujet |

**Réutilisables directement : 0.**

## Pourquoi un simple recadrage ne suffit pas

1. **Angle de vue.** Un personnage vu en diagonale ne peut pas devenir une vue de face par découpe.
2. **Pixels non alignés.** Ces images (centaines de pixels de haut) sont affichées réduites par le navigateur. Le plant de monstera vu à l'œil a un rendu dessiné, avec des dégradés, pas une vraie grille de pixels. Une réduction donne un résultat flou et incohérent.
3. **Pas de cohérence d'animation.** Aucune frame n'existe à réutiliser.

## Ce qu'on en garde

Des idées, pas des pixels : la liste des objets d'un bureau, le code couleur par rôle et le vocabulaire des bulles (frappe, café, alerte).
