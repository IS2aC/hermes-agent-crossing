# Rapport — Étape 04 : Architecture

## En résumé

J'ai défini comment les morceaux s'emboîtent. Le navigateur ne parle jamais à Hermes : tout passe par un backend qui garde les secrets. Le moteur de bureau est indépendant et fonctionne avec des données simulées.

## Décisions principales

| Décision | En clair |
|---|---|
| Application propre | On ne forke pas Claude-Office |
| Canvas 2D, sans moteur de jeu | Léger et facile à tester |
| Hermes derrière une interface | Une capacité absente s'affiche « indisponible », jamais comme un faux succès |
| Art en code | Cohérent et sans souci de provenance |
| PostgreSQL existant | Pas de nouveau serveur de base |
| Un opérateur, accès restreint | Parce que l'application pilote de vrais agents |

## Preuves

Contrats TypeScript créés dans `src/domain/` : `tsc --noEmit` passe, voir le commit de cette étape. Les contrats ne contiennent aucun endpoint Hermes, conformément au prompt.

## Non vérifié / limites

- **Le backend n'est pas écrit** : il arrive à l'étape 07.
- **L'interface avec Hermes est une hypothèse** à corriger une fois l'instance vue.
- **Les coûts sont relatifs**, aucune durée n'est donnée.
- **L'accès réel à PostgreSQL et aux réseaux Docker** n'a pas été vérifié.

## Livrables

- [TARGET_ARCHITECTURE.md](../architecture/TARGET_ARCHITECTURE.md)
- [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)
- [DATA_FLOWS.md](../architecture/DATA_FLOWS.md)
- [SECURITY_BOUNDARIES.md](../architecture/SECURITY_BOUNDARIES.md)
- [ADR 001 à 006](../adr)
- Contrats : `src/domain/`
