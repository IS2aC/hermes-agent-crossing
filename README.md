# Hermes-Agent-Crossing — Pack de prompts par étape

Ce pack contient 13 prompts Markdown, de l'étape 00 à l'étape 12.

## Ordre d'exécution
00 Cadrage → 01 Audit Claude-Office → 02 Audit des assets → 03 Character Design System → 04 Architecture → 05 Moteur orthogonal → 06 Assets et animations → 07 Connecteur Hermes → 08 Gestion des agents → 09 Chat → 10 Tâches et événements → 11 Synchronisation des animations → 12 Sécurité et déploiement.

## Mode d'emploi
1. Ouvre le dépôt Claude-Office retenu.
2. Donne à Claude un seul fichier `PROMPT_ETAPE_XX...md` à la fois.
3. Exige les livrables et preuves indiqués dans le prompt.
4. Relis le rapport de sortie et valide explicitement la phase avant de transmettre le prompt suivant.
5. Si une phase révèle un blocage, demande à Claude de documenter le blocage et de proposer des options ; ne saute pas silencieusement à la phase suivante.

## Rappels essentiels
- Le produit cible une vue pixel-art orthogonale/top-down, pas isométrique.
- La méthode graphique est Master Character → Character Family : le Master Character doit être validé avant de produire toute la famille.
- Claude-Office est une base à auditer et adapter, pas à réécrire sans justification.
- Vérifier les licences des assets individuellement : une licence MIT du code ne garantit pas que chaque illustration est réutilisable.
- Ne jamais inventer les capacités ou endpoints Hermes. Auditer la version réellement installée.
- Séparer profil visuel, définition d'agent Hermes, runtime/session, tâches locales et événements Hermes.
- Réutiliser l'infrastructure existante : Hermes, PostgreSQL, MinIO, pgvector, LiteLLM/vLLM, Docker, Dokploy et Traefik. Ne pas les recréer.
- Ne jamais exposer les secrets dans le frontend, Git ou les logs.
