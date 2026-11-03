# Revue de sécurité

Revue du code par son auteur, sans audit indépendant ni test d'intrusion. Date : 2026-11-03.

## Résultat par domaine

| Domaine | Mesure | Vérification |
|---|---|---|
| Authentification | Mot de passe unique, scrypt salé, comparaison à temps constant | Tests unitaires |
| Tentatives de connexion | 5 échecs par minute et par adresse | Test |
| Sessions | Jeton aléatoire 256 bits, 12 h, cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production | Test |
| Autorisation | Toutes les routes `/api` exigent une session, sauf connexion et état de session | Test |
| CSRF | `SameSite=Strict` et contrôle de l'origine sur toute écriture | Test |
| CORS | Aucun en-tête : autre site interdit | Revue |
| XSS | React échappe tout, aucun `dangerouslySetInnerHTML`, CSP sans `unsafe-*` | Revue, E2E sous CSP |
| Validation | `zod` sur chaque corps et filtre, 256 Ko au plus | Tests |
| Limitation de débit | Connexion et envoi de messages (30 par minute) | Tests |
| Secrets Hermes | Serveur uniquement, jamais dans `HERMES_PROFILES` | Tests, E2E, contrôle du build |
| Dashboard Hermes | Jamais appelé | Revue, contrôle du build |
| Accès réseau | Aucun port publié, liste d'adresses sur Traefik | Revue, **non déployé** |
| Conteneur | Utilisateur `node`, système en lecture seule, aucune capacité Linux | Revue, **non construit** |
| Journaux | Ni clé ni contenu de conversation | Test sur le connecteur, revue |
| Erreurs | Aucun détail interne vers le navigateur | Tests |

## Risque propre à Hermes v0.17

| Constat | Mesure |
|---|---|
| L'API peut écrire dans une session d'une autre surface | **Refusé par le backend**, avant tout appel |
| Un agent peut exécuter de vraies commandes, sur le serveur de Hermes | Rappel dans l'interface ; profil de test à outils limités exigé avant production |
| Une autorisation peut être durable (`always`, `session`) | **Seuls `once` et `deny` sont transmis** |
| `/health/detailed` est sans authentification | Garder Hermes sur un réseau interne |
| `API_SERVER_KEY` donne tous les droits sur le profil | Clé par profil, stockée dans Dokploy, à renouveler en cas de doute |

## Dépendances

`npm audit --omit=dev` : **0 vulnérabilité** au 2026-11-03, après mise à jour d'Express et de zod.

`npm audit` signale encore des alertes sur des **outils de développement** : `esbuild` (modérée), `@vitest/mocker` (modérée) et `tinypool` (critique, via vitest). Ils ne sont pas dans l'image finale, mais `esbuild` sert à la construire. Leur correction demande des mises à jour majeures de Vite et Vitest. **À faire, hors de ce périmètre.**

## Risques résiduels

| Risque | Gravité | Pourquoi il reste |
|---|---|---|
| **Aucun test d'intrusion ni audit indépendant** | Élevée | Hors de portée ici |
| Mot de passe unique, sans second facteur | Moyenne | Compensé par la restriction réseau. **Ne pas ouvrir à Internet sans la renforcer** |
| Pas de journal des accès ni d'alerte | Moyenne | Les décisions d'autorisation sont au journal, pas les connexions |
| Limiteurs et sessions en mémoire | Faible | Une seule instance prévue. Un redémarrage demande une reconnexion |
| `trust proxy = 1` | Moyenne | Si un autre proxy précède Traefik, l'adresse lue serait fausse. **À vérifier** |
| Nombre de flux SSE non limité | Faible | Réservé à l'opérateur connecté |
| Contenu renvoyé par un agent (injection de prompt) | Moyenne | Affiché comme du texte, sans effet dans le navigateur. Le risque sur l'agent lui-même dépend de Hermes |
| Dépendances de développement | Faible | Voir ci-dessus |

## Non testé

Tout ce qui demande le VPS : Traefik, liste d'adresses, TLS, réseaux Docker, image Docker, vrai PostgreSQL, vrai Hermes.
