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
| Q6 — Exposition | Accès restreint (VPN ou liste d'autorisation) au MVP. | 04 | Oui |
| Branche Git | Travail sur `etapes-00-06`, sans toucher à `main` ni pousser. | 00 | Oui |

## Questions restées ouvertes

Seul l'opérateur peut y répondre, et elles ne bloquent pas les étapes 00 à 06 :

- **Q2** — Comment accéder à Hermes, et existe-t-il une instance de test ?
- **Q3** — Que sont réellement JARVIS et VEILLEUR dans Hermes ?
- **Q7** — Faut-il voir l'activité lancée hors du bureau (Telegram, CLI, cron) ?

Elles bloqueront l'étape 07.
