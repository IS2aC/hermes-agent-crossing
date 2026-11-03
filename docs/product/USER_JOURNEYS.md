# Parcours utilisateur

Statut : **proposition, en attente de validation** · Étape 00 · 2026-11-03

L'acteur principal est l'opérateur. Chaque parcours précise le comportement honnête attendu lorsque la donnée manque ou que l'action échoue.

## P1 — Ouvrir le bureau et comprendre la situation

1. L'opérateur se connecte.
2. Le bureau affiche la salle et les personnages à leur emplacement.
3. Chaque personnage montre un état : confirmé, inconnu ou indisponible.
4. Un indicateur global montre la connexion à Hermes.

**Si Hermes est injoignable :** le bureau reste visible, les états passent à « connexion perdue » ou « inconnu », et aucun personnage ne continue à sembler travailler.

## P2 — Associer un personnage à un agent

1. L'opérateur ouvre le registre.
2. Il voit deux listes : les agents découverts et les personnages locaux.
3. Il associe un personnage à un agent, puis choisit son emplacement.
4. Le personnage affiche désormais les données de cet agent.

**Si l'agent attendu n'est pas découvert (JARVIS, par exemple) :** il n'est pas affiché comme connecté. Le personnage reste « non associé ».

**Si un agent associé disparaît :** le lien est conservé et marqué « agent introuvable ». Rien n'est supprimé automatiquement.

## P3 — Consulter un agent

1. L'opérateur clique sur un personnage.
2. L'inspecteur affiche nom, description, modèle ou provider si disponibles, statut et dernière activité.
3. Chaque valeur indique sa provenance.

**Si une donnée n'est pas exposée :** le champ affiche « indisponible », jamais une valeur par défaut plausible.

## P4 — Parler à un agent

1. Depuis l'inspecteur, l'opérateur ouvre le chat.
2. L'agent et la session concernés sont affichés en permanence.
3. Il reprend une session autorisée ou en ouvre une nouvelle, si Hermes le permet.
4. Le message passe par le backend puis par Hermes.
5. La réponse s'affiche, en streaming si cette capacité est confirmée.
6. Il peut annuler une réponse en cours, si l'annulation est prise en charge.

**En cas d'échec, de timeout ou de coupure :** le message d'erreur est explicite, aucun faux succès n'apparaît, et la reprise utilise le même identifiant de session.

**Si une session appartient à une autre surface :** elle n'est pas reprise, car la doc indique un refus HTTP 409 pour les sessions CLI, TUI, Desktop, ACP et messagerie [Doc]. L'interface l'explique et propose une nouvelle session.

## P5 — Suivre l'activité et les tâches

1. L'opérateur ouvre le journal d'activité et filtre par agent ou par session.
2. Chaque ligne affiche sa source, son horodatage, son type et l'agent concerné.
3. Il ouvre le tableau des tâches locales, visiblement distinct de l'activité Hermes.

**Après une reconnexion :** les événements manqués sont récupérés si Hermes le permet, sans doublons. Sinon, un trou est signalé dans le journal.

## P6 — Voir un personnage réagir à un état réel

1. Un événement Hermes confirmé arrive, par exemple un outil qui démarre pendant un chat.
2. L'état visuel change selon une règle documentée.
3. Le panneau de debug montre l'état source, la règle appliquée et l'animation courante.

**Sans donnée :** représentation neutre. Une animation décorative n'a jamais valeur de preuve d'activité.

## P7 — Développer sans Hermes

1. Le développeur active le mode mock.
2. Un bandeau permanent signale la simulation.
3. Les données mock sont séparées des données réelles et ne sont pas disponibles en production.

## Couverture

| Parcours | Phases | MVP |
|---|---|---|
| P1 Ouvrir le bureau | 05, 06, 07, 12 | Oui |
| P2 Associer | 08 | Oui |
| P3 Consulter | 08 | Oui |
| P4 Parler | 09 | Oui |
| P5 Suivre | 10 | Oui, selon l'étape 07 |
| P6 Réagir | 11 | Oui, selon l'étape 07 |
| P7 Mode mock | 05, 07, 09 | Oui (développement) |
