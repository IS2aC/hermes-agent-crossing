# Connecteur Hermes

Code : `server/adapters/hermes/`. Il est le seul à parler à Hermes.

| Fichier | Rôle |
|---|---|
| `client.ts` | Appels HTTP, délai maximal, nouvel essai, erreurs sans secret |
| `sse.ts` | Lecture des flux, commentaires ignorés |
| `platform.ts` | Traduction vers le domaine, interface `AgentPlatform` |
| `server/adapters/mock/platform.ts` | Mode mock, toujours identifié comme simulé |

## Règles

- **Délai maximal :** 10 s par appel, sauf les flux.
- **Nouvel essai :** lectures seulement, 2 fois, avec un délai croissant, sur panne réseau, délai dépassé, 502, 503 ou 504. **Jamais sur une écriture**, qui pourrait agir deux fois.
- **Échec :** il devient `unavailable`, avec sa raison, jamais une valeur plausible ni une liste vide.
- **Journaux :** aucune clé, et pas de contenu de conversation.

## Configuration

Les clés restent dans des variables séparées, jamais dans `HERMES_PROFILES`.

```bash
HERMES_MODE=live
HERMES_PROFILES='[{"id":"jarvis","name":"JARVIS","baseUrl":"http://hermes-jarvis:8642","keyEnv":"HERMES_KEY_JARVIS"},{"id":"veilleur","name":"VEILLEUR","baseUrl":"http://hermes-veilleur:8642","keyEnv":"HERMES_KEY_VEILLEUR"}]'
HERMES_KEY_JARVIS=
HERMES_KEY_VEILLEUR=
OPERATOR_PASSWORD_HASH=
```

Pour produire l'empreinte du mot de passe, sans qu'il entre dans l'historique du shell :

```bash
read -rs HAC_PASSWORD && printf '%s' "$HAC_PASSWORD" | npm run --silent hash-password && unset HAC_PASSWORD
```

## Protection de l'accès

| Mesure | Détail |
|---|---|
| Connexion | Mot de passe unique, empreinte scrypt, cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production |
| Tentatives | 5 par minute et par adresse |
| Origine | Toute écriture doit venir d'une origine autorisée, ce qui remplace un jeton CSRF |
| CORS | Aucun en-tête CORS : le navigateur ne peut pas appeler l'API depuis un autre site |
| Validation | Corps limité à 256 Ko, erreurs sans détail interne |
| En-têtes | CSP, `X-Frame-Options`, `nosniff`, `no-referrer` |

**Accès libre seulement** en développement, en mode mock, sans mot de passe configuré. Le serveur écoute alors sur `127.0.0.1`. En mode `live` ou en production, le mot de passe est obligatoire.

## Mode mock

`HERMES_MODE=mock`, refusé en production. Un message contenant « danger » déclenche une demande d'approbation, et « erreur » un échec.
