# Hermes Agent Crossing — Prompts de réalisation, phase par phase

Ce fichier contient **les prompts à envoyer à l'équipe d'agents Hermes**, du clonage jusqu'à la livraison sur Dokploy.
Chaque phase = un prompt à copier-coller, des livrables et un **gate** : on ne passe pas à la phase suivante tant que le gate n'est pas validé.

Conventions :
- `{{REPO_URL}}` = URL du dépôt GitHub (ex. `https://github.com/kaydantech/hermes-agent-crossing`).
- `{{OWNER}}` = organisation/compte GitHub (pour GHCR).
- Tu envoies chaque prompt à **Jarvis**, qui le transmet à **dev_manager**, qui découpe en cartes Kanban Hermes et assigne. (Tu peux aussi l'envoyer directement à dev_manager.)

---

## Étape préalable (toi, Isaac) — 10 min

1. Créer le dépôt GitHub vide `hermes-agent-crossing` (public, licence MIT).
2. Y pousser ces fichiers à la racine :
   ```
   AGENTS.md
   .env.example
   crossing.config.example.yaml
   docs/SPEC.md
   docs/PROMPTS.md
   ```
3. Ajouter l'image de référence de l'ambiance dans `docs/reference/mood.png`.
4. Donner à `agent_x` et `dev_manager` un token GitHub (scope `repo`, `workflow`, `write:packages`) via la config Hermes de leurs profils.
5. Créer un board Kanban Hermes dédié : `hermes kanban boards create hermes-agent-crossing --name "Hermes Agent Crossing"` (ou via le dashboard), puis assigner les cartes avec `hermes kanban --board hermes-agent-crossing …`.
6. Sur ton serveur Hermes, vérifier que l'API server est activé (`API_SERVER_ENABLED=true` + `API_SERVER_KEY` par profil) et noter l'URL du dashboard — la phase 1 en aura besoin pour tester en réel (en lecture seule).

---

## Phase 0 — Kickoff & cadrage

**Destinataire** : Jarvis → dev_manager

```text
Nouveau projet : Hermes Agent Crossing, un bureau virtuel en pixel art pour piloter nos agents Hermes (nous-mêmes).
Dépôt : {{REPO_URL}} — board Kanban Hermes : hermes-agent-crossing.

1. Clone le dépôt et lis intégralement, dans cet ordre : AGENTS.md, docs/SPEC.md, docs/PROMPTS.md, docs/reference/mood.png.
2. Produis docs/STATUS.md : tableau des phases 0 à 11 (statut, responsable, date cible, risques).
3. Liste dans docs/QUESTIONS.md tous les points ambigus de la SPEC, avec pour chacun ta proposition par défaut. Envoie la liste à Jarvis en un seul message. Si aucune réponse sous 24 h, applique tes propositions par défaut et note-le.
4. Crée sur le board hermes-agent-crossing une carte « epic » par phase (1 à 11) avec les critères d'acceptation copiés depuis docs/PROMPTS.md.
5. Ne démarre la phase 1 qu'après mon feu vert.

Critère de fin : STATUS.md et QUESTIONS.md poussés via PR, cartes epic créées, résumé de 10 lignes max envoyé à Jarvis.
```

**Gate 0** : tu as relu QUESTIONS.md et répondu (ou validé les défauts).

---

## Phase 1 — Contrat Hermes (discovery technique)

**Destinataire** : dev_manager → `agent_x` (lead) + `tester`

```text
Phase 1 — Contrat d'intégration Hermes. Objectif : savoir EXACTEMENT ce que Hermes expose, avant d'écrire une ligne d'application.

agent_x :
1. Clone https://github.com/NousResearch/hermes-agent (lecture seule, dans un dossier hors du repo Crossing).
2. Lis : website/docs/user-guide/features/api-server.md, features/kanban.md, features/web-dashboard.md, user-guide/profiles.md, user-guide/multi-profile-gateways.md, developer-guide/programmatic-integration.md.
3. Confirme dans le code source (gateway/platforms/api_server.py, hermes_cli/web_server.py, hermes_cli/web_routers/, plugins/kanban/dashboard/plugin_api.py) chaque endpoint listé dans SPEC §5.2 : méthode, chemin, auth, paramètres, forme de la réponse, codes d'erreur.
4. Vérifie spécifiquement :
   a. Comment authentifier un client serveur-à-serveur sur la Dashboard API (en-tête X-Hermes-Session-Token avec HERMES_DASHBOARD_SESSION_TOKEN fixé ; comportement quand le dashboard est bindé hors loopback ; flux /auth/password-login).
   b. Comment cibler un board Kanban précis via REST et via le WebSocket /api/plugins/kanban/events.
   c. Le routage multi-profils /p/<profile>/ et la clé propre à chaque profil.
   d. Comment détecter qu'un profil est « down » (gateway_running, /p/<profile>/health, /health/detailed).
   e. Comment savoir qu'un agent travaille (workers/active, runs, sessions actives) et qu'une approbation est en attente.
   f. Le format exact des événements SSE de /api/sessions/{id}/chat/stream.
5. Contre NOTRE serveur Hermes réel (lecture seule, aucun POST/PATCH), capture une réponse réelle de chaque GET, anonymise-la (aucune clé, aucun chemin perso, aucun contenu de conversation) et range-la dans packages/hermes-mock/fixtures/.
6. Rédige docs/HERMES_CONTRACT.md : tableau des endpoints retenus, exemples de requêtes/réponses, matrice auth, erreurs, version de Hermes testée (commit), et la section « Topologies » (SPEC §5.3) avec les variables Hermes à poser pour A, B et C.
7. Si un point de la SPEC est faux ou impossible : écris un ADR dans docs/adr/0001-*.md avec l'alternative.

tester :
1. À partir de HERMES_CONTRACT.md, écris la liste des scénarios de test d'intégration (docs/TEST_PLAN.md) : nominal, Hermes injoignable, 401, 429, 503 Retry-After, profil down, kanban vide, SSE coupé en cours de stream, capacités absentes.

Interdit : modifier quoi que ce soit sur le serveur Hermes, committer une clé.
Critère de fin : PR « docs: hermes contract » mergée après review.
```

**Livrables** : `docs/HERMES_CONTRACT.md`, `docs/TEST_PLAN.md`, `packages/hermes-mock/fixtures/*.json`, ADR éventuels.
**Gate 1** : reviewer a validé que chaque endpoint de SPEC §5.2 est soit confirmé, soit remplacé par ADR. Tu relis la section Topologies.

---

## Phase 2 — Fondations du dépôt

**Destinataire** : dev_manager → `agent_x`, review `reviewer`

```text
Phase 2 — Fondations. Respecte SPEC §4.2 (stack) et §4.3 (arborescence).

agent_x :
1. Initialise le monorepo pnpm + Turborepo : apps/web (Vite + React 18 + TS + Phaser 3), apps/server (Fastify + TS), packages/shared (zod + types), packages/hermes-mock (Fastify).
2. Configure : TypeScript strict partagé, ESLint, Prettier, Vitest dans chaque package, Playwright dans apps/web, lefthook (lint + typecheck en pre-commit), Conventional Commits (commitlint).
3. apps/server : route GET /healthz, chargement + validation zod de .env et de crossing.config.yaml (message d'erreur lisible, refus de démarrer sans CROSSING_ADMIN_PASSWORD_HASH ni CROSSING_SESSION_SECRET), sert le build de apps/web en statique, logs pino avec redaction des secrets.
4. packages/hermes-mock : sert les fixtures de la phase 1 sur les mêmes chemins que Hermes (ports 8642 et 9119), avec un mode « scénario » piloté par variable (MOCK_SCENARIO=nominal|agent_down|hermes_down|rate_limited) et une simulation d'activité (agents qui passent working/idle, événements kanban toutes les 10 s).
5. Dockerfile multi-stage (build pnpm → runtime node:22-alpine, utilisateur non-root, HEALTHCHECK sur /healthz, /data en volume), docker-compose.yml (service crossing seul) et docker-compose.dev.yml (crossing + hermes-mock).
6. Commande CLI intégrée : `node dist/cli.js hash-password '<pwd>'` (argon2) exposée comme `docker run … hash-password`.
7. GitHub Actions : ci.yml (install, lint, typecheck, test, build) sur PR ; docker.yml (build multi-arch amd64/arm64, push ghcr.io/{{OWNER}}/hermes-agent-crossing sur tag v*).
8. README minimal : quickstart dev (`pnpm i && pnpm dev` lance web + server + mock).

Critère de fin : `docker compose -f docker-compose.dev.yml up` affiche une page « Hermes Agent Crossing — hello » servie par le serveur, /healthz répond 200, CI verte.
```

**Gate 2** : CI verte, image construite localement, tag `v0.2.0`.

---

## Phase 3 — Design system & assets (en parallèle des phases 4)

**Destinataire** : dev_manager → `designer`, review `reviewer` + validation Isaac

```text
Phase 3 — Identité visuelle « pixel art frais et tranquille ». Référence d'ambiance : docs/reference/mood.png. Inspiration : jeux Pokémon GBA (vue 3/4 plongeante, chibi), MAIS tous les assets doivent être originaux ou CC0 — aucune reprise reconnaissable d'un jeu existant.

designer :
1. docs/DESIGN_SYSTEM.md : palette « Fresh & Calm » (≤ 32 couleurs, fichier assets-src/palette.gpl), grille 16×16, échelles autorisées, typographie (police pixel OFL + fallback), règles d'ombre/lumière, couleurs de team, composants UI, icônes d'état, règles d'accessibilité (contraste ≥ 4.5:1).
2. Tileset intérieur (assets-src/tiles/office.aseprite → export PNG + JSON) : sols (parquet clair, moquette, carrelage café, liseré de team), murs, vitres, portes, bureaux simples/doubles, bureau de manager, chaises, écrans (éteint / allumé / alerte rouge), plantes (5 variantes), canapés, table basse, machine à café, étagères, baies serveurs (voyants animés), tableau blanc, grand tableau Kanban mural, panneau de team suspendu, comptoir d'accueil avec logo Crossing.
3. Sprites personnages 16×32 : 6 bases (exec, lead, dev_hoodie, creative, qa, glasses, explorer + 1 générique recolorable) avec animations : idle 4 dir, marche 4 dir × 4 frames, assis-typing 2 dir, réflexion, gratter la tête (bloqué), KO/allongé (touché), fatigué (dégradé). Recoloration par palette (shader ou swap de palette documenté).
4. Portraits 48×48 pour chaque base (panneau agent).
5. Icônes d'état 16×16 animées (SPEC §8) — l'icône « touché » doit être immédiatement lisible : pansement + étoiles qui tournent.
6. UI kit : fenêtre 9-slice, boutons (normal/hover/pressed/disabled), onglets, champs, badges, toasts, curseur pixel, logo Hermes Agent Crossing (wordmark pixel + icône 32×32 + favicon).
7. Maquettes PNG (échelle ×3) : vue God complète, panneau agent (onglets Profil et Chat), Kanban, écran de connexion, assistant d'onboarding, état « Hermes injoignable ».
8. Script `pnpm assets:build` (avec agent_x si besoin) qui exporte les .aseprite en atlas dans apps/web/public/assets/.
9. assets-src/CREDITS.md : chaque ressource externe avec licence.

Critère de fin : maquettes envoyées à Jarvis pour validation par Isaac ; après validation, PR mergée.
```

**Gate 3** : **tu valides les maquettes** (c'est le moment de demander des ajustements d'ambiance).

---

## Phase 4 — Backend : adapter Hermes, Status Engine, temps réel

**Destinataire** : dev_manager → `agent_x`, tests `tester`, review `reviewer`

```text
Phase 4 — BFF. Base : docs/HERMES_CONTRACT.md (seuls endpoints autorisés), SPEC §5 et §6.

agent_x :
1. apps/server/src/hermes/ : deux clients typés (ApiServerClient, DashboardClient) avec timeout, retry exponentiel (max 3, respecte Retry-After), circuit breaker par surface, validation zod de chaque réponse, redaction des secrets dans les logs. Gestion des clés par profil (HERMES_KEY_<PROFILE> ou HERMES_PROFILE_KEYS JSON) et du préfixe /p/<profile>/.
2. Détection des capacités au démarrage (/v1/capabilities + sondes) → objet Capabilities exposé à l'UI (chat, kanban, profiles, analytics, approvals). Mode dégradé si une surface manque (SPEC §5.1).
3. AgentRegistry : fusion de crossing.config.yaml + GET /api/profiles (+ auto-ajout des profils inconnus dans l'open space général) → Agent[] (SPEC §6), avec model/provider, interactive = clé API valide.
4. StatusEngine (SPEC §5.4) : priorité des règles, lissage (min_state_duration), seuils configurables, sortie {state, since, cause, taskId, targetAgentId}. Détection des handoffs à partir des événements kanban (assignation, commentaire, request-review).
5. RealtimeHub : WebSocket /ws authentifié vers le navigateur, envoie un snapshot à la connexion puis des diffs (ServerEvent). Un seul polling Hermes mutualisé quel que soit le nombre de clients. Relais du WS kanban Hermes avec reprise via since=<last_event_id> après coupure.
6. API REST pour le front (toutes authentifiées) :
   GET /api/world (agents, teams, layout seed, capabilities)
   GET /api/agents/:id (profil détaillé + toolsets + usage)
   POST /api/agents/:id/sessions, GET /api/agents/:id/sessions, GET /api/sessions/:sid/messages
   POST /api/sessions/:sid/chat (relais SSE vers le navigateur)
   POST /api/runs/:rid/stop, POST /api/runs/:rid/approval
   GET /api/kanban/boards, GET /api/kanban/board?board=, GET/POST/PATCH /api/kanban/tasks, POST /api/kanban/tasks/:id/comments
   GET /api/hermes/test-connection (pour l'onboarding)
   Les sessions de chat créées par Crossing sont mémorisées en SQLite (agentId, hermesSessionId, titre, dates).
7. Auth Crossing : POST /api/auth/login (argon2, rate-limit 10/min/IP), cookie de session HttpOnly Secure SameSite=Strict, CSRF sur les mutations, POST /api/auth/logout, headers de sécurité (SPEC §9).

tester :
1. Tests unitaires StatusEngine (une table de cas par règle de priorité + lissage).
2. Tests d'intégration server ↔ hermes-mock pour chaque scénario de docs/TEST_PLAN.md.
3. Objectif couverture ≥ 80 % sur src/hermes et src/status.

Critère de fin : avec hermes-mock en scénario agent_down, GET /api/world renvoie l'agent concerné en state "down" avec sa cause ; CI verte ; couverture atteinte.
```

**Gate 4** : tag `v0.4.0`, démonstration par `curl` des endpoints contre le mock **et** (lecture seule) contre ton Hermes réel.

---

## Phase 5 — Moteur du monde (Phaser)

**Destinataire** : dev_manager → `agent_x` + `designer`, review `reviewer`

```text
Phase 5 — Le monde. Base : SPEC §3.1, DESIGN_SYSTEM.md, assets de la phase 3.

agent_x :
1. Intègre Phaser 3 dans apps/web (scène Boot/Preload/World/UI), config pixelArt: true, roundPixels: true, zoom entier uniquement, redimensionnement responsive.
2. Prefabs de pièces dans assets-src/maps/ (Tiled .tmj) : hall, private_office, open_space_general, team_open_space_{2,4,6,8} (poste manager + îlots), kanban_room, coffee_corner, server_room, couloirs. Chaque prefab déclare des objets nommés : desk_slot, manager_desk, door, poi_coffee, poi_plant, kanban_wall, team_sign.
3. LayoutGenerator (déterministe via world.seed) : à partir des teams/agents, place les prefabs sur une grille, relie par couloirs, attribue un poste à chaque agent, produit la grille de collision et la liste des points d'intérêt. Test unitaire : même config + même seed = même layout.
4. Caméra : mode God (pan souris/clavier, zoom molette ×1–×4, labels de noms, mini-carte cliquable), mode Suivi (F), raccourcis SPEC §3.1, sauts 1..9 vers les pièces.
5. Panneau de team suspendu rendu avec le nom et la couleur de la team ; liseré de sol à la couleur de la team.
6. Cycle jour/nuit optionnel (teinte + lampes), désactivable.

designer :
1. Ajuste les prefabs dans Tiled pour l'esthétique (densité de plantes, lumière, décor), vérifie le rendu à ×2, ×3, ×4.

Critère de fin : avec la config d'exemple, le monde affiche hall, bureau privé de Jarvis, open space Team Dev (poste manager + 4 postes), open space général, salle Kanban, café, salle serveurs ; 60 fps avec 30 agents factices ; captures ×3 jointes à la PR.
```

**Gate 5** : tag `v0.5.0`, GIF de navigation en mode God.

---

## Phase 6 — Agents vivants

**Destinataire** : dev_manager → `agent_x`, assets `designer`, tests `tester`

```text
Phase 6 — Les agents bougent et reflètent leur état réel. Base : SPEC §3.2, StatusEngine (phase 4).

agent_x :
1. Classe AgentSprite : chargement de la base + recoloration palette, animations (idle, walk, sit-typing, thinking, scratch-head, KO, tired), étiquette de nom, bulle de statut, icône d'état animée.
2. Pathfinding A* (easystarjs ou équivalent) sur la grille de collision, évitement simple des autres agents, vitesse ≈ 2 tuiles/s.
3. Machine à états comportementale branchée sur le WebSocket /ws :
   working → va au poste, s'assoit, écran allumé, bulle titre de tâche ;
   thinking → bulle « … » ;
   idle → promenades pondérées (poste 50 %, café 20 %, plante 15 %, collègue de team 15 %), jamais dans un bureau privé d'autrui ;
   meeting → marche jusqu'au poste de targetAgentId, bulle commune ~8 s ;
   blocked → ⚠ + gratte la tête ;
   waiting_approval → ✋ clignotant + badge dans le HUD ;
   down → allongé/grisé à son poste + icône « touché » + écran rouge, tooltip cause ;
   degraded → fatigué + nuage.
4. Liste latérale d'agents (accessible clavier, lecteur d'écran) synchronisée avec le monde ; prefers-reduced-motion → téléportation au lieu de marche.
5. Salle serveurs : voyants verts/orange/rouges selon hermes.health.

tester :
1. Tests Playwright contre hermes-mock : passage nominal → agent_down → l'icône « touché » apparaît sur le bon agent en < 10 s ; retour nominal → l'icône disparaît.
2. Test visuel (screenshot Playwright) de chaque état sur un agent isolé.

Critère de fin : GIF montrant les 8 états, tests verts.
```

**Gate 6** : tag `v0.6.0`.

---

## Phase 7 — Interactions : panneau agent & chat

**Destinataire** : dev_manager → `agent_x` + `designer`, tests `tester`

```text
Phase 7 — Parler aux agents. Base : SPEC §3.3.

1. Clic sur un agent (ou sur la liste) → panneau latéral pixel (9-slice) avec onglets Profil / Chat / Donner une tâche / Activité.
2. Profil : portrait, nom, profil Hermes, rôle, team, manager, MODÈLE + PROVIDER, gateway_running, état courant + depuis quand + cause, description, skills, toolsets, tâche en cours (lien Kanban), usage 7/30 j si dispo.
3. Chat : liste des sessions Crossing de l'agent, nouvelle session, streaming token par token, lignes d'outils repliables (started/completed/failed), bouton Stop, carte Approuver/Refuser si approbation en attente, rendu markdown sûr (pas de HTML brut), reprise propre si le flux est coupé.
4. Agent non interactif ou down : onglet Chat désactivé avec explication (« pas de clé API pour ce profil » / « agent touché : gateway arrêté »).
5. Donner une tâche : formulaire (titre, description markdown, priorité, board, dépendances) → crée la carte Kanban assignée ; option « laisser le manager répartir » (triage assigné au manager de la team).
6. Activité : fil chronologique des événements de l'agent.
7. HUD : barre du haut (instance, voyant global, compteurs actifs/inactifs/touchés, tâches en cours, approbations), toasts (agent tombé/revenu, tâche terminée, approbation requise).

tester : E2E « envoyer un message à agent_x et recevoir une réponse streamée », « assigner une tâche au designer → carte visible dans le Kanban », « agent down → chat désactivé ».

Critère de fin : parcours testés en vrai contre ton Hermes (avec ton accord) et en CI contre le mock.
```

**Gate 7** : tag `v0.7.0`. **Test réel** : tu discutes avec Jarvis depuis Crossing au lieu de Telegram.

---

## Phase 8 — Kanban

**Destinataire** : dev_manager → `agent_x` + `designer`, tests `tester`

```text
Phase 8 — Kanban pixel. Base : SPEC §3.4.

1. Ouverture via le tableau mural de la salle Kanban, la touche K ou la barre du haut ; vue plein écran par-dessus le monde (le monde reste animé en arrière-plan flouté).
2. Colonnes triage, todo, ready, running, blocked, review, done (+ archived optionnel). Sélecteur de board, filtres assigné / team / tenant.
3. Cartes : titre, avatar pixel de l'assigné, priorité, badges (bloqué, PR, commentaires), âge.
4. Glisser-déposer (dnd-kit) → PATCH statut ; confirmation pour archive/done ; rollback optimiste si erreur.
5. Détail carte : description, commentaires (ajout), événements, runs, liens parent/enfant, artefacts.
6. Temps réel via /ws (relais du WS Kanban Hermes).
7. Répercussions dans le monde : running → l'assigné s'assoit ; review → le reviewer va voir l'auteur ; done → confettis pixel au-dessus du poste.

tester : E2E DnD, mise à jour temps réel entre deux onglets, reprise après coupure du WS.

Critère de fin : GIF d'une carte qui traverse le board pendant que l'agent réagit dans le monde.
```

**Gate 8** : tag `v0.8.0`.

---

## Phase 9 — Onboarding, paramètres, plug & play

**Destinataire** : dev_manager → `agent_x` + `designer`

```text
Phase 9 — Rendre Crossing branchable sur n'importe quel Hermes. Base : SPEC §3.6, §5.3, §7.

1. Écran de connexion Crossing (pixel), déconnexion, expiration de session.
2. Assistant de premier lancement si la connexion Hermes est absente/invalide : saisie URL API + URL dashboard (les clés restent dans .env ; l'assistant indique quelles variables poser), bouton « Tester la connexion » → ✓/✗ par capacité avec message d'aide précis (ex. « 401 sur /p/agent_x : la clé HERMES_KEY_AGENT_X ne correspond pas à l'API_SERVER_KEY du profil »).
3. Éditeur de teams : glisser les agents dans des teams, choisir le manager, cocher bureau privé, choisir sprite/palette, renommer → écrit /data/crossing.config.yaml (sauvegarde .bak), régénère le monde à chaud.
4. Préférences : jour/nuit, son, langue (FR par défaut, EN fourni — i18n prêt pour la communauté), zoom par défaut.
5. Page « À propos » : version Crossing, version Hermes détectée, capacités actives.

Critère de fin : partant d'un volume /data vide et d'un .env rempli, un nouvel utilisateur obtient son bureau en < 5 min sans éditer de YAML.
```

**Gate 9** : tag `v0.9.0`. Test par quelqu'un d'extérieur si possible.

---

## Phase 10 — Durcissement : tests, sécurité, performance

**Destinataire** : dev_manager → `tester` (lead) + `reviewer` + `agent_x`

```text
Phase 10 — Qualité avant release.

tester :
1. Dérouler tout docs/TEST_PLAN.md ; compléter les E2E des parcours critiques : login, monde, états, chat, tâche, Kanban, onboarding, mode dégradé (API seule / dashboard seul).
2. Test de charge : 30 agents mock, 5 onglets ouverts, 1 h → mémoire stable, ≤ 1 requête/5 s/endpoint vers Hermes, 60 fps desktop.
3. Test de panne : couper Hermes 2 min puis le relancer → tout le monde « touché » puis récupération automatique sans recharger la page.

reviewer :
1. Audit sécurité selon SPEC §9 : secrets (grep historique git), headers, CSP, cookies, CSRF, rate-limit, image non-root, `pnpm audit`, scan Trivy de l'image (0 vulnérabilité critique).
2. Audit accessibilité (axe-core sur les panneaux, navigation clavier complète).

agent_x : corrige les cartes ouvertes ; budget bundle < 500 Ko gzip hors assets.

Critère de fin : 0 bug bloquant/majeur ouvert, rapport docs/QA_REPORT.md.
```

**Gate 10** : tag `v1.0.0-rc.1`.

---

## Phase 11 — Packaging, documentation, livraison

**Destinataire** : dev_manager → `agent_x` + `designer` (visuels README) + `reviewer`

```text
Phase 11 — Release v1.0.0 et déploiement Dokploy.

agent_x :
1. docker-compose.yml final (image ghcr.io/{{OWNER}}/hermes-agent-crossing:1.0.0, volume crossing-data:/data, env_file .env, healthcheck, restart unless-stopped, labels optionnels) + variantes documentées pour les topologies A (network_mode: host), B (réseau Docker externe partagé avec Hermes) et C (Tailscale).
2. docs/DEPLOY_DOKPLOY.md, pas à pas :
   - créer un projet Dokploy → Compose → source GitHub {{REPO_URL}} (branche main) ou image GHCR ;
   - renseigner les variables d'environnement dans l'onglet Environment de Dokploy ;
   - monter le volume persistant /data ;
   - configurer le domaine + HTTPS (Let's Encrypt) dans Dokploy, port interne 8080 ;
   - côté Hermes : variables à poser (API_SERVER_ENABLED, API_SERVER_KEY par profil, API_SERVER_HOST, HERMES_DASHBOARD_SESSION_TOKEN, bind) selon la topologie, puis redémarrer le gateway ;
   - vérification : /healthz, puis l'assistant « Tester la connexion » ;
   - mise à jour : changer le tag d'image et redéployer ; sauvegarde du volume /data.
3. README communauté : pitch, GIF de démo, captures, quickstart 5 min, compatibilité Hermes (commit/versions testées), FAQ (agent toujours « touché », 401, CORS non requis, etc.), roadmap v2.
4. CONTRIBUTING.md (créer un sprite, ajouter un prefab de pièce, ajouter une langue), SECURITY.md, CODE_OF_CONDUCT.md, templates d'issues/PR, CHANGELOG.md.
5. Release GitHub v1.0.0 avec notes ; image multi-arch publiée par la CI.

designer : visuels README (bannière, GIF, captures), social preview du repo.

reviewer : relecture finale de toute la doc en suivant DEPLOY_DOKPLOY.md sur une machine vierge.

Critère de fin : Isaac déploie sur son VPS Dokploy en suivant uniquement DEPLOY_DOKPLOY.md, voit son équipe dans le bureau, discute avec Jarvis et déplace une carte Kanban.
```

**Gate 11 (livraison)** : tu valides en production → tag `v1.0.0`, annonce communauté.

---

## Annexe A — Prompt de relance (à envoyer si une phase dérive)

```text
dev_manager : point d'étape phase {{N}}. Donne-moi en 10 lignes max : cartes terminées / en cours / bloquées, écarts vs critères d'acceptation de docs/PROMPTS.md, risques, et ce dont tu as besoin de ma part. Ne démarre aucune nouvelle carte hors périmètre de la phase.
```

## Annexe B — Prompt de correction de bug (pendant ou après la v1)

```text
Bug Hermes Agent Crossing : {{description, capture, étapes}}.
tester : reproduis avec hermes-mock (ajoute un scénario si nécessaire) et écris le test qui échoue.
agent_x : corrige jusqu'à ce que le test passe, sans régression.
reviewer : review avec la checklist d'AGENTS.md.
dev_manager : release patch (v1.0.x) et mets à jour le CHANGELOG.
```

## Annexe C — Ordre et parallélisme

```
P0 → P1 → P2 ─┬─ P3 (designer) ──────────┐
              └─ P4 (agent_x + tester) ──┴→ P5 → P6 → P7 → P8 → P9 → P10 → P11
```
Les phases 3 et 4 tournent en parallèle ; la phase 5 a besoin des deux.
