# ADR-004 — Art original écrit en code

**Statut :** acceptée (mandat du 2026-11-03).

**Contexte.** Aucun asset source n'est retenu (étape 02), et aucun générateur d'images n'est disponible dans cet environnement.

**Décision.** Sprites et décors définis dans `tools/art/`, assemblés à partir de pièces, avec PNG versionnés et contrôlés.

**Conséquences.** Cohérence garantie entre frames, provenance claire, déclinaisons quasi gratuites. Le style reste limité par ce qu'on peut écrire en code. Un artiste pourra remplacer les PNG sans toucher au moteur, tant que la spécification est respectée.
