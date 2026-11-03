# Rapport — Étape 00 : Cadrage

## En résumé

J'ai défini ce que le produit doit être, ce qu'il contient au départ et comment on saura qu'il est réussi. Aucun code n'a été écrit.

## Ce qui a été fait

- Vision, utilisateurs et distinction des cinq notions clés (personnage, agent, session, tâche locale, activité Hermes).
- Périmètre du MVP et ce qui en est exclu.
- Sept parcours utilisateur, chacun avec son comportement en cas de problème.
- Hypothèses, risques, questions ouvertes, 28 critères d'acceptation.
- Jalons et livrables des phases 0 à 12.

## Ce que j'ai découvert

1. **Claude-Office n'a pas de vrai moteur** : c'est du React avec des positions en pourcentage, en vue isométrique. L'étape 05 construit plus qu'elle n'adapte.
2. **Son art n'est pas réutilisable tel quel** en vue de dessus.
3. **Une partie des images n'est pas libre** : le skin Dunder Mifflin est exclu de la licence MIT.
4. **Son serveur refuse tout accès hors de la machine locale** : il faut revoir la sécurité pour un VPS.
5. **Le plus gros risque produit** : d'après la doc publique, Hermes ne semble pas offrir de flux global d'activité. Le travail lancé depuis Telegram ou le CLI pourrait rester invisible.

## Non vérifié

- L'instance Hermes réelle : je n'y ai pas accès. Tout ce qui la concerne vient de la documentation publique.
- Claude-Office a seulement été lu à ce stade, pas exécuté.

## Arbitrages

Voir [DECISIONS.md](../project/DECISIONS.md).

## Livrables

- [PROJECT_BRIEF.md](../product/PROJECT_BRIEF.md)
- [MVP_SCOPE.md](../product/MVP_SCOPE.md)
- [USER_JOURNEYS.md](../product/USER_JOURNEYS.md)
- [ASSUMPTIONS_AND_RISKS.md](../project/ASSUMPTIONS_AND_RISKS.md)
- [ACCEPTANCE_CRITERIA.md](../project/ACCEPTANCE_CRITERIA.md)
- [MILESTONES.md](../project/MILESTONES.md)
