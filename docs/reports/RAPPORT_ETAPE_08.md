# Rapport — Étape 08 : Registre des agents

## En résumé

Tu peux maintenant te connecter, voir les agents, relier un personnage à un agent et ouvrir sa fiche en cliquant dessus dans le bureau. Un agent n'apparaît connecté que s'il répond vraiment.

## Ce qui a été fait

- Personnages et agents séparés, reliés par un lien explicite.
- Page de connexion, onglets Registre et Fiche.
- Stockage PostgreSQL, ou en mémoire pour le développement.
- La démonstration ne peut pas écrire dans la vraie base.

## Critères d'acceptation

| Critère | Résultat |
|---|---|
| Un personnage peut exister sans agent | Oui, testé |
| Un agent peut exister sans personnage | Oui, testé |
| L'interface distingue ces cas | Oui, testé dans Chromium |
| Aucun statut non vérifié présenté comme réel | Oui : « déduit » ou « inconnu » |
| JARVIS et VEILLEUR connectés seulement si confirmés | Oui, testé contre le faux Hermes |

## Preuves

Niveau atteint : **testé en local, contre un faux Hermes**. Les tests E2E font tourner le vrai serveur en mode live, dans un vrai navigateur.

## Non vérifié

- **La démonstration demandée sur une instance de test n'a pas pu être faite** : je n'ai pas accès à Hermes.
- **Pas de vrai PostgreSQL** : testé avec un simulateur.

## Écart

Les profils sont **déclarés** dans la configuration, car Hermes v0.17 ne permet pas de les lister par son API. La création et la suppression d'agents ne sont pas proposées, pour la même raison.

## Livrables

- [AGENT_REGISTRY.md](../product/AGENT_REGISTRY.md)
- [AGENT_DOMAIN_MODEL.md](../architecture/AGENT_DOMAIN_MODEL.md)
- Code : `server/registry/`, `server/storage/`, `src/ui/`
- Tests : `tests/server/registry.test.ts`, `e2e/live.spec.ts`
