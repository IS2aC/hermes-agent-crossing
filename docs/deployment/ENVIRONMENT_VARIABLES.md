# Variables d'environnement

Aucune valeur secrète ici. **À stocker dans Dokploy**, jamais dans Git.

## Application

| Variable | Requise | Secrète | Rôle |
|---|---|---|---|
| `NODE_ENV` | Fixée par l'image | Non | `production` |
| `HERMES_MODE` | Oui | Non | `live`. `mock` est refusé en production |
| `HERMES_PROFILES` | En `live` | Non | Tableau JSON : `id`, `name`, `baseUrl`, `keyEnv` |
| `HERMES_KEY_<PROFIL>` | En `live` | **Oui** | `API_SERVER_KEY` du profil. Le nom est celui donné par `keyEnv`. `docker-compose.yml` doit aussi le transmettre : JARVIS, VEILLEUR, DESIGNER, DEV_MANAGER, REVIEWER, TESTER et X y figurent |
| `OPERATOR_PASSWORD_HASH` | En `live` et production | **Oui** | Empreinte du mot de passe |
| `DATABASE_URL` | En production | **Oui** | Base dédiée sur le PostgreSQL existant |
| `ALLOWED_ORIGINS` | En production | Non | Par exemple `https://bureau.exemple.fr` |
| `PORT` | Non | Non | 3000 par défaut |
| `HOST` | Non | Non | `0.0.0.0` en production, `127.0.0.1` sinon |
| `STATIC_DIR` | Fixée par l'image | Non | Fichiers de l'interface |

## `docker-compose.yml`

| Variable | Requise | Rôle |
|---|---|---|
| `HAC_DOMAIN` | Oui | Domaine public |
| `HAC_ALLOWED_IPS` | Oui | Adresses autorisées sur Traefik, par exemple l'adresse du VPN |
| `HERMES_NETWORK` | Oui | Réseau Docker existant de Hermes et de PostgreSQL |
| `HAC_CERT_RESOLVER` | Non | `letsencrypt` par défaut. **À vérifier dans ta configuration Traefik** |

## Produire l'empreinte du mot de passe

```bash
read -rs HAC_PASSWORD && printf '%s' "$HAC_PASSWORD" | npm run --silent hash-password && unset HAC_PASSWORD
```

**Attention, dans Docker Compose :** le caractère `$` de l'empreinte doit être doublé (`$$`) s'il est écrit directement dans un fichier compose. Avec une variable d'environnement Dokploy, à vérifier au premier démarrage : une connexion refusée en serait le symptôme.
