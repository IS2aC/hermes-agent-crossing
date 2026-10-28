# Hermes Agent Crossing — Points ambigus & propositions par défaut

> Si aucune réponse sous 24 h (d'ici le 29/10/2026 12:00), les propositions par défaut seront appliquées et notées ici.

---

## 1. Identité visuelle — Nom & logo
**Question** : Le nom « Hermes Agent Crossing » et le logo doivent-ils être validés par Nous Research ? Risque de confusion avec la marque « Hermes Agent ».
**Proposition par défaut** : On garde le nom tel quel (c'est le nom du dépôt GitHub). Le logo sera un wordmark pixel original + icône 32×32 (porte de bureau + flèche), sans feuille ni police Animal Crossing. Disclaimer dans le README (cf. SPEC §2).

---

## 2. Palette de couleurs — Nombre exact
**Question** : La SPEC dit « ≤ 32 couleurs ». Faut-il viser exactement 32 (pour la nostalgie GBA) ou moins pour la lisibilité ?
**Proposition par défaut** : 24 couleurs (palette « Fresh & Calm » + 8 couleurs de team dynamiques). Laisse 8 slots pour futures extensions.

---

## 3. Police pixel — Choix précis
**Question** : Quelle police pixel OFL ? Options : `PixelOperator` (lisible, 8×8), `Press Start 2P` (trop large), `VT323` (étroite), `JetBrains Mono` Nerd Font (fallback système).
**Proposition par défaut** : `PixelOperator` pour l'UI (titres, boutons, bulles) + `JetBrains Mono` (fallback) pour le chat et les descriptions longues. Les deux sont OFL.

---

## 4. Packs d'assets CC0 — Kenney vs autres
**Question** : La SPEC cite « packs Kenney » comme exemple CC0. Faut-il en utiliser pour le mobilier (bureaux, plantes, café) ou tout faire en Aseprite original ?
**Proposition par défaut** : Tout en Aseprite original pour l'identité visuelle. Si le calendrier presse, on piochera dans *Kenney Office Pack* (CC0) pour le mobilier secondaire, avec attribution dans `assets-src/CREDITS.md`.

---

## 5. Authentification Dashboard API — Session token vs basic auth
**Question** : La SPEC §5.1 mentionne deux modes : `X-Hermes-Session-Token` (bind loopback) OU basic auth. Lequel est réellement déployé sur le serveur Hermes d'Isaac ?
**Proposition par défaut** : On implémente **les deux** dans `DashboardClient` (détection auto : si `HERMES_DASHBOARD_SESSION_TOKEN` défini → header ; sinon si `HERMES_DASHBOARD_USER/PASSWORD` → basic auth). La phase 1 confirmera.

---

## 6. Sélection du board Kanban — Paramètre REST
**Question** : La SPEC §5.2 note : « vérifier en phase 1 comment le board est sélectionné côté REST (paramètre/en-tête) ». Y a-t-il un seul board ou plusieurs ?
**Proposition par défaut** : On suppose un **paramètre query `?board=<id>`** sur `/api/plugins/kanban/board` et `/api/plugins/kanban/tasks`. La phase 1 validera ; sinon ADR.

---

## 7. WebSocket Kanban — Reprise après coupure
**Question** : Le WS `/api/plugins/kanban/events?since=<id>` renvoie-t-il les événements manqués ou faut-il re-poller le board complet ?
**Proposition par défaut** : On implémente la reprise via `since=<last_event_id>` (standard Hermes). Si non supporté → fallback polling complet toutes les 5 s.

---

## 8. Topologie de déploiement cible — Laquelle valider en priorité ?
**Question** : La SPEC §5.3 liste A (même VPS, host network), B (même réseau Docker), C (machine distante + tunnel). Laquelle est la config réelle d'Isaac ?
**Proposition par défaut** : On développe et teste **A (network_mode: host)** et **B (réseau Docker partagé)**. Topologie C documentée seulement. Le `docker-compose.yml` final inclura les 3 variantes commentées.

---

## 9. Gestion des secrets — `.env` vs gestionnaire de secrets
**Question** : La SPEC impose `.env` + volume `/data`. Faut-il prévoir l'intégration avec Docker secrets / 1Password / Vault pour la v1 ?
**Proposition par défaut** : **Non** pour la v1. `.env` + volume `/data` (comme spécifié). ADR pour v2 si demandé.

---

## 10. Internationalisation — Langues au lancement
**Question** : La SPEC §3.6 dit « FR par défaut, EN fourni — i18n prêt ». Faut-il inclure d'autres langues (ES, DE, JP) dès la v1 ?
**Proposition par défaut** : **FR + EN uniquement** en v1. Structure i18n (JSON par locale) prête pour contributions communautaires.

---

## 11. Son — Activé par défaut ?
**Question** : La SPEC §8 dit « son optionnel, off par défaut ». Faut-il inclure des bips doux (créés maison) ou laisser complètement muet ?
**Proposition par défaut** : Inclure 3 bips maison (notification, succès, erreur) en `.ogg` + `.mp3`, **désactivés par défaut** (toggle dans les préférences). Aucun son tiré de jeux.

---

## 12. Cycle jour/nuit — Basé sur l'heure serveur ou client ?
**Question** : La SPEC §3.1 dit « basé sur l'heure locale ». Côté serveur (BFF) ou côté navigateur ?
**Proposition par défaut** : **Côté client** (navigateur) — plus simple, pas de sync, respecte le fuseau de l'utilisateur. Le serveur ne gère que l'état des agents.

---

## 13. Mini-carte — Implémentation
**Question** : La SPEC §3.1 mentionne une mini-carte cliquable. Canvas séparé ou rendu Phaser redimensionné ?
**Proposition par défaut** : Second canvas Phaser (même scène, caméra fixe, échelle 0.15), cliquable pour téléporter la caméra principale.

---

## 14. Accessibilité — Niveau cible
**Question** : La SPEC §8 demande « contraste ≥ 4.5:1 », « liste latérale clavier + lecteur d'écran », `prefers-reduced-motion`. Visons-nous WCAG 2.1 AA complet ?
**Proposition par défaut** : **WCAG 2.1 AA** sur tous les panneaux (UI React). Le monde Phaser reste « meilleure effort » (liste latérale = alternative accessible).

---

## 15. Tests E2E réels — Accord pour tester sur le Hermes d'Isaac
**Question** : Les Gates 4, 7, 11 demandent des tests « en vrai » contre le serveur Hermes d'Isaac. Isaac donne-t-il son accord pour que la CI / les agents fassent des appels en lecture seule sur son instance ?
**Proposition par défaut** : On prépare tout pour tourner contre `hermes-mock` en CI. Les tests réels se font **manuellement par Isaac** (il lance `docker compose -f docker-compose.dev.yml up` et valide). Pas d'appels automatisés vers son serveur sans accord explicite.

---

## 16. Version Hermes de référence — Commit / tag précis
**Question** : La phase 1 doit noter « version de Hermes testée (commit) ». Quel commit/tag Hermes est déployé chez Isaac ?
**Proposition par défaut** : On note la version au moment de la phase 1 (lecture de `GET /api/status` → `version`). Si pas de version exposée → commit HEAD du repo NousResearch/hermes-agent à la date de la phase 1.

---

## 17. Nombre d'agents max dans le monde — Performance
**Question** : La SPEC §10 vise « 30 agents à 60 fps ». Faut-il tester / optimiser pour plus (ex. 50, 100) ?
**Proposition par défaut** : On cible **30 agents** comme spécifié. Si le code tient 50 sans régression, tant mieux. Pas d'optimisation prématurée au-delà.

---

## 18. Bouton « Stop » dans le chat — Comportement exact
**Question** : La SPEC §3.3 : « Bouton Stop pour interrompre un run en cours ». Cela appelle `POST /v1/runs/{run_id}/stop` ? Et si plusieurs runs ?
**Proposition par défaut** : On affiche le bouton **seulement si un run est en cours pour cette session**. Appel `POST /v1/runs/{run_id}/stop` sur le run actif. Si plusieurs → on liste les runs avec un bouton Stop chacun.

---

## 19. Notifications toast — Persistance
**Question** : Les toasts (agent tombé, tâche terminée, approbation) doivent-ils persister après rechargement de page ?
**Proposition par défaut** : **Non** — toasts éphémères (5 s). L'historique est dans l'onglet « Activité » du panneau agent.

---

## 20. Archiver les colonnes Kanban — `archived` masqué par défaut
**Question** : La SPEC §3.4 : « `archived` masqué par défaut ». Faut-il un bouton « Afficher archivées » ou une colonne spéciale ?
**Proposition par défaut** : Toggle « Afficher archivées » dans la barre du Kanban. Quand activé, colonne `archived` apparaît à droite de `done`.

---

**Fin de la liste** — 20 questions. Réponds par numéro (ex. « 5 : basic auth only », « 12 : côté serveur ») ou « tout valider » pour appliquer les défauts.