# Rapport — Étape 09 : Chat

## En résumé

Tu peux parler à un agent depuis son personnage, voir sa réponse s'écrire, l'arrêter, et décider quand il demande une autorisation. Tout passe par le backend puis par Hermes, sans appel direct à un LLM.

## Choix à connaître

- **Le chat utilise les « runs » de Hermes**, seuls à permettre un vrai arrêt et les demandes d'autorisation en v0.17.
- **Les sessions Telegram, CLI et cron sont en lecture seule ici**, car Hermes v0.17 ne l'empêcherait pas lui-même.
- **Une autorisation ne vaut qu'une fois.** « Toujours » n'est pas proposé.

## Bug trouvé par les tests

Une réponse pouvait disparaître de l'écran si Hermes ne l'avait pas encore enregistrée. Elle reste maintenant affichée.

## Critères d'acceptation

| Critère | Résultat |
|---|---|
| Conversation traçable à un agent et à une session | Oui : affichés en permanence, testé |
| Aucun faux succès en cas d'échec | Oui, testé, y compris « Résultat inconnu » |
| Mode mock identifiable | Oui, mention « Simulation » |
| Secrets côté serveur | Oui, testé dans le navigateur |

## Preuves

Niveau atteint : **testé en local, contre le mock et contre un faux Hermes**.

## Non vérifié

- **La conversation réelle demandée par le prompt n'a pas pu avoir lieu** : je n'ai pas accès à ton Hermes.
- Enregistrement des messages sans doublon, et format réel d'une demande d'autorisation : à observer. Voir [HERMES_CHAT_FLOW.md](../integrations/HERMES_CHAT_FLOW.md).

## Livrables

- [CHAT_BEHAVIOR.md](../product/CHAT_BEHAVIOR.md)
- [HERMES_CHAT_FLOW.md](../integrations/HERMES_CHAT_FLOW.md)
- Code : `server/chat/`, `src/ui/ChatPanel.tsx`, `src/domain/chat.ts`
- Tests : `tests/server/chat.test.ts`, `e2e/chat.spec.ts`
