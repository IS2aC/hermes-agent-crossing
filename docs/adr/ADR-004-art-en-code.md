# ADR-004 — Art original écrit en code

**Statut :** remplacée par [ADR-008](ADR-008-sprites-claude-office.md) pour le bureau par défaut. Cet art reste affiché avec `/?skin=pixel`, et les bulles d'état viennent toujours de lui.

**Contexte.** Aucun asset source n'est retenu (étape 02), et aucun générateur d'images n'est disponible dans cet environnement.

**Décision.** Sprites et décors définis dans `tools/art/`, assemblés à partir de pièces, avec PNG versionnés et contrôlés.

**Conséquences.** Cohérence garantie entre frames, provenance claire, déclinaisons quasi gratuites. Le style reste limité par ce qu'on peut écrire en code. Un artiste pourra remplacer les PNG sans toucher au moteur, tant que la spécification est respectée.
