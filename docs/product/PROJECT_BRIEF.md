# Project Brief — Hermes-Agent-Crossing

Statut : **proposition, en attente de validation** · Étape 00 · 2026-11-03

## Niveaux de preuve

Ce marquage vaut pour tous les documents de cadrage.

| Marque | Signification |
|---|---|
| **[Observé]** | Lu dans le code de Claude-Office, commit `1a9ba71` (2026-10-16). Le code n'a pas été exécuté. |
| **[Doc]** | Lu dans la documentation publique de Hermes. **Non vérifié sur l'instance déployée.** |
| **[Contexte]** | Indiqué par les prompts du projet, pas encore vérifié. |
| **[Hypothèse]** | Supposition à confirmer. |
| **[Proposé]** | Décision soumise à validation. |

## Vision

Hermes-Agent-Crossing est un bureau virtuel en pixel art, en vue orthogonale/top-down, où chaque agent Hermes prend la forme d'un personnage. L'utilisateur voit d'un coup d'œil qui est là et ce qui se passe, ouvre la fiche d'un agent et lui parle.

**Promesse produit : ce que le bureau montre est vrai, ou explicitement présenté comme inconnu ou simulé.** Le charme du pixel art ne doit jamais servir à simuler une activité.

## Utilisateurs cibles

| Profil | Besoin | Statut |
|---|---|---|
| Opérateur (propriétaire de l'instance Hermes) | Superviser ses agents, leur parler, comprendre ce qui se passe | **Cible MVP** [Proposé] |
| Administrateur | Associer personnages et agents, vérifier les connexions | Même personne que l'opérateur au MVP [Proposé] |
| Équipe (plusieurs comptes et rôles) | Accès partagé avec des droits différents | Ultérieur, voir Q4 |

## Principes non négociables

1. **Honnêteté de l'état** : aucune activité, aucun statut ni aucune réussite sans donnée source.
2. **Provenance visible** : chaque information indique si elle vient de Hermes, de l'application ou d'une simulation.
3. **Aucune capacité supposée** : un endpoint n'est utilisé qu'une fois vérifié sur la version installée.
4. **Secrets côté serveur** : ni navigateur, ni Git, ni logs.
5. **Réutilisation de l'infrastructure** : aucun service existant n'est recréé.
6. **Validation par phase** : preuves et tests, puis accord explicite avant la phase suivante.

## Les cinq notions à ne pas confondre

| Notion | Définition | Propriétaire | Exemple | Type (étape 08) |
|---|---|---|---|---|
| **Profil visuel** | Identité affichée : sprite, nom d'affichage, couleur, emplacement | Application | Le personnage « Jarvis » au bureau 3 | `CharacterProfile` |
| **Agent Hermes** | Agent ou configuration réellement définis dans Hermes | Hermes | Peut-être un profil Hermes nommé `jarvis` [Hypothèse] | `AgentDefinition` |
| **Session ou exécution** | Conversation ou run observé d'un agent, à un moment donné | Hermes | Une session et un run en cours | `AgentRuntime` |
| **Tâche locale** | Élément de suivi créé dans l'application | Application | « Relire le rapport de veille » | À définir à l'étape 10 |
| **Activité Hermes** | Événement ou tâche réellement remontés par Hermes | Hermes | `tool.started` ou un job planifié [Doc] | À définir à l'étape 10 |

Le lien entre un profil visuel et un agent est un objet explicite, `AgentBinding`. Conséquences :

- un personnage peut exister sans agent, et un agent sans personnage ;
- supprimer un personnage ne touche jamais à Hermes ;
- une tâche locale terminée ne dit rien de l'état d'un agent ;
- une activité observée n'est jamais convertie en tâche terminée sans preuve.

## Base de départ : ce que Claude-Office est réellement

Claude-Office est plus éloigné de la cible que « adapter le moteur » ne le laisse penser :

| Sujet | Constat [Observé] | Conséquence pour le projet |
|---|---|---|
| Rendu | React et DOM, positions en pourcentage (`src/agentManager.ts:14`), pas de moteur de tuiles ni de canvas | L'étape 05 construit un système de grille plus qu'elle n'adapte un moteur |
| Vue | Isométrique (`README.md:3`, `src/components/Character.tsx:37`) | Contraire à la direction artistique |
| Déplacement | Bornage à un polygone (`src/agentManager.ts:17`) et chemins entre waypoints (`findWaypointPath`), sans collisions sur grille | Collisions et navigation à créer |
| Personnages | PNG séparés sur 4 directions diagonales, par exemple 307×862 px | Pas des spritesheets de jeu : à redessiner |
| Chat | Boucle de polling qui lance `claude -p` (`scripts/chat-ai-watcher.sh:209`) | À remplacer entièrement par Hermes |
| Événements | Hooks Claude Code vers `POST /event` (`server/index.js:1786`) | Source à remplacer ; le pipeline aval est à évaluer |
| Déploiement | Écoute sur loopback uniquement, tout autre hôte est refusé (`server/index.js:66`) ; aucun Dockerfile | Modèle de sécurité à revoir pour un VPS |
| Stockage | SQLite via `better-sqlite3` | PostgreSQL existant à utiliser à la place [Proposé] |
| Taille | `server/index.js` : 3 753 lignes ; `src/officeReducer.ts` : 1 706 lignes | Découplage nécessaire, à chiffrer à l'étape 01 |

**Conclusion provisoire :** la valeur à réutiliser se trouve dans la logique et les interfaces, pas dans le moteur ni dans l'art. L'étape 01 doit confirmer ou infirmer ce constat.

## Conserver ou remplacer

Évaluation préliminaire, à confirmer à l'étape 01 (code) et à l'étape 02 (assets).

| Élément du projet source | Décision | Raison |
|---|---|---|
| Stack React, TypeScript, Vite, Express, `ws` | Conserver | Compatible avec la cible, aucun motif de réécriture |
| Tests Vitest et CI (le README annonce 972 tests, non exécutés) | Conserver ce qui reste applicable | Filet de sécurité et modèle de qualité |
| Machine d'états visuelle, reducer | Adapter | Logique utile, mais couplée à Claude Code |
| Inspecteur d'agent (`AgentCard`, `inspector.ts`) | Adapter | Correspond à la fiche agent |
| Tableau de tâches (`TaskBoard`, `taskBoard.ts`) | Adapter | Mais domaine à scinder : local et Hermes |
| Interface de chat (`SlackChat`) | Adapter | Garder l'interface, remplacer le transport |
| Registre de sessions (`server/sessions.js`) | Adapter | Modèle différent côté Hermes |
| Cartes de permission (`PermissionCard`) | Adapter plus tard | Hermes documente un mécanisme d'approbation [Doc] |
| Durcissement du serveur (jetons, contrôle d'origine) | Adapter | Bonnes pratiques à étendre à un vrai login |
| Rendu et déplacement (positions en %, polygone) | Remplacer | Vue orthogonale et collisions sur grille |
| Sprites et décors isométriques | Remplacer | Incompatibles ; ne pas mélanger les perspectives |
| Hooks et status line Claude Code, plugin `.claude-plugin` | Remplacer | Remplacés par l'adaptateur Hermes |
| `chat-ai-watcher.sh` et appels `claude -p` | Remplacer | Le chat doit passer par Hermes |
| SQLite | Remplacer | PostgreSQL existe déjà |
| Skin Dunder Mifflin | **Exclure** | Exclu de la licence MIT par `NOTICE.md` |
| Application Electron, icône de barre système | Abandonner au MVP | La cible est un service web sur VPS |
| Événements aléatoires (pizza, alerte incendie, pannes) | Abandonner au MVP | Décoratifs, risque de passer pour de l'activité réelle |
| Mode incident, compteurs de coût | Reporter | À revoir selon les données Hermes réelles |
| Passerelle A2A (`/a2a`) | Reporter | Hors besoin immédiat ; à évaluer |

## Documents liés

- [Périmètre MVP](MVP_SCOPE.md)
- [Parcours utilisateur](USER_JOURNEYS.md)
- [Hypothèses et risques](../project/ASSUMPTIONS_AND_RISKS.md)
- [Critères d'acceptation](../project/ACCEPTANCE_CRITERIA.md)
- [Jalons et livrables](../project/MILESTONES.md)
