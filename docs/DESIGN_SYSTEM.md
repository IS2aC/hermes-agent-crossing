# Design System - Hermes Agent Crossing

## Palette "Fresh & Calm"
- **Maximum 32 couleurs** (24 actives + 8 réservées)
- Fichier source : `assets-src/palette/palette.gpl`
- Couleurs d'état spécifiques :
  - Touché/down : `#e32137` (rouge)
  - Dégradé/bloqué : `#f79b39` (orange)
  - Approbation requise : `#ffca4e` (miel)
  - OK : `#74b100` (vert feuille claire)
  - Réflexion : `#a39cff` (lavande)

## Grille et échelles
- **Grille de base** : 16×16 pixels
- **Échelles autorisées** : 1×, 2×, 3×, 4× (pour le rendu, les assets restent en 16×16)
- **Parallaxe** : Le monde utilise différentes échelles pour créer de la profondeur

## Typographie
- **Titres, boutons, HUD, enseignes** : PixelOperator (police OFL)
- **Textes longs (chat, descriptions)** : Inter (OFL)
- **Blocs de code** : JetBrains Mono
- Fallback : Polices système sans-serif pour Inter/JetBrains Mono

## Règles d'ombre et lumière
- **Ombre portée** : Utiliser `#0f0d11` (encre) à 50% d'opacité pour les éléments sur le sol
- **Lumière directe** : Utiliser `#ffffff` (blanc) à 30% d'opacité pour les highlights
- **Lumière ambiante** : Ajuster selon l'heure du jour (jour/nuit)
- **Éléments en relief** : Ombre haute à gauche/haut, ombre basse à droite/bas

## Couleurs de team
- **Team Dev par défaut** : `#30f5ff` (cyan néon - comme les icônes d'enseigne de la maquette)
- **Autres teams** : Piocher dans les couleurs réservées (25-32)
- **Application** : Liseré de sol, panneaux suspendus, accents sur les bureaux

## Composants UI
### Fenêtre 9-slice
- Bordures : 2 pixels d'épaisseur
- Coins : 2×2 pixels
- Couleurs : Fond `#1e2952` (navy), bordure `#ffffff` (blanc) à 80% opacité

### Boutons
- États : normal, hover, pressed, disabled
- Fond normal : `#1e2952` à 70% opacité
- Fond hover : `#30f5ff` à 30% opacité (cyan néon)
- Fond pressed : `#30f5ff` à 50% opacité
- Fond disabled : `#6fbefb` à 30% opacité (ciel)
- Texte : `#ffffff` (blanc) PixelOperator
- Bordure : 1 pixel `#ffffff` à 50% opacité

### Champs de saisie
- Fond : `#0f0d11` à 50% opacité
- Bordure : `#ffffff` à 30% opacité
- Focus : Bordure `#30f5ff` (cyan néon)
- Texte : `#ffffff`

### Badges
- Fond : Couleur d'état avec 60% opacité
- Texte : `#ffffff` ou `#0f0d11` selon contraste
- Bordure : 1 pixel `#ffffff` à 40% opacité
- Rayon : 2 pixels

### Toasts
- Fond : `#0f0d11` à 80% opacité
- Bordure : `#ffffff` à 50% opacité
- Texte : `#ffffff`
- Icône : À gauche, 16×16 pixels
- Durée : 5 secondes (éphémère), approbation persiste jusqu'à action

### Curseur pixel
- Forme : Croix ou flèche selon contexte
- Couleur : `#30f5ff` (cyan néon)
- Épaisseur : 2 pixels

## Logo Hermes Agent Crossing
- **Wordmark pixel** : "HERMES-AGENT-" en blanc + "CROSSING" en orange `#f79b39`
- **Icône 32×32** : Mascotte robot blanc aux yeux cyan `#30f5ff`, aile dorée simplifiée
- **Favicon** : Réduction 16×16 de l'icône

## Icônes d'état 16×16 animées
### Touché / Down
- Pansement blanc sur membre
- Étoiles dorées qui tournent autour (`#ffca4e` avec animation)
- Lecture immédiate : icône clairement identifiable comme "blessé"

### Autres états
- Dégradé/bloqué : Nuage orange `#f79b39` avec éclairs
- Approbation requise : Moustache de vérification `#ffca4e`
- OK : Coche verte `#74b100`
- Réflexion : Nuage réfléchissant `#a39cff` avec idée (
- Normal : Aucune icône ou symbole neutre

## Règles d'accessibilité
- **Contraste minimum** : 4.5:1 pour texte normal, 3:1 pour grands textes
- **Focus visible** : Contour 2 pixels `#30f5ff` (cyan néon) sur tous les éléments interactifs
- **Cibles tactiles** : Minimum 44×44 pixels
- **Navigation clavier** : Ordre logique, échappement des pièges
- **Réduction de mouvement** : Option pour remplacer les animations par des transitions instantanées
- **Échelle de texte** : Interface fonctionnelle jusqu'à 200% de zoom

## Assets spécifiques
### Tileset intérieur (office.aseprite)
- Sols : Parquet clair, moquette, carrelage café, liseré de team
- Murs : Avec possibilité d'affichage (tableaux, panneaux)
- Vitres : Avec reflet subtil
- Portes : Simple et double
- Bureaux : Simple, double, bureau de manager
- Chaises : Variantes de style
- Écrans : État éteint/allumé/alerte rouge
- Plantes : 5 variantes différentes
- Meubles : Canapés, table basse, machine à café, étagères
- Serveurs : Baies avec voyants animés
- Tableaux : Blanc pour brainstorming, grand tableau Kanban mural
- Accueil : Comptoir avec logo Crossing intégré

### Sprites personnages 16×32
- **6 bases** : Exec, Lead, Dev_hoodie, Creative, QA, Glasses, Explorer
- **1 générique** : Recolorable via palette swap
- **Animations par base** :
  - Idle : 4 directions (1 frame chacune)
  - Marche : 4 directions × 4 frames
  - Assis-typing : 2 directions
  - Réflexion : Bulle "..." au-dessus de la tête
  - Gratter la tête : État bloqué
  - KO/allongé : État touché
  - Fatigué : État dégradé
- **Recoloration** : Shader ou swap de palette documenté

### Portraits 48×48
- Version agrandie des bases de personnages pour le panneau agent
- Même palette, mêmes caractéristiques distinctives

## Fichiers de crédit
- `assets-src/CREDITS.md` : Liste des ressources externes avec leurs licences
- Tout doit être original sous Aseprite ou CC0 avec attribution si requis
- Aucun asset reconnaissable provenant de jeux existants (inspiration uniquement)

## Script de build
- `pnpm assets:build` : Exporte les .aseprite en atlas dans `apps/web/public/assets/`
- Utilise Aseprite en ligne de commande ou équivalent pour le traitement par lots
- Génère les fichiers JSON d'atlas pour Phaser 3
- Optimise les PNG sans perte de qualité pixel