# Critères d'acceptation globaux

Statut : **proposition, en attente de validation** · Étape 00 · 2026-11-03

Le produit est acceptable pour le MVP lorsque tous les critères ci-dessous sont satisfaits, preuve à l'appui. Un critère rendu impossible par une limite de Hermes n'est pas supprimé en silence : il est documenté, puis arbitré.

## Honnêteté de l'état

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-01 | Toute animation liée à une activité repose sur une donnée source documentée | Table de correspondance, tests |
| CA-02 | L'état inconnu a une représentation neutre, distincte de l'inactivité | Test, capture |
| CA-03 | À la perte de connexion, aucun personnage ne semble encore actif | Test E2E avec coupure |
| CA-04 | JARVIS et VEILLEUR ne sont affichés comme connectés que si leur présence est confirmée | Test avec agent absent |
| CA-05 | Aucune réussite n'est affichée en cas d'échec | Tests d'erreur |

## Provenance et séparation des domaines

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-06 | La source de chaque information (Hermes, application, simulation) est visible | Test, capture |
| CA-07 | Les données locales ne sont jamais présentées comme venant de Hermes | Test de provenance |
| CA-08 | Un personnage peut exister sans agent et un agent sans personnage, et l'interface distingue ces cas | Test d'association |
| CA-09 | Le mode mock est visiblement identifiable et indisponible en production | Test, configuration |

## Fonctionnalités

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-10 | La scène est orthogonale, sans asset isométrique ; déplacement, collisions et profondeur fonctionnent | Démonstration, tests |
| CA-11 | Le rendu reste net aux échelles prises en charge | Procédure de validation visuelle |
| CA-12 | Tous les personnages dérivent du Master Character validé | Checklist par personnage |
| CA-13 | Les agents réellement disponibles sont découverts et associables | Démonstration sur instance de test |
| CA-14 | Une conversation réelle est traçable à un agent et à une session Hermes | Démonstration, journaux |
| CA-15 | Une reconnexion reprend la bonne session | Test de reconnexion |
| CA-16 | Des événements répétés ne créent pas de doublons | Test d'idempotence |

## Sécurité

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-17 | Aucun secret dans le navigateur, le bundle, Git ou les logs | Analyse du bundle et de Git, revue des logs |
| CA-18 | Le navigateur n'accède jamais directement à Hermes | Analyse réseau, revue d'architecture |
| CA-19 | Toutes les routes et le temps réel exigent une authentification, hors santé | Tests d'accès non authentifié |
| CA-20 | Seuls les ports nécessaires sont exposés publiquement | Revue de la configuration |
| CA-21 | Les opérations déclenchant une action réelle sont documentées et identifiées | `HERMES_API_CONTRACT.md` |

## Licences

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-22 | Chaque asset du build final a une licence ou une provenance établie | Audit, contrôle au build |
| CA-23 | Aucun élément exclu par `NOTICE.md` n'est livré | Contrôle au build |
| CA-24 | La licence MIT de Claude-Office est conservée pour le code réutilisé | Présence du fichier et de la mention |

## Infrastructure et exploitation

| ID | Critère | Preuve attendue |
|---|---|---|
| CA-25 | Aucun service existant n'est recréé | Revue de la configuration Docker et Dokploy |
| CA-26 | La production n'est pas modifiée sans accord explicite | Trace de l'accord |
| CA-27 | Healthchecks, sauvegarde, rollback et diagnostic sont documentés, et la restauration est testée | Runbook, trace du test |
| CA-28 | Le test de bout en bout passe : connexion, bureau, découverte, association, conversation, événements, états visuels | Rapport de test |

## Stratégie de validation progressive

### Règle de sortie de phase

Une phase n'est terminée que si les cinq conditions sont réunies :

1. les livrables du prompt existent ;
2. les tests indiqués passent, et leur résultat réel est joint ;
3. les preuves (fichier et symbole, capture, démonstration) sont fournies ;
4. les écarts et limites sont listés ;
5. **l'opérateur a donné son accord explicite.**

### Rapport de sortie

Chaque phase se termine par un rapport au même format :

- **Fait** : ce qui a été réalisé.
- **Preuves** : commandes exécutées et résultats observés.
- **Non vérifié** : ce qui n'a pas pu être testé, et pourquoi.
- **Écarts** : par rapport au prompt ou au cadrage.
- **Décisions à prendre** et recommandation de passage.

### Niveaux de preuve

| Niveau | Signification |
|---|---|
| Documenté | Écrit dans une doc, non testé |
| Testé avec mock | Test automatisé sur données simulées |
| Testé en local | Exécuté sur le poste de développement |
| Testé en staging | Exécuté avec une instance Hermes de test |
| Déployé en production | Déployé avec accord et vérifié |

Un niveau n'en remplace jamais un autre, et le rapport indique toujours lequel est atteint.

### En cas de blocage

La phase s'arrête. Le blocage est documenté et accompagné d'options. On ne passe jamais discrètement à la suite.

### Pyramide de tests

| Type | Couvre | À partir de |
|---|---|---|
| Unitaire | Coordonnées, collisions, machine à états, règles de correspondance | 05 |
| Chargement | Assets, découpage, sélection d'animation | 06 |
| Contrat | Adaptateur Hermes contre réponses réelles enregistrées | 07 |
| Intégration | Registre, chat, événements, persistance | 08 |
| E2E | Parcours P1 à P6 | 09, puis complet à 12 |
