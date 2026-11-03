# Rapport — Étape 10 : Tâches et activité

## En résumé

Le bureau a maintenant un tableau de tâches et un journal d'activité, bien séparés. **Tu pourras voir que Telegram, le CLI et le cron ont avancé**, comme tu le souhaitais, mais avec jusqu'à 15 secondes de retard et sans détail sur ce que fait l'agent à cet instant.

## Ce qui a été fait

- Tâches locales : création, état, personnage, filtres, détails, historique.
- Journal : source sur chaque ligne, filtres par agent et par source, pagination.
- Observation des sessions et des tâches planifiées de Hermes.
- Panne d'observation signalée, jamais comblée.

## Défauts trouvés et corrigés

- Une réponse lente du registre pouvait écraser une réponse plus récente.

## Choix

**SSE au lieu de WebSocket** : le navigateur ne fait que recevoir. C'est plus simple et une dépendance disparaît ([ADR-007](../adr/ADR-007-flux-sse.md)).

## Critères d'acceptation

| Critère | Résultat |
|---|---|
| Source de chaque information identifiable | Oui, testé |
| Données locales jamais présentées comme Hermes | Oui, testé |
| Événements répétés sans doublon | Oui, à trois niveaux, testé |
| États inconnus restent inconnus | Oui |

## Non vérifié

- **Rien n'a tourné sur ton Hermes.** Les champs `message_count` et `last_active` viennent de ma lecture du source.
- **Pas de vrai PostgreSQL** : testé avec un simulateur.
- **Coût des relectures** : une lecture toutes les 15 s par profil, a priori légère, mais non mesurée.

## Livrables

- [TASKS_AND_EVENTS.md](../product/TASKS_AND_EVENTS.md)
- [EVENT_MODEL.md](../architecture/EVENT_MODEL.md)
- Code : `server/events/`, `src/ui/TasksPanel.tsx`, `src/ui/ActivityPanel.tsx`
- Tests : `tests/server/events.test.ts`, `e2e/chat.spec.ts`
