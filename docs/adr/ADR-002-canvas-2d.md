# ADR-002 — Canvas 2D et noyau sans dépendance

**Statut :** acceptée (mandat du 2026-11-03).

**Contexte.** Le DOM en pourcentage du source ne permet ni tri fiable, ni pixels nets. Le besoin est modeste : une salle, moins de 20 personnages.

**Décision.** Rendu Canvas 2D sans moteur de jeu. Le noyau (grille, collisions, chemins, caméra) est en TypeScript pur, testable sans navigateur. React reste en charge de l'interface autour.

**Conséquences.** Aucun poids de dépendance, tests simples, un rendu facile à remplacer. En contrepartie, il faut écrire soi-même boucle, chargement et caméra.

**Alternatives écartées.** Phaser ou PixiJS : capables, mais surdimensionnés et plus lourds à tester. DOM sur grille : plus simple pour l'interface, mais tri et rendu plus fragiles.
