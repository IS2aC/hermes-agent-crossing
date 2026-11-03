# Matrice de réutilisation

Commit `1a9ba71`. Lecture statique : la maturité est une appréciation, le code n'a pas été exécuté.

| Fonctionnalité | Emplacement | Dépendances | Maturité | Décision | Raison |
|---|---|---|---|---|---|
| Bureau pixel-art | `src/App.tsx`, `src/components/FurnitureRenderer.tsx`, `src/rooms.ts` | React, images | Élevée pour l'isométrique | **Remplacer** | Positions en %, décor peint en isométrique |
| Personnages | `src/components/Character.tsx`, `src/assets.ts` | Sprites diagonaux | Élevée pour l'isométrique | **Remplacer** | 4 diagonales, images individuelles |
| Déplacements | `src/agentManager.ts` | `rooms.ts` | Moyenne | **Remplacer** | Polygone et waypoints, pas de grille |
| Scènes scriptées | `agentManager.ts`, `src/interactions.ts`, `src/events.ts` | `theme.ts` | Élevée | **Abandonner** | Simulent une activité qui n'existe pas |
| Machine d'états de session | `src/mainState.ts`, `src/types.ts:102` | Événements Claude | Élevée | **Adapter** | Bon vocabulaire : working, waiting, needs-you, error |
| Inspecteur d'agent | `src/inspector.ts`, `src/components/AgentCard.tsx` | `/agents/:id`, transcript | Élevée | **Adapter** | Structure utile, source à changer |
| Chat (interface) | `src/components/SlackChat.tsx` | `/chat`, WebSocket | Élevée | **Adapter** | Interface utile |
| Chat (backend) | `server/chat-db.js`, `scripts/chat-*.{sh,py}` | SQLite, `claude -p` | Moyenne | **Remplacer** | Doit passer par Hermes ; polling par scripts shell |
| Tableau de tâches | `src/taskBoard.ts`, `src/components/TaskBoard.tsx`, `server/tasks.js` | Fichiers de tâches Claude | Élevée | **Adapter** | Interface reprise ; à scinder en local et Hermes |
| Événements et journal | `server/index.js:1786`, `src/officeReducer.ts` | Hooks | Élevée | **Adapter** | Concept repris, sources et modèle à revoir (provenance, confiance) |
| Permissions | `server/permissions.js`, `src/permissions.ts`, `src/components/PermissionCard.tsx` | Hook `PermissionRequest` | Élevée | **Adapter, après le MVP** | Modèle transposable aux approbations Hermes, à confirmer |
| Registre de sessions | `server/sessions.js` | Fichiers et PID locaux | Élevée | **Remplacer** | Lecture de processus locaux, impossible avec Hermes distant |
| Temps réel | `src/hooks/useAgentSocket.ts`, `server/index.js` (`/ws`) | `ws` | Élevée | **Adapter** | Snapshot + diffusion : schéma à garder |
| Santé | `server/health.js` | Express | Élevée | **Adapter** | Module indépendant |
| Authentification | `server/index.js:279`, `src/officeToken.ts` | Fichier de jeton | Élevée en local | **Remplacer** | Pas de comptes ; modèle loopback |
| Compteurs | `server/status.js`, `server/meterEstimate.js`, `src/meters.ts` | Status line Claude | Élevée | **Reporter** | Source Hermes à confirmer |
| Mode incident | `src/incident.ts`, `IncidentLayer.tsx` | Signaux de commandes | Élevée | **Reporter** | Signaux non identifiés côté Hermes |
| Cycle jour/nuit | `src/daylight.ts` | Horloge | Élevée | **Reporter** | Décoratif, facile à reprendre |
| Sons | `src/sounds.ts` | Web Audio | Élevée | **Reporter** | Hors MVP |
| Passerelle A2A | `server/index.js:2527-2554` | Jeton | Moyenne | **Abandonner au MVP** | Hors besoin |
| Électron | `electron/` | Electron | Élevée | **Abandonner** | La cible est un service web |
| Skin Dunder Mifflin | `src/theme.ts`, `public/sprites/office/` | Non libre | — | **Exclure** | Hors licence MIT (`NOTICE.md`) |
| Outil de placement | `src/components/PlacementHelper.tsx` | `rooms.ts` | Moyenne | **Abandonner** | Lié aux coordonnées en % ; la scène sera décrite sur grille |
| Contrôle des assets | `scripts/check-assets.mjs` | Node | Élevée | **S'en inspirer** | Reprendre l'idée, adaptée à nos manifestes |

## Risques de réutilisation

1. **Importer `officeReducer.ts` tel quel** ferait entrer les scènes scriptées dans le domaine.
2. **Importer `server/index.js`** apporterait A2A, le loopback et le monolithe. Préférer les modules `mount*`.
3. **`src/theme.ts`** contient des citations exclues de la licence : ne pas l'importer sans nettoyage.
