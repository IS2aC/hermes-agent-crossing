# Rapport — Étape 02 : Audit des assets

## En résumé

J'ai inventorié les 279 images de Claude-Office. **Aucune n'est retenue** : elles sont soit hors licence, soit de provenance floue, et surtout incompatibles avec une vue de dessus. Le projet aura donc son propre art.

## Ce que j'ai découvert

- **128 fichiers sont interdits** : le skin Dunder Mifflin est exclu de la licence MIT.
- **Aucune animation en spritesheet** : chaque personnage n'a que 4 images fixes en diagonale.
- **Des générateurs d'images** semblent avoir servi (PixelLab, Replicate, ChatGPT), alors que le dépôt parle d'« art original ».
- **Certains modèles viennent peut-être de photos de vraies personnes**, et un post-it affiche un chemin avec un prénom.

## Non vérifié

- J'ai regardé 5 images à l'œil. Les autres sont classées selon leur dossier, leurs dimensions et leur nom.
- Les palettes n'ont pas été mesurées.
- Je n'ai pas contacté l'auteur pour confirmer la provenance. Ce n'est pas un avis juridique.

## Arbitrage appliqué

Liste d'assets approuvés vide. Tout sera créé pour le projet.

## Livrables

- [ASSET_INVENTORY.md](../art/ASSET_INVENTORY.md)
- [ASSET_LICENSE_AUDIT.md](../art/ASSET_LICENSE_AUDIT.md)
- [ORTHOGONAL_COMPATIBILITY.md](../art/ORTHOGONAL_COMPATIBILITY.md)
- [ASSET_PIPELINE.md](../art/ASSET_PIPELINE.md)
- [Inventaire CSV](../art/catalog/asset-inventory.csv) et [catalogue visuel](../art/catalog/source-assets.html), qui charge les images depuis GitHub
