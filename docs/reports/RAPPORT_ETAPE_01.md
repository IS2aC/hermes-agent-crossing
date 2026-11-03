# Rapport — Étape 01 : Audit de Claude-Office

## En résumé

J'ai lu le projet source pour décider quoi réutiliser. **Je recommande de ne pas le forker** : on construit une application propre avec la même stack et on importe les bons morceaux, un par un.

## Ce qui a été fait

- Cartographie du frontend, du serveur, des événements et des dépendances.
- Décision pièce par pièce : réutiliser, adapter, remplacer ou abandonner.
- Liste des points liés à Claude Code qui bloquent une intégration Hermes.

## Ce que j'ai découvert

- **Réutilisable (avec adaptation)** : interfaces de l'inspecteur, du chat, du tableau de tâches et des permissions, ainsi que le schéma temps réel.
- **À remplacer** : le rendu, les déplacements, le backend du chat, le registre de sessions, l'authentification.
- **À abandonner** : les pauses café et événements scriptés, car ils simulent une activité inexistante, et Electron.
- **Contrairement à ce que j'avais écrit à l'étape 00**, le source a un système de chemins par waypoints. C'est corrigé dans le brief.

## Non vérifié — à savoir

**Je n'ai pas pu lancer les tests ni le build de Claude-Office.** Le contrôle de sécurité de l'environnement a refusé d'exécuter ce code externe, et je n'ai pas contourné ce refus. L'audit est donc une lecture du code. Le nombre de tests annoncé (972) n'est pas confirmé, et la maturité indiquée est mon appréciation.

## Arbitrage appliqué

Ne pas forker. La décision est détaillée dans [SOURCE_CODE_AUDIT.md](../audit/SOURCE_CODE_AUDIT.md).

## Livrables

- [SOURCE_CODE_AUDIT.md](../audit/SOURCE_CODE_AUDIT.md), avec les schémas Mermaid
- [FEATURES_REUSE_MATRIX.md](../audit/FEATURES_REUSE_MATRIX.md)
- [DEPENDENCY_MAP.md](../audit/DEPENDENCY_MAP.md)
- [API_AND_EVENTS_MAP.md](../audit/API_AND_EVENTS_MAP.md)
- [CLAUDE_CODE_COUPLING.md](../audit/CLAUDE_CODE_COUPLING.md)
