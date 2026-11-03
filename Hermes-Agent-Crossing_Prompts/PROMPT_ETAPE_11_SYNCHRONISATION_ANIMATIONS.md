# ÉTAPE 11 — Synchronisation des animations avec les états réels

## Rôle
Agis comme ingénieur gameplay 2D et développeur d'interfaces temps réel.

## Objectif
Faire correspondre les animations des personnages aux états vérifiés des agents, tout en conservant une représentation honnête des données disponibles.

## Travail demandé
1. Définis une machine à états visuels indépendante du moteur Hermes.
2. Établis une table de correspondance entre états runtime confirmés et animations disponibles.
3. Prévois au minimum : idle, marche, travail, réflexion et indisponible/connexion perdue si les assets le permettent.
4. N'infère pas « réfléchit », « travaille » ou « termine » à partir d'un simple délai ou d'une animation arbitraire.
5. Distingue états confirmés, états déduits avec règle explicite et états inconnus.
6. Gère les transitions, priorités, interruptions et animations de fallback.
7. Évite les changements d'animation trop fréquents avec un mécanisme de stabilité/hystérésis adapté.
8. Synchronise les déplacements uniquement avec des événements de navigation locaux ou des actions utilisateur, pas avec des événements Hermes sans rapport.
9. Ajoute une vue de debug montrant l'état source, la règle de mapping et l'animation courante.
10. Teste les pertes de connexion, états inconnus, événements tardifs et transitions rapides.

## Livrables
- `docs/graphics/AGENT_VISUAL_STATE_MACHINE.md`
- Table de mapping runtime → état visuel.
- Système de synchronisation et panneau debug.
- Tests de transitions et de cas limites.

## Critères d'acceptation
- Chaque animation liée à une activité réelle repose sur une donnée source documentée.
- L'état inconnu a une représentation neutre.
- Le renderer ne dépend pas directement de l'API Hermes.
- Les animations décoratives ne sont jamais présentées comme une preuve d'activité réelle.

## Validation de sortie
Démontre plusieurs transitions à partir d'événements réels ou de fixtures explicitement simulées. Attends validation avant l'étape 12.
