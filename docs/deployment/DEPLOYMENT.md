# Déploiement

**État : préparé, jamais exécuté.** Ni l'image Docker ni le compose n'ont pu être construits ou lancés ici, car Docker n'est pas disponible dans cet environnement.

Ces étapes modifient ton infrastructure : elles sont à réaliser par toi, ou avec ton accord explicite. Aucun service existant n'est recréé.

## Architecture

| Élément | Action |
|---|---|
| Hermes, PostgreSQL, Traefik, Dokploy | Réutilisés, non recréés |
| MinIO, pgvector, LiteLLM/vLLM | Non utilisés |
| `hermes-agent-crossing` | **Seul nouveau conteneur**, sans port publié |

## 1. Vérifier Hermes, en lecture seule

Sur le VPS, pour chaque profil :

```bash
HERMES_URL=http://hôte:8642 HERMES_KEY=... npx tsx tools/hermes-probe.ts
```

Attendu : `version=0.17.0`, et le nom du profil dans `model`.

**Point d'attention :** selon le source, le serveur API écoute par défaut sur `127.0.0.1` (`API_SERVER_HOST`). Un autre conteneur ne peut alors pas l'atteindre. Si c'est le cas, changer cette valeur **modifie la production de Hermes** et demande ton accord. L'exposition doit rester limitée au réseau Docker interne.

## 2. Préparer la base

Sur le PostgreSQL existant, avec un mot de passe choisi par toi :

```sql
CREATE ROLE hermes_crossing LOGIN PASSWORD '...';
CREATE DATABASE hermes_crossing OWNER hermes_crossing;
```

Le serveur crée ses tables au démarrage. Ses migrations ne font qu'ajouter.

## 3. Créer un profil de test

**Avant toute conversation**, un profil Hermes dédié, à outils limités :

```bash
hermes profile create crossing-test
```

Commence par `HERMES_PROFILES` ne contenant que ce profil.

## 4. Déployer dans Dokploy

1. Créer une application de type Compose à partir de ce dépôt.
2. Renseigner les variables : voir [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).
3. Déployer.

## 5. Vérifier

Depuis le conteneur :

```bash
node -e "fetch('http://127.0.0.1:3000/readyz').then(r=>console.log(r.status))"
```

Puis suivre la [checklist](#checklist-de-mise-en-production).

## Réseaux et flux

| De | Vers | Port | Exposé publiquement |
|---|---|---|---|
| Navigateur | Traefik | 443 | Oui, limité par `HAC_ALLOWED_IPS` |
| Traefik | Application | 3000 | Non |
| Application | Hermes | 8642 | Non |
| Application | PostgreSQL | 5432 | Non |

**Le pare-feu n'est pas modifié.**

## Checklist de mise en production

- [ ] Contrôle `hermes-probe` réussi pour chaque profil
- [ ] Profil de test créé, à outils limités
- [ ] Image construite, `check:build` réussi dans le build
- [ ] Base dédiée créée, migrations appliquées, `/readyz` à 200
- [ ] Une adresse hors `HAC_ALLOWED_IPS` est refusée par Traefik
- [ ] Le port 3000 et Hermes sont injoignables depuis l'extérieur
- [ ] Connexion, association, conversation réussies sur le profil de test
- [ ] Message Telegram visible au journal, avec son retard
- [ ] Aucun doublon dans les messages de la session
- [ ] Une commande dangereuse déclenche bien une autorisation
- [ ] Sauvegarde et restauration testées
- [ ] Retour arrière testé
- [ ] Accord explicite de l'opérateur pour la production
