# Réponses du propriétaire produit — Phase 0

Projet : **Hermes Agent Crossing** · Décidé par : Isaac Yao · Date : 28/10/2026
Ces réponses sont définitives pour la v1. Tout écart passe par un ADR (`docs/adr/`).

> **Nouvelle référence visuelle** : `docs/reference/mood.png` est remplacée par la maquette officielle « HERMES-AGENT-CROSSING » (mascotte robot à aile dorée, zones Agent Development / LLM & Inference / Strategy & Orchestration / Data & Knowledge / Product & UX / DevOps & Infra, lounge avec chat roux). C'est **la** cible d'ambiance.

| # | Sujet | Décision finale |
|---|---|---|
| 1 | Nom, logo, marques | ✅ Nom : **Hermes Agent Crossing**. Le logo part de la **mascotte de la maquette** (petit robot blanc aux yeux cyan, aile dorée, clin d'œil au casque ailé d'Hermès) avec le wordmark « HERMES-AGENT- » en blanc et « CROSSING » en orange. La mascotte et le logo doivent être redessinés en original par `designer` (pas de copie pixel à pixel d'une image générée). Le disclaimer du README cite Nous Research, Nintendo et The Pokémon Company (SPEC §1). Aucune reprise de la feuille ni de la typo d'Animal Crossing. |
| 2 | Palette | 🔁 **La palette est celle de la maquette.** Point de départ : `assets-src/palette.gpl`, avec **24 couleurs actives + 8 réservées** (32 max), extraites de `mood.png` (tableau ci-dessous). `designer` peut affiner chaque teinte à la pipette sur la maquette (± quelques points), sans ajouter de couleur hors palette. Pour les états : rouge `#e32137` = touché, orange `#f79b39` = dégradé/bloqué, miel `#ffca4e` = approbation, vert `#74b100` = OK, lavande `#a39cff` = réflexion. |
| 3 | Polices | ✅ **PixelOperator** (titres, boutons, HUD, enseignes). **Inter** (OFL) pour les textes longs : chat et descriptions. **JetBrains Mono** pour les blocs de code. |
| 4 | Assets CC0 vs original | ✅ Tout original sous Aseprite. Packs **Kenney (CC0)** autorisés comme **placeholders pendant le dev**. Avant v1.0.0 : mascotte, personnages, bureaux, enseignes, logo et icônes d'état sont 100 % originaux. Le petit décor CC0 peut rester s'il est crédité dans `CREDITS.md`. |
| 5 | Auth Dashboard API | ✅ Support des deux avec détection auto. Ordre : `X-Hermes-Session-Token` d'abord, puis basic auth (`/auth/password-login` + cookie, renouvelé à l'expiration). Le mode retenu est affiché dans « Tester la connexion ». |
| 6 | Sélection du board Kanban | ✅ `?board=<id>` par défaut, **à confirmer en phase 1** dans `plugins/kanban/dashboard/plugin_api.py`. Si Hermes fait autrement, on suit Hermes et on écrit un ADR. |
| 7 | Reprise du WS Kanban | ✅ Reconnexion avec `since=<last_event_id>` (backoff 1 s → 30 s) et polling de repli toutes les 5 s pendant la coupure. On repasse en WS dès qu'il revient. |
| 8 | Topologie de déploiement | 🔁 **Cible de prod : Dokploy (Traefik).** Configuration par défaut du `docker-compose.yml` : le conteneur sur le réseau `dokploy-network` + `extra_hosts: ["host.docker.internal:host-gateway"]` pour joindre un Hermes **natif sur le même VPS**. Côté Hermes, `API_SERVER_HOST` et le bind du dashboard sont ouverts uniquement à l'IP du bridge Docker, avec un pare-feu qui bloque 8642/9119 depuis Internet. Variante documentée si Hermes tourne en conteneur : réseau Docker externe partagé (`HERMES_API_URL=http://hermes:8642`). `network_mode: host` est documenté **hors Dokploy uniquement** (il casse le routage Traefik). Hermes distant (C) : doc Tailscale seulement. Les tests portent sur ces deux cibles. |
| 9 | Secrets v1 | ✅ `.env` (variables d'environnement Dokploy en prod) + volume `/data`. Rien d'autre en v1. |
| 10 | Langues | ✅ FR (par défaut) + EN, structure i18n prête pour les contributions. |
| 11 | Son | ✅ 3 bips maison, désactivés par défaut. |
| 12 | Cycle jour/nuit | ✅ Calculé côté client sur `instance.timezone` (fallback : fuseau du navigateur). Les fenêtres de la maquette montrent la ville : ciel et lumières de la ville suivent le cycle. |
| 13 | Mini-carte | ✅ **Oui, mini-carte incluse en v1.** Implémentation : caméra secondaire Phaser dans la même scène (zoom ~0.15), coin bas-gauche, cadre 9-slice, rectangle de la vue courante, clic = déplacement de la caméra, points colorés par état d'agent (rouge clignotant = touché). Repliable avec `M`. |
| 14 | Accessibilité | ✅ WCAG 2.1 AA sur les panneaux React. Monde Phaser en best effort, avec la liste latérale d'agents obligatoire comme alternative accessible. |
| 15 | Tests réels sur mon Hermes | ✅ E2E en CI contre `hermes-mock`. En plus, un script `pnpm smoke:real` **lecture seule (GET uniquement)** que je lance moi-même. Aucun test automatique n'écrit sur mon Hermes. |
| 16 | Version Hermes de référence | ✅ Noter la version (`GET /api/status`) **et** le commit HEAD de `NousResearch/hermes-agent` testé, avec une matrice de compatibilité dans le README. |
| 17 | Nombre max d'agents | ✅ 30 agents à 60 fps, pas d'optimisation au-delà en v1. |
| 18 | Bouton Stop | ✅ Visible seulement si un run est actif pour la session, sans confirmation, appelle `POST /v1/runs/{id}/stop`. **Phase 1 : vérifier que le stream `/api/sessions/{id}/chat/stream` expose un `run_id`.** Sinon, alternative par ADR. |
| 19 | Persistance des toasts | ✅ Toasts éphémères de 5 s. L'historique est dans l'onglet « Activité » ; les toasts d'approbation restent affichés tant qu'ils ne sont pas traités. |
| 20 | Colonne `archived` | ✅ Bouton « Afficher archivées » dans la barre Kanban, masquées par défaut. |

## Palette officielle v1 (extraite de la maquette)

| # | Hex | Rôle |
|---|---|---|
| 01 | `#0f0d11` | Encre — contours |
| 02 | `#1e2952` | Navy — panneaux, enseignes de zone |
| 03 | `#2a2a39` | Ardoise — murs, ombres |
| 04 | `#443467` | Violet nuit — ombres profondes |
| 05 | `#737e7e` | Acier — meubles métal |
| 06 | `#9a98a4` | Gris clair — chaises, détails |
| 07 | `#d4cec0` | Crème — canapés |
| 08 | `#ffffff` | Blanc — highlights, texte |
| 09 | `#dbb3a0` | Sol principal |
| 10 | `#f8cfa8` | Sol clair — halos de lumière |
| 11 | `#c8804c` | Bois — bureaux |
| 12 | `#73451d` | Bois sombre |
| 13 | `#f79b39` | Orange — accent « CROSSING », état dégradé/bloqué |
| 14 | `#ffca4e` | Miel — lampes, approbation requise |
| 15 | `#074402` | Vert profond — mur végétal |
| 16 | `#38633b` | Sauge — feuillage ombre |
| 17 | `#479b29` | Feuille |
| 18 | `#74b100` | Feuille claire — état OK |
| 19 | `#054555` | Teal sombre — écrans ombre |
| 20 | `#0a71b7` | Bleu écran |
| 21 | `#6fbefb` | Ciel — vitres, écrans clairs |
| 22 | `#30f5ff` | Cyan néon — yeux de la mascotte, icônes d'enseigne, texte néon |
| 23 | `#e32137` | Rouge — état **touché / down** |
| 24 | `#a39cff` | Lavande — IA, état réflexion |
| 25–32 | `#f896c5` `#6b82e4` `#fd7a61` `#dcb9f4` `#9cc7c7` `#b2727d` `#ffeeac` `#6b5552` | Réserve (couleurs de team, extensions) |

Couleurs de team par défaut : Team Dev = `#30f5ff` (cyan néon, comme les icônes d'enseigne de la maquette). Les teams suivantes piochent dans la réserve.

## Consignes complémentaires issues de la maquette

- **Enseignes de zone** : panneau navy `#1e2952` à coins arrondis, icône cyan + texte blanc PixelOperator, comme sur la maquette. Le texte vient du nom de team ou de pièce dans la config. Les libellés de la maquette (Agent Development, LLM & Inference…) sont des exemples, pas des pièces codées en dur.
- **Accueil central** : comptoir avec la mascotte et le logo. La mascotte peut servir de « guide » animé (clignement, petit flottement), sans être un agent.
- **Lounge + chat roux** : le chat est un PNJ décoratif qui dort et se déplace de temps en temps (clin d'œil Crossing). Désactivable dans les préférences.
- **Mur végétal néon** : slogan configurable (`instance.slogan`, défaut « Open Agents Better Workflows »).
- **Tableau de liège « COFFEE AGENTS IDEAS REPEAT »** : décor du coin café.

## Actions demandées
1. Si le repo s'appelle encore `yiek-industry`, le renommer `hermes-agent-crossing` et remplacer toutes les mentions YIEK (variables `CROSSING_*`, `crossing.config.yaml`).
2. Remplacer `docs/reference/mood.png` par la nouvelle maquette et ajouter `assets-src/palette.gpl`.
3. Intégrer ce fichier dans `docs/QUESTIONS.md` (statut « répondu ») et mettre à jour SPEC §8 (palette, couleurs d'état, mini-carte, mascotte, PNJ chat) dans la même PR.
4. ✅ **Feu vert pour la Phase 1** dès que cette PR est mergée.
