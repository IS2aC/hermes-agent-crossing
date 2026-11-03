# ÉTAPE 08 — Registre et gestion des agents

## Rôle
Agis comme architecte produit et développeur full-stack spécialisé dans les interfaces d'administration d'agents IA.

## Objectif
Permettre à l'utilisateur de visualiser et gérer les agents dans le bureau virtuel, sans confondre représentation locale et configuration native Hermes.

## Modèle obligatoire
Sépare :
1. `CharacterProfile` : identité visuelle locale (sprite, nom d'affichage, couleur, emplacement).
2. `AgentDefinition` : définition/configuration réelle identifiée dans Hermes, si exposée.
3. `AgentRuntime` : état observé d'une instance ou session en cours.
4. `AgentBinding` : association explicite entre profil visuel et agent réel.

## Travail demandé
1. Définis le registre des agents et ses identifiants stables.
2. Implémente la découverte des agents réellement disponibles via le connecteur validé à l'étape 07.
3. Permets d'associer un personnage à un agent réel.
4. Gère les agents indisponibles, non associés ou dont l'état est inconnu.
5. Présente les métadonnées vérifiées : nom, description, modèle/provider si disponible, statut et dernière activité.
6. N'implémente les actions de création, modification ou suppression native que si Hermes les supporte réellement et que les permissions sont explicites.
7. Fournis une interface de gestion claire : fiche agent, association personnage, emplacement dans le bureau et statut de connexion.
8. Ajoute des données de démonstration distinctes des données de production.

## Livrables
- `docs/product/AGENT_REGISTRY.md`
- `docs/architecture/AGENT_DOMAIN_MODEL.md`
- Interface de registre et inspecteur d'agent.
- Tests des associations, états inconnus et erreurs de découverte.

## Critères d'acceptation
- Un personnage local peut exister sans agent Hermes associé.
- Un agent Hermes peut être découvert sans personnage associé.
- L'interface distingue explicitement ces cas.
- Aucun statut non vérifié n'est présenté comme réel.
- Les agents JARVIS et VEILLEUR ne sont affichés comme connectés que si leur présence est confirmée.

## Validation de sortie
Démontre le cycle de découverte et d'association avec l'instance Hermes de test. Attends validation avant l'étape 09.
