# Inventaire des assets de Claude-Office

Commit `1a9ba71`. **279 images** : 274 PNG, 4 GIF, 1 SVG. Aucun fichier n'a été copié ni modifié.

- Inventaire complet, fichier par fichier : [catalog/asset-inventory.csv](catalog/asset-inventory.csv)
- Catalogue visuel avec chemins sources : [catalog/source-assets.html](catalog/source-assets.html). Il charge les images depuis GitHub, à ouvrir avec une connexion.

## Vue par dossier

| Dossier | Fichiers | Taille | Dimensions fréquentes | Rôle |
|---|---|---|---|---|
| `public/sprites/characters` | 42 | 14,0 Mo | 432×880, 402×845, 450×1024 | Personnages, 4 fichiers par personnage |
| `public/sprites/` (racine) | 8 | 2,5 Mo | 307×862, 322×912 | Personnages par rôle |
| `public/sprites/office/characters` | 108 | 14,1 Mo | 205×527, 210×526 | Skin Dunder Mifflin |
| `public/sprites/office/props` | 15 | 0,9 Mo | Variable | Skin Dunder Mifflin |
| `public/sprites/office/cats` | 12 | 0,5 Mo | Variable | Chats |
| `public/sprites/effects` | 17 | 0,5 Mo | 164×175 | Bulles et icônes |
| `public/sprites/furniture` | 6 | 1,8 Mo | 580×728, 312×422 | Bureaux, armoire |
| `public/sprites/decoration` | 8 | 2,0 Mo | 500×500 | Plantes, imprimante, tableau |
| `public/sprites/culture` | 4 | 2,0 Mo | Variable | Tableau de tâches, écran |
| `public/sprites/appliances` | 2 | 0,3 Mo | 296×378 | Machine à café |
| `public/rooms` | 4 | 6,8 Mo | 1508×1126, 1200×896 | Fonds de salle, sans transparence |
| `docs/images` | 46 | 22,2 Mo | Variable | Documentation |
| `electron/assets`, `build` | 7 | < 0,1 Mo | 16 à 512 px | Icônes de l'application |

## Découpage

**Aucun spritesheet d'animation n'a été trouvé.** Les personnages sont des images séparées :

- une par direction : `<nom>-1-{front-left,front-right,rear-left,rear-right}.png` ;
- deux planches de référence seulement : `TEMPLATE.png` (654×1764, 2×2) et `Helper.png` (une rangée de 4 vues, avec du texte) ;
- le scénario de découpage est en `scripts/split-character.py` et `scripts/extract-boss-sprite.py`, pour des planches 2×2.

## Limites de mesure

- **Mesuré sur tous les fichiers** : format, dimensions, mode couleur, taille.
- **Non mesuré** : palette et nombre de couleurs. Aucune image PNG n'est en couleurs indexées (mode RGBA ou RGB).
- **Vu à l'œil** : un échantillon de 5 images (`TEMPLATE`, `Helper`, `office-day`, `monstera-plant`, `post-it`). Les classements des autres fichiers se fondent sur leur dossier, leurs dimensions et leur nom.
