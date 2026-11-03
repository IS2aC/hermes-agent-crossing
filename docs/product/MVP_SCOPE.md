# Périmètre MVP

Statut : **proposition, en attente de validation** · Étape 00 · 2026-11-03

## Définition du MVP

Un opérateur authentifié ouvre le bureau, voit JARVIS et VEILLEUR si leur existence est confirmée, consulte leurs données vérifiées, leur parle via Hermes et suit l'activité réellement observée, avec la provenance de chaque information.

Tout le périmètre ci-dessous reste conditionné aux capacités confirmées à l'étape 07.

## Dans le MVP

| Domaine | Contenu | Phase |
|---|---|---|
| Scène | Une seule salle orthogonale sur grille, avec collisions, tri de profondeur et rendu pixel-perfect | 05, 06 |
| Personnages | Master Character validé, puis JARVIS et VEILLEUR ; animations idle, marche, travail, réflexion ; représentation neutre « inconnu » | 03, 06 |
| Connecteur | Adaptateur backend Hermes, mode mock identifiable, secrets côté serveur | 07 |
| Registre | Découverte des agents réels, association personnage-agent, cas non associé, indisponible ou inconnu | 08 |
| Inspecteur | Fiche agent : métadonnées vérifiées, statut, dernière activité, provenance | 08 |
| Chat | Conversation avec un agent et une session identifiés, erreurs et reconnexion gérées | 09 |
| Activité | Journal des événements Hermes, sans doublons et avec provenance | 10 |
| Tâches locales | Tableau simple, étiqueté « local » | 10 |
| États visuels | Correspondance documentée état source → animation, panneau de debug | 11 |
| Accès | Authentification d'un opérateur unique, ou méthode décidée en Q4 | 04, 12 |
| Déploiement | Service Dokploy derrière Traefik, réutilisant le PostgreSQL existant | 12 |

## Hors MVP

| Fonctionnalité | Motif | Horizon |
|---|---|---|
| Création, modification ou suppression d'agents Hermes | Action à risque sur la production ; capacité à vérifier | Après le MVP, sur accord |
| Réponse aux demandes d'approbation depuis le bureau | Schéma incomplet dans la doc publique ; voir la note ci-dessous | V1 |
| Comptes multiples et rôles | Une seule personne au départ | V1 |
| Plusieurs salles | La complexité n'apporte pas de valeur au premier usage | V1 |
| Les 5 rôles restants (DATA ANALYST, DEVOPS, DEVELOPER, RESEARCHER, SECURITY) | Fiches préparées à l'étape 03, production décalée | V1 |
| Compteurs de coût et de tokens | Source Hermes à confirmer | V1 |
| Administration des jobs planifiés (cron) | Lecture éventuelle au MVP, actions plus tard | V1 |
| Mode incident | Dépend de signaux non identifiés côté Hermes | Plus tard |
| Application Electron | La cible est web | Abandonné, sauf demande |
| Skin Dunder Mifflin | Hors licence | **Exclu définitivement** |
| Événements décoratifs aléatoires | Risque de confusion avec l'activité réelle | Plus tard, clairement identifiés comme décoratifs |
| Utilisation directe de LiteLLM/vLLM, pgvector ou MinIO | Aucun besoin au MVP : le chat passe par Hermes, les sprites sont dans le build | Selon le besoin |

**Note sur les approbations :** si un agent reste bloqué en attente d'approbation pendant un chat, le bureau doit au minimum l'afficher, sans le faire passer pour une panne ni pour du travail en cours. Si l'étape 07 montre que ce cas est fréquent, il faudra remonter cette fonction dans le MVP.

## Ce que l'on ne promet pas encore

D'après la documentation publique, les événements détaillés sont liés à un run ou à une session de chat [Doc]. Aucun flux global de type « tout ce que fait cet agent » n'a été identifié à ce stade. **Le bureau ne pourra donc peut-être pas montrer le travail d'un agent lancé ailleurs (Telegram, CLI, cron).** Le périmètre « activité » du MVP sera précisé après l'étape 07. Voir R1.

## Critère de réduction

Si le calendrier se tend, couper dans cet ordre :

1. les tâches locales ;
2. le panneau de debug avancé (garder la table de correspondance) ;
3. l'animation « réflexion » ;
4. VEILLEUR (garder un seul agent de bout en bout).

Ne jamais couper : la provenance, l'état inconnu, la protection des secrets et l'authentification.
