# Journal des arbitrages

L'opérateur a demandé le 2026-11-03 d'avancer jusqu'à l'étape 06 en appliquant les options recommandées, avec un commit et un rapport par étape, sans push. Les validations de phase prévues par les prompts sont donc remplacées par ce mandat, et l'opérateur relira le tout avant de pousser.

| Question | Décision | Étape | Réversible ? |
|---|---|---|---|
| Q1 — Où vit le code ? | `hermes-agent-crossing` est le dépôt produit. Claude-Office reste un clone de référence en lecture seule, au commit `1a9ba71`, hors du dépôt. | 00 | Oui |
| Q4 — Utilisateurs | Opérateur unique au MVP, avec un modèle qui permet d'ajouter des comptes. | 04 | Oui |
| Q5 — Production des sprites | Remplacée à l'étape 03, voir ci-dessous. | 03 | Oui |
| Q6 — Exposition | Accès restreint (VPN ou liste d'autorisation) au MVP. | 04 | Oui |
| Branche Git | Travail sur `etapes-00-06`, sans toucher à `main` ni pousser. | 00 | Oui |

## Questions restées ouvertes

Seul l'opérateur peut y répondre, et elles ne bloquent pas les étapes 00 à 06 :

- **Q2** — Comment accéder à Hermes, et existe-t-il une instance de test ?
- **Q3** — Que sont réellement JARVIS et VEILLEUR dans Hermes ?
- **Q7** — Faut-il voir l'activité lancée hors du bureau (Telegram, CLI, cron) ?

Elles bloqueront l'étape 07.
