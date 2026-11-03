# ADR-005 — Persistance dans le PostgreSQL existant

**Statut :** acceptée (mandat du 2026-11-03). Accès réel non vérifié (H6).

**Décision.** Remplacer SQLite par une base ou un schéma dédié sur le PostgreSQL existant, avec un rôle à moindre privilège. Aucun nouveau serveur de base.

**Conséquences.** Sauvegardes mutualisées avec l'existant, et pas de fichier local à gérer dans un conteneur. La création de la base devra être autorisée par l'opérateur. MinIO et pgvector ne sont pas utilisés au MVP.
