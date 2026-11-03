# ÉTAPE 07 — Connecteur backend vers Hermes Agent

## Rôle
Agis comme ingénieur backend senior spécialisé dans les intégrations d'API, la sécurité et les systèmes agentiques.

## Objectif
Connecter l'application à l'instance Hermes Agent déjà déployée, en s'appuyant exclusivement sur les interfaces réellement disponibles et vérifiées pour la version installée.

## Contexte connu à vérifier
- Hermes Agent est déjà déployé sur le VPS via Docker/Dokploy.
- `HERMES_HOME=/opt/data`.
- Une gateway est déjà utilisée.
- Les ports 9119 et 8642 ont été exposés dans l'environnement, mais leur fonction et leur protocole doivent être vérifiés.
- LiteLLM/vLLM et les autres services existants ne doivent pas être recréés.

## Travail demandé
1. Inspecte la version exacte de Hermes, sa documentation locale, sa configuration et les interfaces exposées.
2. Identifie les opérations réellement supportées : santé, statut, découverte des agents/configurations, sessions, historique, messages, événements, exécutions et permissions.
3. Pour chaque opération, consigne endpoint/commande, méthode, schéma, authentification, erreurs et limites.
4. N'utilise aucun endpoint supposé. Si une capacité n'existe pas, indique-le.
5. Implémente un adaptateur backend isolant Hermes du reste de l'application.
6. Ajoute timeout, retry prudent, gestion des erreurs, reconnexion et journalisation sans secrets.
7. Prévois un mode mock pour le développement frontend.
8. Protège les accès réseau : authentification, autorisations, validation des entrées, CORS strict et limitation de débit selon le contexte.
9. Ne rends jamais les clés/API tokens accessibles au navigateur.
10. Documente les opérations en lecture seule et celles qui déclenchent une action réelle.

## Livrables
- `docs/integrations/HERMES_CAPABILITY_AUDIT.md`
- `docs/integrations/HERMES_API_CONTRACT.md`
- `docs/integrations/HERMES_CONNECTOR.md`
- Adaptateur backend et tests de contrat.
- Procédure de configuration par variables d'environnement/secrets.

## Contraintes
- Ne modifie pas la configuration de production Hermes sans autorisation explicite.
- Ne crée/supprime aucun agent Hermes tant que la capacité native et les conséquences ne sont pas vérifiées.
- Ne journalise aucun secret ni contenu sensible inutile.
- En cas d'incertitude, expose la capacité comme indisponible plutôt que de simuler une réussite.

## Validation de sortie
Présente une matrice des capacités effectivement vérifiées, les tests et les limites. Attends validation avant l'étape 08.
