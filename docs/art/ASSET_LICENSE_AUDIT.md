# Audit de licence des assets

> **Mise à jour du 2026-11-03 :** l'opérateur a adopté la salle, le mobilier et des personnages par défaut, annoncés sous MIT. La décision ci-dessous n'est donc plus celle du produit, et la provenance reste à clarifier. Voir [ADR-008](../adr/ADR-008-sprites-claude-office.md). L'interdiction du skin *The Office* et des fichiers `Me-*`, `Helper` et `TEMPLATE` reste en vigueur.

Ceci n'est pas un avis juridique. Le classement applique une règle prudente : **sans preuve, on n'intègre pas.**

## Ce que disent les textes

`NOTICE.md` place sous MIT le code et « l'art pixel original » (bureau, mobilier, effets, personnages par défaut, incident). Il **exclut** du MIT :

- `public/sprites/office/characters/` et les aperçus correspondants dans `docs/images/` ;
- les éléments de `public/sprites/office/props/` tirés de la série ;
- les citations de `src/theme.ts`.

## Résultat

| Catégorie | Fichiers | Statut | Décision |
|---|---|---|---|
| Skin Dunder Mifflin (dont 2 salles `-dm` et 3 images de doc) | 128 | **Exclu du MIT** | **Interdit** dans le produit |
| Chats de `office/cats` | 12 | Non cités par `NOTICE.md`, liés au skin | Isolés, non utilisés |
| Personnages, mobilier, décor, effets, salles par défaut | 89 | MIT annoncé, **provenance à clarifier** | Isolés, non utilisés |
| Icônes de l'application | 7 | MIT annoncé | Sans utilité : identité à refaire |
| Autres images de documentation | 43 | Sans objet | Non utilisées |

Un fichier de la catégorie d'exclusion peut être classé par dossier ou par nom. Les 3 images de documentation identifiées par leur nom n'épuisent pas forcément tous les aperçus de la série, ce qui est sans conséquence : **`docs/images` n'est jamais importé.**

## Pourquoi la provenance reste à clarifier

Le dépôt montre que des images ont été produites avec des générateurs, ce que `NOTICE.md` ne détaille pas :

| Preuve | Outil | Élément concerné |
|---|---|---|
| `scripts/generate-office-bg.mjs` | Replicate, `google/nano-banana-pro` | Fonds de salle (script présent) |
| `scripts/generate-sprites.mjs`, `generate-walks.mjs` | PixelLab | Personnages (script présent) |
| `scripts/setup-character.md`, `extract-boss-sprite.py` | ChatGPT, DALL-E, à partir d'une **photo de soi** | Personnages personnalisés |

**Points non établis :**

- quels fichiers viennent réellement de ces outils (un script présent ne prouve pas son usage) ;
- les conditions d'utilisation de ces services au moment de la génération ;
- le niveau de protection d'une image générée.

**Attention à l'image des personnes :** `TEMPLATE.png`, `Helper.png` et les fichiers `Me-*` pourraient représenter de vraies personnes, vu la méthode décrite. C'est une hypothèse, mais une raison de plus de ne pas les utiliser.

**Données personnelles :** `effects/post-it.png` affiche du texte comme un chemin `/Users/Antony`. À ne pas reprendre.

## Décision

**Liste des assets approuvés pour réutilisation : vide.**

Cela ne coûte rien au projet : ces images sont de toute façon incompatibles avec une vue orthogonale (voir [ORTHOGONAL_COMPATIBILITY.md](ORTHOGONAL_COMPATIBILITY.md)). Tous les assets du produit seront des créations originales, avec une provenance traçable.

Si l'opérateur veut un jour réutiliser un asset source, il faudra confirmer sa provenance auprès de l'auteur, W17ANT. Le code réutilisé reste, lui, sous MIT.
