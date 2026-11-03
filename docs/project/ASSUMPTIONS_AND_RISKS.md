# Hypothèses, risques, dépendances et questions ouvertes

Statut : **proposition, en attente de validation** · Étape 00 · 2026-11-03

Les marques [Observé], [Doc], [Contexte], [Hypothèse] et [Proposé] sont définies dans le [brief](../product/PROJECT_BRIEF.md).

## Limites de ce cadrage

- **Instance Hermes :** aucun accès depuis cet environnement. Sa version, sa configuration et ses agents **n'ont pas pu être confirmés**.
- **Documentation Hermes :** lue le 2026-11-03 sous forme de résumé automatique des pages web. Elle peut différer de la version installée.
- **Claude-Office :** lecture ciblée d'un clone en lecture seule, hors du dépôt. Ni installation, ni exécution, ni tests. L'audit complet est l'objet de l'étape 01.
- **Assets :** aucun examen visuel à ce stade.

## Ce que dit la documentation publique de Hermes [Doc]

| Sujet | Information | À vérifier à l'étape 07 |
|---|---|---|
| Port 8642 | Serveur API de la gateway, compatible OpenAI, authentification Bearer par `API_SERVER_KEY` | Activé ? Hôte, clé ? |
| Port 9119 | Dashboard d'administration, qui lit et écrit le `.env` contenant les secrets | Exposé ? Méthode d'authentification ? |
| Multi-agents | Les « profils » sont des répertoires Hermes isolés, chacun avec sa gateway | JARVIS et VEILLEUR sont-ils des profils ? |
| Multiplexage | Option `gateway.multiplex_profiles`, préfixe `/p/<profile>/`, une clé par profil | Activé ? |
| Sessions | `/api/sessions`, avec messages, chat et chat en streaming | Présent dans la version installée ? |
| Runs | `/v1/runs` et `/v1/runs/{run_id}/events` (SSE) : `tool.started`, `tool.completed`, etc. | Schémas réels ? |
| Limite de session | Reprendre une session d'une autre surface renvoie HTTP 409 | Comportement réel ? |
| Limites de débit | 10 runs simultanés par défaut, puis HTTP 429 | Valeur configurée ? |

Le contexte du projet indique `HERMES_HOME=/opt/data`. Selon la doc, cette variable délimite un profil : `/opt/data` pourrait donc être un seul profil [Hypothèse].

**Recommandation [Proposé] :** n'envisager comme interface applicative que le serveur API (8642). Ne pas brancher l'application sur le dashboard (9119), dont la surface d'administration inclut les secrets. Toute exception, comme la liste des profils, doit être justifiée à l'étape 07.

## Hypothèses à vérifier

| ID | Hypothèse | Vérification | Phase | Si elle est fausse |
|---|---|---|---|---|
| H1 | Hermes installé est bien Hermes Agent de Nous Research | `hermes --version`, image Docker | 07 | Refaire la partie [Doc] de ce cadrage |
| H2 | L'API de la version installée correspond à la doc lue | Test des endpoints | 07 | Adapter le connecteur et le périmètre |
| H3 | JARVIS et VEILLEUR existent et sont des profils Hermes | `hermes profile list`, configuration | 07 | Revoir le modèle `AgentDefinition` |
| H4 | La liste des agents peut être obtenue sans le dashboard | Audit des interfaces | 07 | Liste déclarée à la main ou accès dashboard restreint |
| H5 | Le conteneur de l'application peut joindre Hermes par un réseau Docker | Inspection Dokploy | 07, 12 | Revoir le réseau, sans exposition publique |
| H6 | Le PostgreSQL existant peut accueillir une base ou un schéma dédié | Vérification avec l'opérateur | 04, 12 | Revoir la persistance |
| H7 | L'art par défaut de Claude-Office est bien couvert par MIT, comme l'annonce `NOTICE.md` | Audit de provenance | 02 | Sans effet majeur s'il est de toute façon redessiné |
| H8 | Le découplage de `server/index.js` et du reducer est réaliste | Audit du code | 01 | Reconstruire ces modules en réutilisant leur logique |
| H9 | La stack React, Node et TypeScript convient | Déjà observée dans le source | 01, 04 | Peu probable |

## Risques

Échelle : Élevé, Moyen, Faible.

| ID | Risque | Prob. | Impact | Parade |
|---|---|---|---|---|
| R1 | **Pas de flux global d'activité** : le travail lancé par Telegram, CLI ou cron reste invisible, ce qui fragilise la promesse d'observation | Moyen | **Élevé** | Vérifier en priorité à l'étape 07 ; arbitrer si besoin : affichage limité aux runs de l'application, ou polling de `/api/sessions` et des jobs |
| R2 | **Le moteur est à construire**, pas à adapter (étape 05 sous-estimée) | Élevé | Élevé | Chiffrer à l'étape 04 ; comparer DOM sur grille et canvas ; garder une seule salle |
| R3 | **Art entièrement à refaire** : sprites et décors isométriques inutilisables en vue de dessus | Élevé | Élevé | Master Character d'abord ; MVP réduit à 2 personnages et une salle |
| R4 | **Cohérence des sprites générés par IA** : déformations entre frames | Élevé | Moyen | Génération comme ébauche, retouche manuelle, critères de l'étape 03 |
| R5 | **Modèle de sécurité inadapté** : le source repose sur le loopback, sans comptes | Certain | Élevé | Refaire l'authentification ; revue à l'étape 12 ; ne jamais ouvrir le serveur tel quel |
| R6 | **Exposition de secrets Hermes** : surtout via le dashboard, qui gère le `.env` | Faible | **Élevé** | Pas de dashboard depuis le navigateur ; adaptateur backend ; réseau interne |
| R7 | **Action non voulue sur la production** : un chat déclenche des outils réels sur le VPS | Moyen | **Élevé** | Instance ou profil de test ; opérations d'écriture documentées ; pas de sandbox par défaut selon la doc des profils |
| R8 | **Couplage Claude Code plus profond que prévu** (35 fichiers contiennent des références) | Moyen | Moyen | `CLAUDE_CODE_COUPLING.md` à l'étape 01 ; migration incrémentale |
| R9 | **Fuite d'assets non libres** (skin Dunder Mifflin) dans le build | Moyen | Élevé | Ne pas importer ces fichiers ; contrôle de licence automatique au build |
| R10 | **Provenance des assets** : scripts utilisant des générateurs IA (`scripts/generate-office-bg.mjs`, `scripts/setup-character.md`) | Moyen | Moyen | Audit à l'étape 02 ; conserver la trace de production des nouveaux assets |
| R11 | **Évolution de l'API Hermes** : schémas partiellement documentés, projet actif | Moyen | Moyen | Tests de contrat, version fixée, adaptateur isolé |
| R12 | **Dérive du projet source** : il évolue activement | Moyen | Faible | Commit de référence figé (`1a9ba71`) |
| R13 | **Surcoût de l'animation « honnête »** : un bureau souvent neutre peut sembler vide | Moyen | Moyen | Animations ambiantes clairement décoratives, séparées des états d'activité |

## Dépendances externes

| Dépendance | Nécessaire pour | Fournie par |
|---|---|---|
| Accès au dépôt Claude-Office | 01, 02 | Disponible publiquement |
| Accès en lecture à l'instance Hermes | 07 | Opérateur |
| Instance ou profil Hermes de test | 07 à 11 | Opérateur ; **existence non confirmée** |
| Clés API dédiées | 07 | Opérateur |
| Outil de création des sprites | 03, 06 | À décider (Q5) |
| Accès à Dokploy et au PostgreSQL | 12 | Opérateur |

## Questions ouvertes

### À trancher avant l'étape 01

**Q1 — Où vivra le code ?** Les prompts supposent de travailler dans le dépôt Claude-Office, mais ce dépôt-ci ne contient que les prompts.
*Recommandation :* `hermes-agent-crossing` reste le dépôt produit. L'audit se fait sur un clone en lecture seule, au commit `1a9ba71`. Le code réutilisé est importé à partir de l'étape 05, avec la licence MIT et sa mention de copyright, sans le skin Dunder Mifflin.

### À trancher avant l'étape 03

**Q5 — Comment produire les sprites ?** Générateur IA retenu, retouche par qui, budget ? *Recommandation :* génération comme ébauche et retouche pixel par pixel avec trace de production.

### À trancher avant l'étape 04

**Q4 — Qui utilise l'application et comment se connecte-t-on ?** *Recommandation :* opérateur unique au MVP, avec un modèle qui n'empêche pas l'ajout de comptes.

**Q6 — Où sera-t-elle accessible ?** Internet public derrière Traefik, ou VPN uniquement ? *Recommandation :* accès restreint par VPN ou liste d'autorisation au MVP.

### À trancher avant l'étape 07

**Q2 — Comment accéder à Hermes ?** Accès au VPS, version, clés. Une instance de test existe-t-elle ? *Recommandation :* créer un profil de test dédié, avec des outils limités.

**Q3 — Que sont JARVIS et VEILLEUR dans Hermes ?** Profils, personas, autre chose ?

**Q7 — Faut-il voir l'activité lancée hors du bureau (Telegram, CLI, cron) ?** *Si oui, cela devient un critère central de l'étape 07 (R1).*

## Sources

- [Hermes — API Server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)
- [Hermes — Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Hermes — Web Dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard)
- [Control Plane — modèle de déploiement Hermes Agent](https://docs.controlplane.com/template-catalog/templates/hermes-agent) (source secondaire)
- [Unraid — modèle Hermes Agent](https://ca.unraid.net/apps/hermes-agent-0scgyka0cmc8c6) (source secondaire)
- [Claude-Office](https://github.com/W17ant/Claude-Office), commit `1a9ba71`
