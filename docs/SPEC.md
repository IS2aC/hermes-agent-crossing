# Hermes Agent Crossing — Cahier des charges

> Bureau virtuel en pixel art pour piloter une équipe d'agents **Hermes Agent** (Nous Research).
> Ce document est la **source de vérité** du projet. Toute décision qui s'en écarte doit être consignée dans `docs/adr/` (Architecture Decision Record) et validée par `dev_manager`.

Version du document : 1.0 — 28/10/2026
Propriétaire produit : Isaac Yao (Kaydan Technology)
Équipe de réalisation : `dev_manager` (lead), `agent_x` (senior dev), `designer`, `tester`, `reviewer`

---

## 1. Vision

Aujourd'hui, le pilotage des agents Hermes se fait via Telegram : un fil de messages, sans vue d'ensemble. **Hermes Agent Crossing** remplace ce fil par un **lieu** : un bureau virtuel vu de dessus, en pixel art, où l'on voit chaque agent travailler, se déplacer, attendre, tomber en panne, et où l'on peut cliquer sur n'importe lequel pour lui parler, lui confier une tâche ou inspecter son profil.

Trois promesses :

1. **Voir** — en un coup d'œil, savoir qui travaille, sur quoi, qui est bloqué, qui est « touché » (down).
2. **Agir** — parler à un agent, lui assigner une tâche, déplacer une carte Kanban, sans quitter le bureau.
3. **Brancher** — n'importe quel propriétaire d'un serveur Hermes existant doit pouvoir lancer Hermes Agent Crossing avec un `docker compose up` et un fichier `.env`, sans modifier Hermes.

### Ambiance visuelle

Le nom est un clin d'œil à *Animal Crossing* : un petit monde paisible où l'on passe voir ses voisins (ici, ses agents) qui vaquent à leurs occupations. Pixel art top-down **dans l'esprit des jeux Pokémon de la génération GBA** (vue plongeante 3/4, tuiles 16×16, personnages chibi de 16×24/16×32), mais avec une identité **fraîche et tranquille** : palette pastel douce, beaucoup de plantes, lumière chaude, bois clair, verre, écrans lumineux, coin café. L'image de référence fournie (bureau Kaydan, zones « Data Engineering », « AI/ML », « Strategy & PM », etc.) donne le ton : bureau moderne, cosy, lisible.

> ⚠️ **Propriété intellectuelle** : « dans l'esprit de » ≠ copie. Aucun sprite, tuile, police, son ou personnage provenant de Pokémon, d'Animal Crossing (ou de tout autre jeu) ne doit être utilisé ou imité de façon reconnaissable. Tous les assets sont **originaux** (créés par `designer`) ou sous licence **CC0** (ex. packs Kenney) avec attribution dans `assets/CREDITS.md`. Les packs payants non redistribuables (ex. LimeZu) sont **interdits** puisque le repo est public.
>
> **Avertissement à placer dans le README** : « Hermes Agent Crossing est un projet communautaire indépendant, non affilié à Nous Research ni à Nintendo. Hermes Agent est un projet de Nous Research ; Animal Crossing et Pokémon sont des marques de Nintendo / The Pokémon Company. » Le logo et le nom ne doivent reprendre ni la typographie ni les éléments graphiques d'Animal Crossing (feuille, police arrondie caractéristique, etc.).

---

## 2. Contexte : l'équipe d'agents de référence

L'instance Hermes du propriétaire contient ces **profils** (un profil Hermes = un agent) :

| Profil | Rôle | Rattachement |
|---|---|---|
| `jarvis` | Manager général | Bureau privé (direction) |
| `dev_manager` | Manager de l'équipe dev | Open space **Team Dev** (poste de manager) |
| `agent_x` | Senior developer | Open space **Team Dev** |
| `designer` | Designer | Open space **Team Dev** |
| `tester` | Tests automatisés | Open space **Team Dev** |
| `reviewer` | Relecture des PR | Open space **Team Dev** |
| `veilleur` | Collecte d'infos, scraping, recherche web | **Open space général** (aucune team) |

> Les noms exacts des profils doivent être vérifiés avec `GET /api/profiles` (voir §5). L'application ne doit **jamais** coder ces noms en dur : ils viennent de la configuration (§7) et de la découverte automatique.

---

## 3. Périmètre fonctionnel

### 3.1 Le monde (vue principale)

- **Carte composée de pièces** générées automatiquement à partir de la configuration :
  - **Hall / réception** (point d'entrée, logo Hermes Agent Crossing, comptoir).
  - **Bureaux privés** : un par agent marqué `office: private` (ex. Jarvis). Porte vitrée, plaque nominative.
  - **Open space général** : tous les agents sans team.
  - **Un open space par team** : le manager a un poste distinct (bureau plus grand, tableau blanc derrière lui), les membres ont des postes en îlots face à face. Panneau suspendu avec le nom de la team (comme sur l'image de référence).
  - **Salle Kanban** (ou « War room ») : un grand tableau mural cliquable qui ouvre le Kanban.
  - **Coin café / lounge** : lieu de pause des agents inactifs.
  - **Salle serveurs** (décorative, voyants qui clignotent selon l'état du gateway Hermes).
- **Génération de layout** : la carte est assemblée à partir de *prefabs* de pièces (fichiers Tiled `.tmj`) disposés par un algorithme de grille. Ajouter une team dans la config ajoute un open space ; ajouter un membre agrandit l'îlot (prefab paramétré par nombre de postes : 2, 4, 6, 8).
- **Caméra** :
  - **Mode God** (par défaut) : vue d'ensemble, pan (glisser / flèches / WASD), zoom molette (×1 à ×4, entiers pour garder des pixels nets), étiquettes de nom et bulles de statut au-dessus de chaque agent, mini-carte.
  - **Mode Suivi** : la caméra suit l'agent sélectionné.
  - Raccourcis : `G` = God, `F` = suivre, `K` = Kanban, `Échap` = fermer panneau, `1..9` = sauter à une pièce.
- **Cycle jour/nuit optionnel** basé sur l'heure locale (teinte douce, lampes allumées le soir). Désactivable.

### 3.2 Les agents (sprites vivants)

Chaque agent a un sprite (4 directions × marche 3–4 frames + assis/typing + dormir/KO) et une **machine à états** pilotée par les données Hermes :

| État Crossing | Source Hermes (voir §5.4) | Comportement visuel |
|---|---|---|
| `working` | worker Kanban actif pour ce profil, ou run/session en cours | Va à son poste, s'assoit, animation de frappe, écran allumé, bulle avec le titre de la tâche (tronqué) |
| `thinking` | run en cours sans événement depuis > 20 s | Assis, bulle « … » animée |
| `idle` | gateway OK, aucune activité | Se balade : poste ↔ café ↔ plantes ↔ collègue de la team ; jamais dans un bureau privé d'un autre |
| `meeting` | handoff détecté (commentaire / assignation d'un agent vers un autre, review demandée) | Marche jusqu'au poste de l'autre agent, bulle 💬 commune pendant ~8 s |
| `blocked` | tâche assignée en statut `blocked` | Assis, icône ⚠ orange, sprite qui se gratte la tête |
| `waiting_approval` | run en attente d'approbation humaine | Icône ✋ clignotante + badge sur le bouton de l'agent : **l'utilisateur doit agir** |
| `down` (« touché ») | gateway du profil arrêté, health KO, erreur d'auth, ou Hermes injoignable | Sprite allongé/grisé à son poste, **icône « touché »** (pansement + étoiles qui tournent, façon KO), voyant rouge sur son écran. Tooltip : cause précise |
| `degraded` | quota / 429 / rate limit, dernier run en échec | Icône 🔥 ou nuage gris, sprite fatigué |
| `unknown` | donnée indisponible (endpoint absent) | Sprite normal, point d'interrogation discret |

Règles :
- Le pathfinding (A* sur la grille de collision) évite meubles et autres agents ; vitesse ~2 tuiles/s.
- Les transitions d'état sont **lissées** : un état doit durer ≥ 3 s avant d'en changer, pour éviter le clignotement.
- **Agent interactif vs non interactif** : un agent est « interactif » si Crossing possède un moyen de lui envoyer un message (clé API Hermes valide pour ce profil, §5.2). Sinon, son panneau affiche « Lecture seule » et le bouton Chat est désactivé avec explication.
- Un agent découvert sur Hermes mais absent de la config apparaît automatiquement dans l'**open space général** avec un sprite généré (palette tirée d'un hash du nom).

### 3.3 Panneau agent (clic sur un agent)

Panneau latéral droit, style « fenêtre de jeu » (bordure pixel, police pixel lisible), avec onglets :

1. **Profil**
   - Avatar (portrait 48×48), nom d'affichage, nom de profil Hermes, rôle, team, manager.
   - **Modèle IA connecté** + provider (ex. `anthropic / claude-…`, `openrouter / …`) — source `GET /api/profiles` (`model`, `provider`).
   - État du gateway (`gateway_running`), état Crossing courant + depuis quand, cause si `down`.
   - Description du profil, nombre de skills, toolsets actifs (si `GET /v1/toolsets` dispo).
   - Tâche en cours (lien vers la carte Kanban), dernières tâches terminées.
   - Consommation (tokens / coût sur 7 et 30 jours) si `GET /api/analytics/usage` dispo.
2. **Chat**
   - Conversation en streaming avec l'agent (SSE relayé par le backend Crossing).
   - Affichage des événements d'outils (`tool.started` / `tool.completed` / `tool.failed`) sous forme de petites lignes repliables.
   - Historique des sessions Crossing avec cet agent, possibilité de démarrer une nouvelle session.
   - Bouton **Stop** pour interrompre un run en cours.
   - Si une approbation est demandée : carte Approuver / Refuser.
3. **Donner une tâche**
   - Formulaire : titre, description (markdown), priorité, board, dépendances optionnelles → crée une carte Kanban assignée à cet agent.
   - Option « Laisser le manager répartir » : crée la tâche en `triage` assignée au manager de la team.
4. **Activité**
   - Fil chronologique : événements Kanban liés à l'agent, runs, erreurs.

### 3.4 Kanban

- Accessible via la salle Kanban (clic sur le tableau mural), le raccourci `K` ou la barre du haut.
- Colonnes = statuts Hermes : `triage`, `todo`, `ready`, `running`, `blocked`, `review`, `done` (`archived` masqué par défaut).
- Sélecteur de **board** (multi-projets Hermes) et filtre par **assigné**, **team**, **tenant**.
- Cartes : titre, avatar pixel de l'assigné, priorité, badges (bloqué, PR liée, nb commentaires), âge.
- **Glisser-déposer** entre colonnes → `PATCH` du statut ; confirmation pour les transitions destructives.
- Détail d'une carte : description, commentaires (ajout possible), événements, runs, liens parent/enfant, artefacts.
- Temps réel via le flux d'événements Kanban de Hermes (WebSocket) relayé par le backend.
- Les changements Kanban se reflètent **dans le monde** : une carte qui passe en `running` fait asseoir l'agent ; en `review` le reviewer se lève et va voir l'auteur ; en `done` petite animation de confettis pixel au-dessus du poste.

### 3.5 Barre supérieure & HUD

- Logo Hermes Agent Crossing, nom de l'instance Hermes, voyant global (vert / orange / rouge) issu de `/api/status` et `/health`.
- Compteurs : agents actifs / inactifs / touchés, tâches en cours, approbations en attente.
- Notifications toast : agent tombé, agent revenu, tâche terminée, approbation requise.
- Bouton paramètres (connexion Hermes, teams, préférences d'affichage, son on/off).

### 3.6 Onboarding & paramètres

- Au premier lancement sans configuration valide : **assistant de connexion** (URL de l'API Hermes, URL du dashboard Hermes, clés), bouton « Tester la connexion » qui appelle chaque endpoint et affiche ✓/✗ par capacité (chat, profils, kanban, analytics).
- Éditeur de teams en interface (glisser des agents dans des teams, choisir le manager, choisir bureau privé) → écrit `crossing.config.yaml` dans le volume.
- Le fichier de config reste la source de vérité ; l'UI ne fait que l'éditer.

### 3.7 Hors périmètre v1

- Multi-utilisateurs avec rôles (v1 = un administrateur unique).
- Édition libre de la carte par l'utilisateur (v1 = layout généré ; v2 = éditeur).
- Application mobile native (v1 = web responsive, le monde est consultable sur tablette ; sur mobile, vue liste + chat).
- Voix / audio en temps réel.

---

## 4. Architecture

### 4.1 Vue d'ensemble

```
 Navigateur ──HTTPS──▶ Hermes Agent Crossing (1 conteneur)
                        ├─ SPA (React + Phaser), servie en statique
                        └─ BFF Node (Fastify)
                             ├─ Auth Crossing (session cookie)
                             ├─ Hermes Adapter ──▶ Hermes API server (:8642, Bearer, /p/<profile>/…)
                             │                 └─▶ Hermes Dashboard API (:9119, X-Hermes-Session-Token)
                             ├─ Status Engine (agrège → états Crossing)
                             ├─ Realtime Hub (WebSocket vers le navigateur)
                             └─ SQLite (volume) : sessions de chat Crossing, préférences, cache
```

**Principe non négociable** : le navigateur ne parle **jamais** directement à Hermes. Les clés Hermes restent côté serveur. Cela évite les problèmes de CORS, de fuite de secrets et permet d'agréger/cacher.

### 4.2 Stack imposée

| Couche | Choix | Raison |
|---|---|---|
| Monorepo | **pnpm workspaces** + Turborepo | Partage des types front/back |
| Langage | **TypeScript strict** partout | |
| Front | **Vite + React 18** | UI (panneaux, Kanban, formulaires) |
| Moteur 2D | **Phaser 3** (dernière 3.x stable) | Tilemaps Tiled natives, sprites, caméra, pixel-perfect |
| État front | **Zustand** + **TanStack Query** | |
| UI kit | Composants maison stylés pixel (CSS + `image-rendering: pixelated`), **Radix UI** pour l'accessibilité des primitives | |
| Kanban DnD | **dnd-kit** | |
| Back | **Node 22 LTS + Fastify** | SSE/WS simples, rapide |
| Validation | **zod** (schémas partagés dans `packages/shared`) | Toutes les réponses Hermes sont validées |
| Persistance | **SQLite** (better-sqlite3) + Drizzle ORM | Zéro service externe |
| Tests | **Vitest** (unit), **Playwright** (E2E), **MSW** / serveur mock Hermes | |
| Cartes | **Tiled** (`.tmj` JSON) | Standard, éditable par la communauté |
| Assets | **Aseprite** (sources `.aseprite` versionnées) → spritesheets PNG + JSON | |
| Conteneur | Docker multi-stage, image finale `node:22-alpine`, utilisateur non-root | |
| CI | GitHub Actions : lint, typecheck, tests, build, image → **GHCR** | |

Toute substitution passe par un ADR.

### 4.3 Structure du dépôt

```
hermes-agent-crossing/
├─ AGENTS.md                  # règles de travail des agents (lire en premier)
├─ README.md                  # quickstart communauté
├─ LICENSE                    # MIT
├─ docker-compose.yml         # déploiement standard
├─ docker-compose.dev.yml     # dev avec mock Hermes
├─ Dockerfile
├─ .env.example
├─ crossing.config.example.yaml
├─ apps/
│  ├─ web/                    # SPA React + Phaser
│  │  ├─ src/game/            # scènes Phaser, layout generator, pathfinding, sprites
│  │  ├─ src/ui/              # panneaux, HUD, Kanban, design system
│  │  └─ public/assets/       # spritesheets, tilesets, maps, fonts (générés)
│  └─ server/                 # BFF Fastify
│     ├─ src/hermes/          # adapter + clients + schémas zod
│     ├─ src/status/          # status engine
│     ├─ src/realtime/        # hub WS
│     ├─ src/auth/
│     └─ src/config/          # chargement + validation crossing.config.yaml
├─ packages/
│  ├─ shared/                 # types, schémas zod, contrats d'événements
│  └─ hermes-mock/            # faux serveur Hermes pour dev & tests
├─ assets-src/                # .aseprite, .tmx/.tmj sources, palette
│  └─ CREDITS.md
└─ docs/
   ├─ SPEC.md                 # ce fichier
   ├─ PROMPTS.md              # les étapes de réalisation
   ├─ HERMES_CONTRACT.md      # contrat vérifié avec Hermes (phase 1)
   ├─ DESIGN_SYSTEM.md        # palette, grille, typo, composants (phase 3)
   ├─ DEPLOY_DOKPLOY.md
   └─ adr/
```

---

## 5. Intégration Hermes (le « plug »)

> Les endpoints ci-dessous proviennent de la documentation officielle du dépôt `NousResearch/hermes-agent` (oct. 2026). **La phase 1 doit les vérifier contre le code source** et produire `docs/HERMES_CONTRACT.md` avec des exemples de réponses réelles. Aucun endpoint ne doit être utilisé s'il n'y figure pas.

### 5.1 Deux surfaces Hermes

| Surface | Port par défaut | Auth | Usage Crossing |
|---|---|---|---|
| **API server** (gateway, `API_SERVER_ENABLED=true`) | `8642` | `Authorization: Bearer <API_SERVER_KEY>` ; en multi-profil, préfixe `/p/<profile>/` avec la clé **propre à chaque profil** | Chat, runs, sessions, santé, capacités, skills/toolsets |
| **Dashboard API** (`hermes dashboard`) | `9119` | En-tête `X-Hermes-Session-Token` (= `HERMES_DASHBOARD_SESSION_TOKEN` fixé côté Hermes) en bind loopback ; sinon fournisseur d'auth (basic/OAuth) | Profils (modèle, provider, gateway_running), statut global, Kanban, workers actifs, analytics |

Crossing doit fonctionner en **mode dégradé** si une seule surface est configurée :
- API server seul → chat OK, statut via health, pas de Kanban ni de profils détaillés (profils listés depuis la config).
- Dashboard seul → monde, profils, Kanban OK, chat désactivé (agents « lecture seule »).

### 5.2 Endpoints utilisés (à confirmer en phase 1)

**API server**
- `GET /health`, `GET /health/detailed` — liveness / readiness (par profil via `/p/<profile>/…`).
- `GET /v1/capabilities` — détection des fonctionnalités → active/désactive les boutons de l'UI.
- `POST /api/sessions` — créer une session de chat.
- `GET /api/sessions/{id}/messages` — historique.
- `POST /api/sessions/{id}/chat/stream` — tour de chat en SSE (`assistant.delta`, `assistant.commentary`, `tool.started`, `tool.completed`, `tool.failed`, `run.completed|failed|cancelled`). Ignorer les lignes `: keepalive`.
- `POST /v1/runs/{run_id}/stop`, `POST /v1/runs/{run_id}/approval` — contrôle des runs.
- `GET /v1/toolsets`, `GET /v1/skills` — enrichissement du profil.
- Gérer : `429` (cap de runs concurrents → retry avec backoff), `503` + `Retry-After` (drain), `401` (clé invalide → agent `down` cause « auth »), `409 permission_denied`.

**Dashboard API**
- `GET /api/status` — version, état du gateway, plateformes, pression mémoire/disque.
- `GET /api/profiles` — `name`, `display_name`, `model`, `provider`, `gateway_running`, `description`, `skill_count`, `is_default`.
- `GET /api/plugins/kanban/board?…` — board complet par colonne.
- `GET|POST|PATCH /api/plugins/kanban/tasks[/:id]`, `POST /api/plugins/kanban/tasks/:id/comments`.
- `WS /api/plugins/kanban/events?since=<id>` — flux temps réel des `task_events`.
- `GET /api/plugins/kanban/workers/active` — workers en cours (profil, tâche, heartbeat).
- `GET /api/plugins/kanban/inspect` — snapshot du dispatcher.
- `GET /api/analytics/usage?days=30` — tokens et coûts.
- Boards multiples : vérifier en phase 1 comment le board est sélectionné côté REST (paramètre/en-tête).

### 5.3 Topologies de déploiement supportées

| # | Topologie | Configuration |
|---|---|---|
| A | Crossing et Hermes sur le **même VPS**, Hermes en natif (systemd) | `network_mode: host` **ou** `extra_hosts: ["host.docker.internal:host-gateway"]` + Hermes bindé sur l'IP du bridge Docker. Recommandé : A1 = host network |
| B | Crossing et Hermes dans le **même réseau Docker** (Hermes via son `docker-compose.yml` officiel) | Réseau externe partagé, `HERMES_API_URL=http://hermes:8642` |
| C | Hermes sur une **autre machine** | Tunnel privé (Tailscale/WireGuard) recommandé ; jamais exposer l'API server Hermes publiquement |

La phase 1 doit tester au moins A et B et documenter les variables Hermes à poser (`API_SERVER_HOST`, `API_SERVER_KEY`, `HERMES_DASHBOARD_SESSION_TOKEN`, etc.).

### 5.4 Status Engine (calcul de l'état d'un agent)

Le backend recalcule l'état de chaque agent toutes les **5 s** (polling) et à chaque événement temps réel, puis pousse un diff au navigateur.

Ordre de priorité (le premier qui matche gagne) :

1. Hermes injoignable (timeout 3 s sur `/health` ou `/api/status`) → **tous** `down` (cause : `hermes_unreachable`).
2. `gateway_running == false` pour le profil, ou `/p/<profile>/health` KO, ou 401 → `down` (cause : `gateway_stopped` | `auth_failed` | `health_failed`).
3. Run en attente d'approbation → `waiting_approval`.
4. Dernière erreur 429/quota < 5 min, ou dernier run `failed` < 5 min → `degraded`.
5. Tâche assignée `blocked` → `blocked`.
6. Worker actif ou run en cours → `working` (ou `thinking` si aucun événement depuis 20 s).
7. Handoff dans les 10 dernières secondes → `meeting` (avec `target_agent`).
8. Sinon → `idle`.

Chaque état porte `{ state, since, cause?, task?, target_agent? }`. Les seuils sont configurables.

### 5.5 Robustesse

- Chaque appel Hermes : timeout, retry exponentiel (max 3), circuit breaker par surface.
- Toute réponse est validée par zod ; un champ manquant ne fait pas planter (valeurs `unknown`).
- `GET /v1/capabilities` est appelé au démarrage puis toutes les 10 min ; l'UI masque ce qui n'est pas supporté.
- Les secrets n'apparaissent jamais dans les logs (redaction).

---

## 6. Modèle de données Crossing (partagé front/back)

```ts
type AgentState = 'working'|'thinking'|'idle'|'meeting'|'blocked'|'waiting_approval'|'down'|'degraded'|'unknown';

interface Agent {
  id: string;              // = nom du profil Hermes
  displayName: string;
  role?: string;
  teamId?: string;         // undefined = open space général
  isManager: boolean;
  office: 'private'|'desk';
  sprite: { base: string; palette?: string[] };
  model?: string; provider?: string;
  interactive: boolean;    // chat possible
  status: { state: AgentState; since: string; cause?: string; taskId?: string; targetAgentId?: string };
}

interface Team { id: string; name: string; managerId?: string; memberIds: string[]; color: string; }

interface WorldLayout { rooms: Room[]; desks: Desk[]; poi: PointOfInterest[]; } // généré par le serveur ou le client (décision en phase 5)

// Événements temps réel BFF → navigateur (WebSocket /ws)
type ServerEvent =
  | { type: 'agent.status'; agentId: string; status: Agent['status'] }
  | { type: 'agent.upsert'; agent: Agent }
  | { type: 'kanban.event'; boardId: string; event: unknown }
  | { type: 'chat.delta'; sessionId: string; text: string }
  | { type: 'chat.tool'; sessionId: string; phase: 'started'|'completed'|'failed'; name: string }
  | { type: 'hermes.health'; level: 'ok'|'degraded'|'down' }
  | { type: 'toast'; level: 'info'|'warn'|'error'; message: string };
```

---

## 7. Configuration

### 7.1 Variables d'environnement (`.env`)

Voir `.env.example`. Points clés :
- `CROSSING_ADMIN_USER` / `CROSSING_ADMIN_PASSWORD_HASH` (argon2) — **obligatoire**, l'app refuse de démarrer sans.
- `CROSSING_SESSION_SECRET` — 32+ octets aléatoires.
- `HERMES_API_URL`, `HERMES_API_KEY` (clé du profil par défaut) et `HERMES_PROFILE_KEYS` (JSON `{"agent_x":"…"}` ou variables `HERMES_KEY_<PROFILE>`).
- `HERMES_DASHBOARD_URL`, `HERMES_DASHBOARD_SESSION_TOKEN` (ou `HERMES_DASHBOARD_USER`/`PASSWORD` si auth basic).
- `CROSSING_CONFIG_PATH=/data/crossing.config.yaml`, `CROSSING_DATA_DIR=/data`.

### 7.2 Fichier `crossing.config.yaml`

Voir `crossing.config.example.yaml`. Il décrit **les teams, les bureaux, les rôles et les sprites**, jamais les secrets. Validé par zod au démarrage ; erreur lisible si invalide.

---

## 8. Design system (résumé — détaillé en phase 3 dans `docs/DESIGN_SYSTEM.md`)

- **Grille** : tuiles 16×16, personnages 16×32 (tête+corps), rendu à l'échelle entière ×2/×3/×4, `pixelArt: true`, `roundPixels: true`.
- **Palette officielle v1** (32 couleurs max = 24 actives + 8 réservées) : extraite de la maquette officielle, fichier `assets-src/palette.gpl`.
  - Couleurs principales : encre `#0f0d11`, navy `#1e2952` (panneaux, enseignes), ardoise `#2a2a39`, violet nuit `#443467`, acier `#737e7e`, gris clair `#9a98a4`, crème `#d4cec0`, blanc `#ffffff`.
  - Sols : principal `#dbb3a0`, clair `#f8cfa8`.
  - Bois : `#c8804c` / sombre `#73451d`.
  - Accents : orange `#f79b39` (CROSSING, dégradé/bloqué), miel `#ffca4e` (lampes, approbation), rouge `#e32137` (**touché / down**), lavande `#a39cff` (IA, réflexion), vert feuille claire `#74b100` (OK).
  - Végétation : vert profond `#054555`, sauge `#38633b`, feuille `#479b29`.
  - Écrans : teal sombre `#054555`, bleu `#0a71b7`, ciel `#6fbefb`, cyan néon `#30f5ff` (yeux mascotte, icônes enseignes, texte néon).
  - Réserve (8) : `#f896c5` `#6b82e4` `#fd7a61` `#dcb9f4` `#9cc7c7` `#b2727d` `#ffeeac` `#6b5552` (couleurs de team, extensions).
  - **Team Dev par défaut** = cyan néon `#30f5ff`.
- **Couleur par team** : liseré au sol de l'open space + panneau suspendu + badge sur la carte Kanban.
- **Typo** : **PixelOperator** (titres, boutons, HUD, enseignes) ; **Inter** (OFL) pour textes longs (chat, descriptions) ; **JetBrains Mono** pour code.
- **Icônes d'état** 16×16 animées : travail (clavier), réflexion (…), pause (tasse), réunion (bulle), bloqué (⚠), approbation (main), **touché** (pansement + étoiles tournantes, rouge `#e32137`), dégradé (nuage, orange `#f79b39`), inconnu (?).
- **UI** : fenêtres à bordure pixel 9-slice, boutons à 3 états, ombres portées 1 px. Thème clair par défaut, thème nuit (cycle jour/nuit l'active).
- **Mini-carte** (v1) : caméra secondaire Phaser dans la même scène (zoom ~0.15), coin bas-gauche, cadre 9-slice, rectangle de la vue courante, clic = déplacer caméra principale, points colorés par état d'agent (rouge clignotant = touché). Repliable touche `M`.
- **Mascotte** : petit robot blanc yeux cyan + aile dorée (clin d'œil casque ailé d'Hermès), redessinée en original par `designer`. Présente à l'accueil central comme guide animé (clignement, flottement), pas un agent.
- **PNJ chat roux** : décoratif dans le lounge, dort et se déplace parfois. Désactivable dans les préférences.
- **Enseignes de zone** : panneau navy `#1e2952` coins arrondis, icône cyan + texte blanc PixelOperator. Texte = nom team/pièce dans la config (ex. maquette : Agent Development, LLM & Inference… = exemples).
- **Mur végétal néon** : slogan configurable (`instance.slogan`, défaut « Open Agents Better Workflows »).
- **Son** (optionnel, off par défaut) : 3 bips maison, aucun son tiré d'un jeu existant.
- **Accessibilité** : WCAG 2.1 AA sur les panneaux React. Monde Phaser en best effort, liste latérale d'agents obligatoire comme alternative accessible (clavier + lecteur d'écran) ; `prefers-reduced-motion` réduit les déplacements.

---

## 9. Sécurité

- Crossing expose des agents capables d'exécuter des commandes : **auth obligatoire**, cookie `HttpOnly; Secure; SameSite=Strict`, rate-limit sur `/login` (10/min/IP), CSRF token sur les mutations.
- Headers : CSP stricte (aucun script externe), `X-Frame-Options: DENY`, HSTS derrière TLS.
- Les clés Hermes ne quittent jamais le serveur ; jamais dans le bundle, les logs, les réponses API.
- Conteneur non-root, système de fichiers en lecture seule sauf `/data`.
- Dépendances scannées en CI (`pnpm audit`, Trivy sur l'image).
- `SECURITY.md` avec procédure de signalement.

## 10. Performance

- 60 fps sur un laptop moyen avec 30 agents ; 30 fps minimum sur tablette.
- Bundle initial < 500 Ko gzip hors assets ; assets chargés par atlas.
- Charge Hermes : polling ≤ 1 requête/5 s par endpoint agrégé, quel que soit le nombre d'onglets ouverts (le BFF mutualise).

## 11. Livrables finaux (Definition of Done du projet)

- [ ] `docker compose up -d` avec `.env` rempli → application fonctionnelle connectée à un Hermes existant, sans toucher Hermes (hors variables documentées).
- [ ] Image publiée sur `ghcr.io/<owner>/hermes-agent-crossing:1.0.0` et `:latest`, multi-arch (amd64 + arm64).
- [ ] Monde généré depuis la config : bureau privé Jarvis, open space Team Dev (dev_manager + 4 membres), open space général (veilleur), salle Kanban, café, hall.
- [ ] États des agents conformes au §3.2, dont l'icône « touché » quand un profil est down (testé en coupant un gateway).
- [ ] Panneau agent : profil avec modèle/provider, chat streaming, assignation de tâche, activité.
- [ ] Kanban complet temps réel avec DnD.
- [ ] Mode God + mode Suivi + mini-carte.
- [ ] Mode dégradé si une seule surface Hermes est configurée.
- [ ] Couverture de tests : ≥ 80 % sur `apps/server/src/hermes` et `src/status`, E2E Playwright des parcours critiques verts en CI contre `hermes-mock`.
- [ ] Docs : README (quickstart 5 min), `docs/HERMES_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`, `docs/DEPLOY_DOKPLOY.md`, `CONTRIBUTING.md`, `SECURITY.md`, `assets-src/CREDITS.md`, CHANGELOG.
- [ ] Captures d'écran et GIF de démo dans le README.
