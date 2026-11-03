# ÉTAPE 00 — Cadrage du projet Hermes-Agent-Crossing

## Rôle
Agis comme architecte logiciel senior, spécialiste des applications temps réel, des interfaces pixel-art et des systèmes agentiques. Tu interviens sur le dépôt Claude-Office retenu comme base technique et référence fonctionnelle.

## Objectif
Établir un cadrage précis de Hermes-Agent-Crossing avant toute modification du code. Le produit est un bureau virtuel en pixel art, en vue orthogonale/top-down (non isométrique), permettant d'observer et d'interagir avec des agents IA, en priorité des instances Hermes Agent déjà existantes.

## Contexte et contraintes non négociables
- Dépôt de référence : https://github.com/W17ant/Claude-Office
- Le dépôt est une base à auditer et adapter, pas une autorisation de tout réécrire.
- Direction artistique : pixel art, vue orthogonale/top-down.
- Le système doit se connecter à l'environnement Hermes Agent existant.
- Infrastructure déjà disponible : VPS Debian 13, Docker, Dokploy, PostgreSQL, MinIO, pgvector, LiteLLM/vLLM. Ne pas recréer ces services.
- Hermes est déjà déployé. Son répertoire de données est `/opt/data` (`HERMES_HOME=/opt/data`), avec une gateway existante. Les ports observés dans l'environnement sont 9119 et 8642 : vérifier leur rôle réel avant de les utiliser.
- Les agents JARVIS et VEILLEUR sont des exemples prioritaires de profils à représenter, sous réserve de vérifier leur existence et leur configuration réelles.
- Ne jamais inventer une API Hermes, un endpoint, un état d'exécution ou une capacité de gestion native d'agents.

## Travail demandé
1. Reformule la vision produit, les utilisateurs cibles et les principaux parcours.
2. Distingue clairement :
   - le profil visuel/local d'un personnage ;
   - l'agent/configuration réellement défini dans Hermes ;
   - une session ou exécution runtime de cet agent ;
   - une tâche locale de l'application ;
   - une tâche ou activité réellement remontée par Hermes.
3. Définis le périmètre MVP et les fonctionnalités ultérieures.
4. Liste les hypothèses à vérifier, risques, dépendances et questions ouvertes.
5. Propose les critères d'acceptation globaux.
6. Définis les livrables attendus pour chacune des phases 0 à 12.
7. Identifie les éléments qui doivent être conservés du projet source et ceux qui devront être remplacés.
8. Établis une stratégie de validation progressive : aucune phase ne doit être déclarée terminée sans preuves et tests.

## Livrables
- `docs/product/PROJECT_BRIEF.md`
- `docs/product/MVP_SCOPE.md`
- `docs/product/USER_JOURNEYS.md`
- `docs/project/ASSUMPTIONS_AND_RISKS.md`
- `docs/project/ACCEPTANCE_CRITERIA.md`
- Une proposition de jalons et dépendances entre phases.

## Règles d'exécution
- À cette étape, ne modifie pas le code applicatif.
- N'ajoute aucune dépendance et ne lance aucun déploiement.
- Signale explicitement les informations impossibles à confirmer.
- Termine par un rapport synthétique : décisions proposées, questions bloquantes, livrables créés et recommandation de passage à l'étape 01.
