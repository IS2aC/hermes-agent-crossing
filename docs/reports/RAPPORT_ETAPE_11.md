# Rapport — Étape 11 : États visuels

## En résumé

Les personnages s'animent maintenant selon de vraies données, avec une règle pour chaque cas. Un nouvel onglet **États** montre d'où vient chaque animation. Sans donnée, le personnage reste figé.

## Ce qui a été fait

- Décision en 8 règles, de la plus sûre à la moins sûre.
- Trois niveaux : confirmé, déduit, inconnu.
- Stabilité : 1,5 s minimum par animation, sauf pour un problème ou une demande, affichés aussitôt.
- Événements tardifs ignorés.
- Nouvelle bulle `!` pour une autorisation en attente, sans animation.

## Critères d'acceptation

| Critère | Résultat |
|---|---|
| Chaque animation repose sur une donnée documentée | Oui, table testée |
| L'état inconnu est neutre | Oui, pose figée et bulle `?` |
| Le moteur ne dépend pas de l'API Hermes | Oui, il reçoit seulement un état |
| Les animations décoratives ne sont pas une preuve | Oui, l'onglet États donne la source |

## Limite à connaître

`idle` contient une petite respiration, donc un agent au repos bouge légèrement. Hors du chat de l'application, un agent en activité sur Telegram montre seulement `work`, déduit de `active_agents`.

## Preuves

Niveau atteint : **testé en local, sur des données simulées explicites**. Voir le commit de cette étape.

## Non vérifié

- **Aucune transition sur des événements réels de Hermes**, faute d'accès.
- Le comportement réel de `active_agents` pendant une conversation Telegram est à observer.

## Livrables

- [AGENT_VISUAL_STATE_MACHINE.md](../graphics/AGENT_VISUAL_STATE_MACHINE.md)
- Code : `src/characters/visualState.ts`, `src/ui/DebugPanel.tsx`
- Tests : `tests/characters/visualState.test.ts`, `e2e/chat.spec.ts`
