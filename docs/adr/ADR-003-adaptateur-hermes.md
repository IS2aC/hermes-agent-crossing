# ADR-003 — Hermes derrière une interface backend

**Statut :** acceptée (mandat du 2026-11-03).

**Contexte.** L'API réelle de l'instance n'a pas été vue, et le source n'offre aucune interface de fournisseur.

**Décision.** Le domaine dépend de l'interface `AgentPlatform`. Chaque opération renvoie une `Capability` : soit une valeur, soit une raison d'indisponibilité. Hermes et le mock sont deux implémentations.

**Conséquences.** Une limite de Hermes se traduit en affichage « indisponible », jamais en faux succès. Le mock permet de développer sans Hermes.

**Point ouvert.** L'interface est une hypothèse de travail, à ajuster à l'étape 07 selon les capacités vérifiées.
