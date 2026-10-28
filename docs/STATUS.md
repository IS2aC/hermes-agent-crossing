# Hermes Agent Crossing — Suivi des phases

| Phase | Nom | Statut | Responsable | Date cible | Risques / Notes |
|-------|-----|--------|-------------|------------|-----------------|
| 0 | Kickoff & cadrage | 🔄 En cours | dev_manager | 28/10/2026 | — |
| 1 | Contrat Hermes (discovery) | ⏳ En attente | agent_x + tester | — | Dépend de l'accès au serveur Hermes réel |
| 2 | Fondations du dépôt | ⏳ En attente | agent_x | — | Stack imposée stricte (pnpm, Turborepo, Phaser 3, Fastify) |
| 3 | Design system & assets | ⏳ En attente | designer | — | Validation Isaac sur maquettes (Gate 3) ; assets originaux/CC0 uniquement |
| 4 | Backend : adapter, Status Engine, temps réel | ⏳ En attente | agent_x + tester | — | Couverture ≥ 80 % sur hermes + status ; mode dégradé |
| 5 | Moteur du monde (Phaser) | ⏳ En attente | agent_x + designer | — | 60 fps avec 30 agents ; layout déterministe |
| 6 | Agents vivants | ⏳ En attente | agent_x + designer | — | 8 états, pathfinding, icône « touché » lisible |
| 7 | Interactions : panneau agent & chat | ⏳ En attente | agent_x + designer | — | Test réel : discuter avec Jarvis depuis Crossing (Gate 7) |
| 8 | Kanban | ⏳ En attente | agent_x + designer | — | DnD, temps réel, répercussions dans le monde |
| 9 | Onboarding, paramètres, plug & play | ⏳ En attente | agent_x + designer | — | < 5 min pour un nouvel utilisateur sans éditer de YAML |
| 10 | Durcissement : tests, sécurité, performance | ⏳ En attente | tester + reviewer + agent_x | — | 0 bug bloquant ; audit sécurité + accessibilité |
| 11 | Packaging, doc, livraison Dokploy | ⏳ En attente | agent_x + designer + reviewer | — | Isaac déploie seul en suivant DEPLOY_DOKPLOY.md |

---

**Légende** : 🔄 En cours | ⏳ En attente | ✅ Terminé | ⛔ Bloqué | 🔍 En review

**Dernière mise à jour** : 28/10/2026