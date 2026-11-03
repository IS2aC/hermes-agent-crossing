# Registre des agents

## Principe

Personnages et agents sont deux listes indépendantes, reliées par un lien explicite que seul l'opérateur crée.

## Découverte

Hermes v0.17 n'expose pas la liste de ses profils par son API. La découverte est donc :

1. L'opérateur déclare les profils dans `HERMES_PROFILES`.
2. Le backend interroge chacun d'eux.
3. Un profil est dit **joignable** seulement s'il répond à `/health` et `/v1/capabilities`.

Une entrée déclarée qui ne répond pas apparaît « Injoignable », jamais connectée. Le champ `model` de `/v1/capabilities` vaut le nom du profil hors profil `default`, ce qui permet de vérifier la configuration à l'œil.

## États d'un personnage

| État | Sens | Rendu dans le bureau |
|---|---|---|
| Aucun agent associé | Personnage seul | Pose figée, sans bulle |
| Connecté | L'agent a répondu | Selon son état |
| Agent injoignable | Déclaré, mais ne répond pas | Pose figée, bulle ✕ |
| Agent introuvable | Lien conservé, profil retiré de la configuration | Pose figée, bulle ✕ |
| État inconnu | La découverte a échoué | Pose figée, bulle ? |

## Métadonnées

| Champ | Source | Sur Hermes v0.17 |
|---|---|---|
| Nom | Configuration | Disponible |
| Modèle | `/v1/capabilities` | Disponible |
| Version | `/health` | Disponible |
| État | `/health/detailed` | **Déduit**, avec sa règle |
| Description, fournisseur | — | **Indisponible**, affiché comme tel |

## Actions

| Action | Effet | Touche Hermes ? |
|---|---|---|
| Associer, dissocier | Modifie le lien local | Non |
| Déplacer, renommer | Modifie le personnage local | Non |
| Créer, modifier, supprimer un agent | **Non proposé** : aucune route ne le permet | — |

## Données de démonstration

Le mode mock utilise un stockage en mémoire, même si `DATABASE_URL` est défini. La démonstration ne peut donc pas écrire dans la vraie base.
