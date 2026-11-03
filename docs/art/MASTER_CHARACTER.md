# Master Character

Personnage neutre, modèle de toute la famille.

![Planche du Master Character](previews/master-character.png)

Lecture de la planche : lignes `idle`, `walk`, `work`, `think` ; colonnes `down`, `left`, `right`, `up`, chacune avec ses frames.

- **Spritesheet :** `public/assets/characters/character-master.png`
- **Source :** `tools/art/character.mjs`
- **Provenance :** création originale pour ce projet, écrite en code. Aucun asset externe.

## Construction

Le personnage est assemblé à partir de pièces : tête (3 vues), buste (6 poses par vue), jambes (3 états par vue). Une frame n'est qu'une combinaison de ces pièces avec un petit décalage. **Il est donc impossible qu'une frame déforme les volumes**, ce qui répond à l'exigence de cohérence.

## Écarts connus

1. **Posture debout pour `work`** : le personnage tape debout. Une version assise pourrait être ajoutée si la scène le demande.
2. **Profil de `walk` dissymétrique** : une seule foulée écartée, l'autre position reprend la station debout. Cela reste lisible à l'échelle d'affichage.
3. **`think` discret** : main au menton, peu visible de dos. Une bulle complétera (étape 06).
4. **Pas jugé par un artiste** : les contrôles automatiques vérifient la technique, pas l'esthétique.

## Validation

**Style validé par l'opérateur** le 2026-11-03, après la démonstration de l'étape 06. Une modification ultérieure de `character.mjs` se répercuterait sur toute la famille.
