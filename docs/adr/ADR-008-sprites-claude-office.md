# ADR-008 — Bureau et sprites de Claude-Office

**Statut :** acceptée par l'opérateur le 2026-11-03. Remplace [ADR-004](ADR-004-art-en-code.md) pour le bureau affiché.

**Contexte.** L'opérateur a remarqué que Claude-Office fournit déjà des personnages et un bureau. L'essai montre qu'ils fonctionnent dans l'application, avec un rendu plus riche que l'art écrit en code. L'audit de l'étape 02 les avait écartés en surestimant l'obstacle : chaque personnage a 4 poses diagonales, et la salle a une zone de marche et des emplacements définis.

**Décision.** Le bureau par défaut utilise la salle de jour, le mobilier et 8 personnages de Claude-Office, copiés dans `public/assets/skin-source/` avec `LICENSE.txt` et `NOTICE.md`. L'ancien bureau reste disponible avec `/?skin=pixel`.

**Écart assumé avec le cadrage.** Le cadrage demandait une vue orthogonale et un Master Character. Le bureau par défaut est maintenant isométrique, et ses personnages ne dérivent pas du Master.

**Fichiers écartés.** Skin *The Office* (exclu de la licence MIT), salles `-dm`, fichiers `Me-*`, `Helper` et `TEMPLATE` (ils pourraient représenter de vraies personnes), personnage Claude. `tools/check-build.mjs` refuse ces fichiers dans le build, sauf le personnage Claude, écarté par la liste de `src/scene/sourceSkin.ts`.

**Modification apportée.** `tools/art/retouch-room.mjs` remplace la plaque « CLAUDE » de la porte par « HERMES ». L'affiche « SHIP IT » et le tableau de tâches peint restent dans l'image : ce tableau est un décor, et il ne reflète aucune tâche réelle.

**Conséquences.**

- Environ 15 Mo d'images à charger, performances non mesurées.
- Pas d'images de pas : le personnage glisse en oscillant. Un état neutre reste immobile.
- Pas de zoom au clavier : la salle s'ajuste à la fenêtre.
- Rendu lissé, et non pixel-perfect.
- **Risque de provenance ouvert :** `NOTICE.md` annonce la licence MIT, mais des scripts du dépôt utilisent des générateurs d'images, sans que l'on sache quels fichiers en sortent. À clarifier avec l'auteur, W17ANT, avant une diffusion publique.
