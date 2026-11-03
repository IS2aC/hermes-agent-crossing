# ÉTAPE 02 — Inventaire, extraction et audit des assets graphiques

## Rôle
Agis comme technical artist et ingénieur pipeline 2D pixel-art.

## Objectif
Auditer les ressources graphiques de Claude-Office et préparer leur réutilisation dans un jeu/app en vue orthogonale top-down.

## Travail demandé
1. Inventorie toutes les ressources visuelles : personnages, spritesheets, tuiles, sols, murs, mobilier, objets, icônes, effets et arrière-plans.
2. Pour chaque asset, relève : chemin, format, dimensions, transparence, nombre de frames, directions, palette, rôle et dépendances.
3. Identifie les spritesheets et documente leur découpage exact, sans supposer la taille des cellules.
4. Évalue la compatibilité avec la vue orthogonale :
   - réutilisable directement ;
   - adaptable par recadrage/édition ;
   - à redessiner ;
   - inutilisable.
5. Vérifie les licences et notices du dépôt et, si possible, la provenance des assets individuels. Le fait que le code soit sous MIT ne signifie pas automatiquement que toutes les illustrations le sont.
6. Isole les éléments dont la licence ou la provenance est incertaine. Ne les intègre pas dans le produit final avant clarification.
7. Crée des aperçus/catalogues visuels si les outils du dépôt le permettent.
8. Propose une convention de nommage et d'organisation des assets.

## Livrables
- `docs/art/ASSET_INVENTORY.md`
- `docs/art/ASSET_LICENSE_AUDIT.md`
- `docs/art/ORTHOGONAL_COMPATIBILITY.md`
- `docs/art/ASSET_PIPELINE.md`
- Un catalogue visuel des assets, avec chemins sources.
- Une liste des assets approuvés pour réutilisation.

## Contraintes
- Ne modifie pas les images originales.
- Ne supprime aucun asset.
- Ne prétends pas qu'un asset est libre de droits sans preuve.
- Ne génère pas encore toute la bibliothèque graphique.
- Toute transformation doit préserver une copie de l'original.

## Validation de sortie
Fournis une matrice de décision exploitable pour l'étape 03. Attends la validation avant de continuer.
