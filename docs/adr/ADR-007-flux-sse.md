# ADR-007 — SSE plutôt que WebSocket

**Statut :** acceptée (mandat du 2026-11-03).

**Contexte.** L'architecture prévoyait WebSocket. Or le navigateur ne fait que recevoir : les actions passent déjà par des requêtes HTTP protégées.

**Décision.** Server-Sent Events pour le chat et le journal, avec le même cookie et les mêmes contrôles que le reste de l'API. Dépendance `ws` retirée.

**Conséquences.** Authentification unique, reconnexion native du navigateur, un seul flux à traverser dans Traefik, sans configuration WebSocket. Si le navigateur devait un jour envoyer un flux continu, il faudrait revoir ce choix.
