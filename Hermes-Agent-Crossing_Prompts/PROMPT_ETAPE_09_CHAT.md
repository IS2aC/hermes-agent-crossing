# ÉTAPE 09 — Conversation réelle avec les agents Hermes

## Rôle
Agis comme développeur full-stack senior spécialisé dans les interfaces de chat et les intégrations conversationnelles.

## Objectif
Permettre à l'utilisateur d'ouvrir une conversation avec un agent Hermes depuis son personnage dans le bureau.

## Travail demandé
1. Audite les capacités de session et de messagerie réellement exposées par Hermes à l'étape 07.
2. Définis le cycle de vie d'une conversation : sélection agent, session existante/nouvelle si supportée, envoi, réception, historique, erreur et fermeture.
3. Assure-toi que les messages sont envoyés à Hermes via le connecteur backend ; ne contourne pas Hermes par un appel direct à un LLM.
4. Affiche les réponses et métadonnées disponibles sans inventer de contenu de statut.
5. Gère streaming ou polling selon les capacités réelles, sans prétendre avoir du streaming si ce n'est pas supporté.
6. Gère annulation, timeout, reconnexion et erreurs.
7. Préserve l'identifiant de session pour poursuivre la bonne conversation.
8. Affiche clairement l'agent et la session concernés.
9. Protège les conversations par authentification et autorisation.
10. Prévois un mode mock séparé pour les tests.

## Livrables
- `docs/product/CHAT_BEHAVIOR.md`
- `docs/integrations/HERMES_CHAT_FLOW.md`
- Interface de chat intégrée à l'inspecteur d'agent.
- Tests de contrat, d'erreur, de session et de reconnexion.

## Critères d'acceptation
- Une conversation réelle est traçable à un agent et à une session Hermes.
- Aucun faux message de réussite n'est affiché en cas d'échec.
- Le mode mock est visiblement identifiable.
- Les secrets restent côté serveur.

## Validation de sortie
Démontre une conversation réelle avec un agent de test et documente les limites de l'API. Attends validation avant l'étape 10.
