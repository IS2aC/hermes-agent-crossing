# ADR-006 — Un opérateur, accès restreint

**Statut :** acceptée (mandat du 2026-11-03).

**Décision.** MVP pour un opérateur unique, avec authentification par session côté serveur, et accès réseau restreint par VPN ou liste d'autorisation sur Traefik. Les tables prévoient l'identifiant d'un propriétaire pour ajouter des comptes plus tard.

**Conséquences.** Surface d'attaque réduite, car l'application pilote de vrais agents. Accès public et gestion de rôles à revoir avant toute ouverture.
