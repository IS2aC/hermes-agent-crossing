# ÉTAPE 04 — Architecture cible et découplage

## Rôle
Agis comme architecte logiciel senior spécialisé en React, backend Node.js/TypeScript, WebSocket et intégration de systèmes externes.

## Objectif
Définir l'architecture cible de Hermes-Agent-Crossing à partir de l'audit du projet source, sans réécriture inutile.

## Principes
- Réutiliser les composants de Claude-Office lorsque cela est pertinent et légal.
- Séparer le moteur de bureau, le domaine métier, le stockage et les adaptateurs externes.
- Le frontend ne doit jamais accéder directement aux secrets Hermes.
- Hermes doit être derrière un adaptateur backend dédié.
- Ne pas recréer PostgreSQL, MinIO ou pgvector déjà présents.
- Ne pas confondre profil visuel, agent Hermes, session runtime et tâche locale.

## Travail demandé
1. Propose une architecture logique et physique.
2. Définis les modules : renderer/scene, character system, agent registry, Hermes adapter, session/chat, task board, event bus, persistence, authentication et administration.
3. Définis les frontières et responsabilités frontend/backend.
4. Définis les contrats TypeScript et schémas de données initiaux.
5. Définis les flux de lecture, d'action, d'événements et de reconnexion.
6. Détermine ce qui doit être stocké localement et ce qui doit être lu depuis Hermes.
7. Propose une stratégie de migration incrémentale depuis le code existant.
8. Documente les choix structurants sous forme d'ADR.
9. Définis stratégie de tests unitaires, intégration, contrats et E2E.

## Livrables
- `docs/architecture/TARGET_ARCHITECTURE.md`
- `docs/architecture/DOMAIN_MODEL.md`
- `docs/architecture/DATA_FLOWS.md`
- `docs/architecture/SECURITY_BOUNDARIES.md`
- `docs/adr/ADR-*.md`
- Contrats TypeScript et schémas initiaux, si leur création est validée.

## Interdictions
- Ne code pas une intégration Hermes sur la base d'endpoints supposés.
- Ne remplace pas toute la stack sans justification mesurée.
- Ne duplique pas les services d'infrastructure déjà disponibles.
- Ne stocke aucun token ou mot de passe dans le frontend ou dans le dépôt.

## Validation de sortie
Fournis les diagrammes, décisions, coûts de migration et risques. Attends validation avant l'étape 05.
