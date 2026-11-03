# ÉTAPE 10 — Tâches, activités et événements

## Rôle
Agis comme architecte backend et développeur frontend spécialisé dans les tableaux de bord temps réel.

## Objectif
Fournir une vue lisible des tâches et activités associées aux agents, en distinguant les données locales des informations remontées par Hermes.

## Travail demandé
1. Identifie les événements et informations de tâches réellement disponibles via Hermes.
2. Définis deux domaines distincts :
   - tâches locales créées et suivies dans l'application ;
   - exécutions, sessions ou activités observées depuis Hermes.
3. Définis un modèle d'événement avec source, identifiant, horodatage, type, agent/session associé et niveau de confiance.
4. Implémente un tableau de tâches avec filtres, détails, historique et états.
5. Implémente un journal d'activité des agents.
6. Évite les doublons lors de la réception répétée d'événements.
7. Gère ordre des événements, reconnexion, pagination et rétention.
8. Affiche la provenance des informations : Hermes, application ou simulation.
9. Ne transforme pas une simple activité en tâche terminée sans preuve.
10. Si Hermes ne fournit pas les données attendues, expose une fonctionnalité locale clairement étiquetée ou laisse le champ indisponible.

## Livrables
- `docs/product/TASKS_AND_EVENTS.md`
- `docs/architecture/EVENT_MODEL.md`
- Tableau de tâches et journal d'activité.
- Tests d'idempotence, de tri, de reconnexion et de provenance.

## Critères d'acceptation
- L'utilisateur peut identifier la source de chaque information.
- Les données locales ne sont jamais présentées comme des données Hermes.
- Les événements répétés ne créent pas de doublons.
- Les états inconnus restent inconnus.

## Validation de sortie
Présente les flux réels et locaux séparément, avec des tests reproductibles. Attends validation avant l'étape 11.
