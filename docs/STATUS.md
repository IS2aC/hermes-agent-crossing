# Hermes Agent Crossing — Suivi des phases

| Phase | Nom | Statut | Responsable | Date cible | Risques / Notes |
|-------|-----|--------|-------------|------------|-----------------|
| 0 | Kickoff & cadrage | ✅ Terminé | dev-manager | 28/10/2026 | PR #1 mergée (toutes questions répondues, SPEC §8 mis à jour) |
| 1 | Contrat Hermes (discovery) | 🔄 En cours | **x** + tester | 29/10/2026 | Discovery endpoints réels sur NousResearch/hermes-agent + serveur Hermes Isaac (lecture seule) |
| 2 | Fondations du dépôt | ⏳ En attente | **x** | — | Stack imposée stricte (pnpm, Turborepo, Phaser 3, Fastify) |
| 3 | Design system & assets | ⏳ En attente | designer | — | Validation Isaac sur maquettes (Gate 3) ; assets originaux/CC0 uniquement |
| 4 | Backend : adapter, Status Engine, temps réel | ⏳ En attente | **x** + tester | — | Couverture ≥ 80 % sur hermes + status ; mode dégradé |
| 5 | Moteur du monde (Phaser) | ⏳ En attente | **x** + designer | — | 60 fps avec 30 agents ; layout déterministe |
| 6 | Agents vivants | ⏳ En attente | **x** + designer | — | 8 états, pathfinding, icône « touché » lisible |
| 7 | Interactions : panneau agent & chat | ⏳ En attente | **x** + designer | — | Test réel : discuter avec Jarvis depuis Crossing (Gate 7) |
| 8 | Kanban | ⏳ En attente | **x** + designer | — | DnD, temps réel, répercussions dans le monde |
| 9 | Onboarding, paramètres, plug & play | ⏳ En attente | **x** + designer | — | < 5 min pour un nouvel utilisateur sans éditer de YAML |
| 10 | Durcissement : tests, sécurité, performance | ⏳ En attente | tester + reviewer + **x** | — | 0 bug bloquant ; audit sécurité + accessibilité |
| 11 | Packaging, doc, livraison Dokploy | ⏳ En attente | **x** + designer + reviewer | — | Isaac déploie seul en suivant DEPLOY_DOKPLOY.md |

---

**Profils Hermes exacts** (source : `hermes profile list`) :
- `default` (= Jarvis, manager général)
- `dev-manager` (manager équipe dev)
- `x` (senior developer)
- `designer` (UI/UX)
- `tester` (tests automatisés)
- `reviewer` (relecture PR)
- `veilleur` (recherche & veille)

**Légende** : 🔄 En cours | ⏳ En attente | ✅ Terminé | ⛔ Bloqué | 🔍 En review

**Dernière mise à jour** : 28/10/2026