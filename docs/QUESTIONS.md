# Hermes Agent Crossing — Points ambigus & réponses validées

> **Toutes les 20 questions ont reçu une réponse définitive** (Isaac Yao, 28/10/2026). Voir `QUESTIONS_REPONSES.md` pour le détail complet. Ce fichier garde la trace des propositions initiales ; les décisions finales sont dans `QUESTIONS_REPONSES.md`.

---

## Récapitulatif des décisions

| # | Sujet | Décision finale |
|---|-------|-----------------|
| 1 | Nom, logo, marques | **Hermes Agent Crossing**. Logo = mascotte robot (yeux cyan, aile dorée) redessinée en original par `designer` + wordmark « HERMES-AGENT- » blanc / « CROSSING » orange. Disclaimer README (Nous Research, Nintendo, Pokémon). |
| 2 | Palette | **24 couleurs actives + 8 réservées** (32 max) extraites de la maquette officielle. Fichier `assets-src/palette.gpl`. Couleurs d'état : rouge `#e32137` (touché), orange `#f79b39` (dégradé/bloqué), miel `#ffca4e` (approbation), vert `#74b100` (OK), lavande `#a39cff` (réflexion). |
| 3 | Polices | **PixelOperator** (titres, boutons, HUD, enseignes). **Inter** (OFL) pour textes longs (chat, descriptions). **JetBrains Mono** pour code. |
| 4 | Assets CC0 vs original | Tout original sous Aseprite. Kenney (CC0) autorisé comme **placeholders dev uniquement** ; avant v1.0.0, mascotte, personnages, bureaux, enseignes, logo, icônes d'état = 100 % originaux. |
| 5 | Auth Dashboard API | Support des deux avec détection auto : `X-Hermes-Session-Token` prioritaire, puis basic auth (`/auth/password-login` + cookie renouvelé). Mode affiché dans « Tester la connexion ». |
| 6 | Sélection board Kanban | `?board=<id>` par défaut, **à confirmer en phase 1** dans `plugin_api.py`. Si Hermes fait autrement → ADR. |
| 7 | Reprise WS Kanban | Reconnexion `since=<last_event_id>` (backoff 1s→30s) + polling repli 5s pendant coupure. Retour WS dès dispo. |
| 8 | Topologie déploiement | **Prod = Dokploy (Traefik)**. `docker-compose.yml` défaut : réseau `dokploy-network` + `extra_hosts: ["host.docker.internal:host-gateway"]` pour Hermes natif même VPS. Variante Docker partagé documentée. `network_mode: host` hors Dokploy seulement. |
| 9 | Secrets v1 | `.env` (variables Dokploy en prod) + volume `/data`. Rien d'autre. |
| 10 | Langues | FR (défaut) + EN, structure i18n prête contributions. |
| 11 | Son | 3 bips maison, désactivés par défaut. |
| 12 | Cycle jour/nuit | Côté client sur `instance.timezone` (fallback fuseau navigateur). Ciel/lucioles ville suivent le cycle. |
| 13 | Mini-carte | **Incluse en v1**. Caméra secondaire Phaser (zoom ~0.15), coin bas-gauche, cadre 9-slice, rectangle vue courante, clic = déplacer caméra, points colorés par état (rouge clignotant = touché). Repliable `M`. |
| 14 | Accessibilité | WCAG 2.1 AA sur panneaux React. Monde Phaser best effort, liste latérale agents = alternative accessible obligatoire. |
| 15 | Tests réels Hermes | E2E CI contre `hermes-mock`. Script `pnpm smoke:real` **lecture seule (GET)** lancé manuellement par Isaac. Aucun test auto n'écrit. |
| 16 | Version Hermes référence | Noter version (`GET /api/status`) + commit HEAD `NousResearch/hermes-agent` testé. Matrice compatibilité dans README. |
| 17 | Agents max | 30 agents à 60 fps, pas d'optimisation au-delà en v1. |
| 18 | Bouton Stop | Visible seulement si run actif pour la session, sans confirmation, appelle `POST /v1/runs/{id}/stop`. **Phase 1 : vérifier que le stream expose `run_id`**, sinon ADR. |
| 19 | Persistance toasts | Éphémères 5s. Historique dans onglet « Activité ». Toasts approbation restent affichés tant que non traités. |
| 20 | Colonne `archived` | Bouton « Afficher archivées » dans barre Kanban, masquées par défaut. |

---

## Consignes complémentaires (issues de la maquette)

- **Enseignes de zone** : panneau navy `#1e2952` coins arrondis, icône cyan + texte blanc PixelOperator. Texte = nom team/pièce dans config (ex. maquette : Agent Development, LLM & Inference… = exemples).
- **Accueil central** : comptoir avec mascotte + logo. Mascotte = guide animé (clignement, flottement), pas un agent.
- **Lounge + chat roux** : PNJ décoratif (dort, se déplace), clin d'œil Animal Crossing. Désactivable dans préférences.
- **Mur végétal néon** : slogan configurable (`instance.slogan`, défaut « Open Agents Better Workflows »).
- **Tableau de liège** « COFFEE AGENTS IDEAS REPEAT » : décor coin café.

---

## Actions demandées (en cours dans cette PR)

1. ~~Repo s'appelait `yiek-industry` → renommé `hermes-agent-crossing` ✅ (board kanban déjà bon)~~
2. Remplacer `docs/reference/mood.png` par la nouvelle maquette + ajouter `assets-src/palette.gpl` → **à faire par `designer` en phase 3**
3. Mettre à jour `SPEC.md` §8 (palette, couleurs d'état, mini-carte, mascotte, PNJ chat) → **dans cette PR**
4. **Feu vert pour la Phase 1** dès merge de cette PR.

---

**Statut** : ✅ Toutes questions répondues — Prêt pour Phase 1