# ÉTAPE 12 — Sécurité, qualité, déploiement et validation finale

## Rôle
Agis comme ingénieur DevSecOps senior spécialisé en Docker, reverse proxy, applications web et déploiements sur VPS.

## Objectif
Préparer Hermes-Agent-Crossing pour un déploiement contrôlé sur l'infrastructure existante via Dokploy.

## Contexte
- VPS Debian 13 avec Docker et Dokploy déjà opérationnels.
- Traefik gère déjà le reverse proxy.
- Hermes Agent est déjà déployé.
- PostgreSQL, MinIO et pgvector existent déjà.
- LiteLLM/vLLM existent déjà.
Ne recrée aucun de ces services.

## Travail demandé
1. Effectue un audit sécurité : authentification, autorisation, sessions, secrets, CORS, CSRF si pertinent, validation d'entrées, rate limiting, dépendances et journalisation.
2. Vérifie que le navigateur n'accède jamais directement aux secrets ou interfaces administratives Hermes.
3. Définis les réseaux Docker et les flux nécessaires avec le minimum d'exposition réseau.
4. Prépare Dockerfile et configuration de déploiement adaptés au dépôt.
5. Réutilise les services existants via variables d'environnement/secrets et réseaux appropriés, après vérification de leur accessibilité.
6. N'expose publiquement que les ports strictement nécessaires. Ne modifie pas les règles firewall ou les services de production sans autorisation.
7. Ajoute healthchecks, logs exploitables, gestion des erreurs et stratégie de sauvegarde des données propres à l'application.
8. Exécute les tests unitaires, intégration, contrats et E2E.
9. Effectue un test de bout en bout : connexion, affichage bureau, découverte d'agent, association personnage, conversation, événements et états visuels.
10. Documente rollback, mise à jour, restauration et diagnostic.
11. Vérifie les licences des assets inclus dans le build final.
12. Produis une liste des limites connues et des éléments non implémentés.

## Livrables
- `docs/deployment/DEPLOYMENT.md`
- `docs/deployment/ENVIRONMENT_VARIABLES.md` sans valeurs secrètes
- `docs/security/SECURITY_REVIEW.md`
- `docs/operations/RUNBOOK.md`
- Configuration Docker/Dokploy validée.
- Rapport de tests et checklist de mise en production.

## Règles impératives
- Ne jamais écrire de secrets dans Git, les logs ou les bundles frontend.
- Ne pas recréer les bases de données, MinIO, pgvector, Hermes, LiteLLM ou vLLM.
- Ne pas effectuer de migration destructive ni de déploiement de production sans accord explicite.
- Ne pas déclarer le projet prêt si des tests critiques échouent.
- Distinguer clairement « testé en local », « testé en staging » et « déployé en production ».

## Validation finale
Fournis :
1. le rapport de conformité aux critères d'acceptation ;
2. les commandes exactes de build/test/déploiement ;
3. les résultats observés ;
4. les limites et risques résiduels ;
5. une recommandation Go/No-Go.
