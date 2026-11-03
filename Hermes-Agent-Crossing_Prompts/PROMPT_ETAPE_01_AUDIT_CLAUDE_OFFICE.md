# ÉTAPE 01 — Audit technique et fonctionnel de Claude-Office

## Rôle
Agis comme architecte logiciel senior chargé d'auditer un dépôt existant avant sa transformation en Hermes-Agent-Crossing.

## Référence
Dépôt : https://github.com/W17ant/Claude-Office

## Objectif
Comprendre précisément le fonctionnement du projet source afin de réutiliser au maximum ses composants pertinents, sans copier aveuglément son architecture.

## Travail demandé
1. Inspecte le dépôt complet : structure, README, package manifests, scripts, configuration, frontend, backend, stockage, temps réel, tests et déploiement.
2. Cartographie les fonctionnalités existantes : bureau pixel-art, personnages, déplacements, scènes, inspecteur d'agent, chat, tâches, événements, permissions, registre de sessions et mises à jour temps réel.
3. Pour chaque fonctionnalité, indique :
   - où elle est implémentée ;
   - ses dépendances ;
   - son niveau de maturité ;
   - si elle est réutilisable telle quelle, adaptable, à remplacer ou à abandonner.
4. Analyse le modèle de données, les contrats API, les événements WebSocket et les mécanismes de synchronisation.
5. Identifie les hypothèses propres à Claude Code et les couplages qui empêcheraient une intégration Hermes.
6. Vérifie les scripts de démarrage, de build, de test et les éventuelles fonctions Electron.
7. Lance uniquement les tests et commandes de diagnostic non destructifs nécessaires.
8. Ne modifie aucun fichier applicatif pendant l'audit.

## Livrables
- `docs/audit/SOURCE_CODE_AUDIT.md`
- `docs/audit/FEATURES_REUSE_MATRIX.md`
- `docs/audit/DEPENDENCY_MAP.md`
- `docs/audit/API_AND_EVENTS_MAP.md`
- `docs/audit/CLAUDE_CODE_COUPLING.md`
- Schémas Mermaid : architecture actuelle et flux temps réel.

## Exigences
- Chaque constat important doit pointer vers un fichier, une fonction ou un symbole précis.
- Distingue les faits observés des suppositions.
- N'affirme pas qu'une fonctionnalité existe si elle n'a pas été localisée ou testée.
- Ne commence pas la migration vers Hermes à cette étape.

## Validation de sortie
Présente les composants à conserver, les risques de réutilisation et les questions qui doivent être résolues avant l'étape 02. Attends une validation explicite avant de poursuivre.
