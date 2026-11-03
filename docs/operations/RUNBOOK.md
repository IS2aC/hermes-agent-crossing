# Runbook

**Rédigé sans avoir été exécuté sur le VPS.** À corriger au premier usage réel.

## Santé

| Route | Sens | Détail |
|---|---|---|
| `/healthz` | Le processus répond | Public, sans détail |
| `/readyz` | La base répond | Utilisée par le healthcheck de l'image |

## Diagnostic

| Symptôme | Cause probable | Action |
|---|---|---|
| Le conteneur redémarre en boucle | Variable manquante | Lire les journaux : le message nomme la variable, sans sa valeur |
| « Démarrage impossible : connect… » | Base injoignable | Vérifier `DATABASE_URL` et le réseau `HERMES_NETWORK` |
| `/readyz` à 503 | La base a décroché | Vérifier PostgreSQL |
| Connexion toujours refusée | Empreinte déformée | Le `$` a pu être interprété : voir `ENVIRONMENT_VARIABLES.md` |
| Trop de tentatives | Limite atteinte | Attendre une minute |
| Écritures refusées, « Origine refusée » | `ALLOWED_ORIGINS` différent du domaine | Corriger la valeur, avec le schéma `https://` |
| Bloqué par Traefik | Adresse hors liste | Vérifier `HAC_ALLOWED_IPS` |
| Agent « Injoignable » | Hermes arrêté, mauvaise URL, écoute sur `127.0.0.1` | Lancer `hermes-probe` depuis le réseau de l'application |
| Détail 401 ou « Invalid API key » | Mauvaise clé pour ce profil | Vérifier `HERMES_KEY_<PROFIL>` |
| Flux qui se coupe après un délai fixe | Délai de Traefik | Vérifier le délai des réponses longues |
| « Résultat inconnu » dans le chat | Hermes ou le backend a redémarré pendant le run | Lire l'historique de la session |
| « Observation interrompue » au journal | `/api/sessions` en échec | Lire l'état de l'agent dans le registre |
| Agent bloqué en attente | Autorisation sans réponse | Répondre depuis le Chat, ou arrêter le run |

Les journaux ne contiennent ni clé, ni contenu de conversation : c'est voulu.

## Sauvegarde

Seules les données de l'application sont concernées : personnages, liens, tâches, journal. Les conversations restent dans Hermes.

```bash
pg_dump --format=custom --file=hermes_crossing.dump "$DATABASE_URL"
```

À planifier avec tes sauvegardes PostgreSQL. **Fréquence à décider.**

## Restauration

**Arrête d'abord l'application.** Cette commande remplace les données de sa base :

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" hermes_crossing.dump
```

## Mise à jour

1. Sauvegarder.
2. Déployer la nouvelle version dans Dokploy.
3. Vérifier `/readyz`, puis la connexion.

Les migrations s'appliquent au démarrage. **Elles ne sont pas réversibles automatiquement**, d'où la sauvegarde.

## Retour arrière

1. Redéployer la version précédente depuis Dokploy.
2. Si une migration a changé le schéma de façon incompatible, restaurer la sauvegarde.

Les migrations actuelles ne font qu'ajouter des tables : une ancienne version peut les ignorer.

## Mise à jour de Hermes

Le connecteur a été écrit pour **v0.17.0, commit `2bd1977d`**. Après une mise à jour de Hermes :

1. Relancer `hermes-probe`.
2. Relire l'audit, surtout les routes, les événements et la protection des sessions.

## Renouveler un secret

| Secret | Procédure |
|---|---|
| Mot de passe de l'opérateur | Nouvelle empreinte, puis redémarrage : toutes les sessions tombent |
| Clé Hermes | Changer `API_SERVER_KEY` du profil, puis `HERMES_KEY_<PROFIL>` |
| Mot de passe de base | Changer le rôle, puis `DATABASE_URL` |

## Limites connues

Voir le [rapport de l'étape 12](../reports/RAPPORT_ETAPE_12.md).
