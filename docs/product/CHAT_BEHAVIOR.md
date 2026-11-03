# Comportement du chat

## Cycle de vie

| Étape | Comportement |
|---|---|
| Sélection | Depuis un personnage, seulement si son lien est « Connecté » |
| Session | Reprendre une session listée, ou en créer une nouvelle |
| Identification | L'agent, la session et la source restent affichés |
| Envoi | Bloqué tant qu'une réponse est en cours |
| Réception | En continu, avec les outils utilisés |
| Autorisation | Carte dédiée : Refuser ou Autoriser une fois |
| Arrêt | Bouton Arrêter, transmis à Hermes |
| Fin | Historique relu depuis Hermes |

## Sessions en lecture seule

Une session d'une autre origine (Telegram, CLI, cron…) se lit, mais **ne peut pas recevoir de message d'ici**. Hermes v0.17 ne le refuserait pas : écrire pourrait donc mélanger deux conversations, et c'est le backend qui l'interdit.

## Erreurs

| Situation | Affichage |
|---|---|
| Hermes refuse ou ne répond pas | Le message d'erreur, et rien n'est envoyé |
| Historique illisible | Envoi refusé, car l'agent perdrait le fil sans le dire |
| Échec de l'agent | Le message d'échec |
| Coupure du navigateur | « Connexion coupée, reprise en cours… », puis reprise sans doublon |
| Coupure du flux Hermes | L'état final est relu auprès de Hermes |
| Suivi perdu | « Résultat inconnu ». **Jamais un succès** |

## Autorisations

Le bouton n'accorde qu'**une seule fois**. Hermes accepte aussi « toute la session » et « toujours », mais le backend les refuse : une autorisation durable se règle dans la configuration de Hermes, pas d'un clic.

## Sécurité

Les messages passent par le backend, jamais directement à un LLM. **L'agent peut exécuter de vraies actions** : un rappel figure sous le champ de saisie.

## Mode mock

Identifié par la mention « Simulation », à côté de l'agent et de la session. Écrire « danger » déclenche une autorisation, et « erreur » un échec.
