# ÉTAPE 06 — Intégration des personnages, décors et animations

## Rôle
Agis comme ingénieur frontend 2D et technical artist.

## Prérequis
Les spécifications de l'étape 03 et le moteur orthogonal de l'étape 05 doivent être validés.

## Objectif
Intégrer la bibliothèque graphique approuvée dans le moteur.

## Travail demandé
1. Intègre le Master Character validé et vérifie le découpage réel des frames.
2. Décline les personnages de la famille selon le modèle approuvé : JARVIS, VEILLEUR et les rôles retenus.
3. Intègre les animations prévues : idle, marche, travail, réflexion et, si utile, célébration/alerte.
4. Intègre les tuiles, meubles, bureaux, postes de travail, objets et éléments de décor.
5. Crée un catalogue centralisé des personnages et assets avec identifiants stables.
6. Implémente un système d'animation piloté par état, sans logique métier Hermes dans le renderer.
7. Prévois les animations manquantes avec un fallback visuel neutre.
8. Vérifie transparence, ancrage, échelle, alignement, palette et cohérence des frames.
9. Optimise le chargement et évite de recharger inutilement les textures.
10. Documente les règles d'ajout de nouveaux personnages et assets.

## Livrables
- `docs/graphics/ASSET_INTEGRATION.md`
- `docs/graphics/CHARACTER_CATALOG.md`
- Catalogue technique des assets.
- Bibliothèque de personnages et scène meublée de démonstration.
- Tests de chargement et de sélection d'animations.

## Contraintes
- Utilise uniquement les assets autorisés par l'audit de licence.
- Ne remplace pas le Master Character sans validation.
- Ne code pas de fausses activités prétendant représenter l'état réel d'un agent.
- Les états simulés doivent être clairement identifiés comme tels.

## Validation de sortie
Fournis une démonstration visuelle et une checklist qualité pour chaque personnage. Attends validation avant l'étape 07.
