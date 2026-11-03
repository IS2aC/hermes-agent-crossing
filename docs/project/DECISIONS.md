# Journal des arbitrages

L'opérateur a demandé le 2026-11-03 d'avancer jusqu'à l'étape 06 en appliquant les options recommandées, avec un commit et un rapport par étape, sans push. Les validations de phase prévues par les prompts sont donc remplacées par ce mandat, et l'opérateur relira le tout avant de pousser.

| Question | Décision | Étape | Réversible ? |
|---|---|---|---|
| Q1 — Où vit le code ? | `hermes-agent-crossing` est le dépôt produit. Claude-Office reste un clone de référence en lecture seule, au commit `1a9ba71`, hors du dépôt. | 00 | Oui |
| Q4 — Utilisateurs | Opérateur unique au MVP, avec un modèle qui permet d'ajouter des comptes. | 04 | Oui |
| Q5 — Production des sprites | Art écrit en code dans `tools/art/`, au lieu de la recommandation initiale (génération par IA puis retouche). Aucun outil de génération n'est disponible ici, et cette méthode garantit la cohérence entre frames et une provenance claire. Un artiste pourra retoucher plus tard. | 03 | Oui |
| Moteur de rendu | Canvas 2D sans moteur de jeu, avec un noyau TypeScript testable sans navigateur. | 04 | Oui, derrière une interface |
| Fork de Claude-Office | Non : application propre, même stack, import module par module. | 01 | Oui |
| Assets source | Aucun réutilisé. | 02 | Oui |
| Style visuel | **Validé par l'opérateur** le 2026-11-03, après la démonstration de l'étape 06. | 06 | Oui |
| Famille de personnages | Les 7 personnages sont produits à l'étape 06, au lieu de 2 au MVP, car leur coût est quasi nul avec l'art en code. | 06 | Oui |
| Q6 — Exposition | Accès restreint (VPN ou liste d'autorisation) au MVP. | 04 | Oui |
| Branche Git | Travail sur `etapes-00-06`, sans toucher à `main` ni pousser. | 00 | Oui |

## Mandat étendu

Le 2026-11-03, l'opérateur a étendu le même mandat jusqu'à l'étape 12 : commit et rapport par étape, options recommandées, sans push.

## Réponses de l'opérateur

- **Q2 (partielle)** — Hermes Agent v0.17.0, build 2026.6.19, commit `2bd1977d`, Python 3.13.5, projet `/opt/hermes`, binaire `/opt/hermes/.venv/bin/hermes`. Une sauvegarde `/opt/data/backups/hermes-v0.17-20261021-2217.tar.gz` confirme la version. **Pas d'accès au VPS depuis cet environnement, et pas d'instance de test identifiée.**
- **Q3** — JARVIS et VEILLEUR sont des profils Hermes.
- **Q7** — Voir l'activité lancée hors du bureau est souhaité, sans être indispensable (« ça ne serait pas mal »).
