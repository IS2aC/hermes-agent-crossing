# ADR-001 — Application propre plutôt que fork

**Statut :** acceptée (mandat du 2026-11-03).

**Contexte.** Les parties les plus volumineuses de Claude-Office sont aussi les plus couplées à Claude Code, et des images hors licence sont présentes dans son historique.

**Décision.** Construire dans `hermes-agent-crossing`, avec la même stack, et importer module par module avec la mention MIT.

**Conséquences.** Les mises à jour du source ne seront pas récupérées automatiquement, et plus de code est à écrire au départ. En échange, pas de contenu non libre dans l'historique, et un socle sans couplage.

**Alternative écartée.** Fork : démarrage plus rapide, mais il faudrait retirer le couplage et le skin, sans pouvoir tester le résultat dans cet environnement.
