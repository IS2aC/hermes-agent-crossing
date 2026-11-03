# Famille de personnages

Méthode : **Master Character → Character Family.**

## Règles de déclinaison

| Peut varier | Reste identique |
|---|---|
| Couleurs des vêtements, cheveux et peau | Tête, buste, jambes de base |
| Coiffure, dans la marge prévue | Tailles et proportions |
| Accessoires, en calques par-dessus | Cellule, ancrage, ordre des frames |
| Petits signes distinctifs | Cadences et règles d'animation |

**Techniquement :** un personnage est une palette et une liste de calques. Il ne redéfinit aucune pièce du corps.

## Fiches

Ces fiches ne décrivent **que l'apparence**. Elles ne disent rien de la configuration réelle d'un agent Hermes. L'identité visuelle est liée à un agent par un `AgentBinding` explicite, et « JARVIS » n'est affiché comme connecté que si sa présence est confirmée.

| Personnage | Couleur principale | Coiffure | Signe distinctif | Impression recherchée |
|---|---|---|---|---|
| **JARVIS** | Bleu nuit | Soignée, avec raie | Cravate dorée | Calme, majordome |
| **VEILLEUR** | Vert sombre | Longue | Lunettes turquoise | Attentif, vigilant |
| **DATA ANALYST** | Violet | Courte | Lunettes | Précis |
| **DEVOPS** | Orange | Casquette | Casquette à visière | Pratique, terrain |
| **DEVELOPER** | Vert clair | En pointes | Casque audio | Concentré |
| **RESEARCHER** | Blanc | Chignon | Blouse | Curieux |
| **SECURITY** | Noir | Courte foncée | Badge rouge | Vigilant, sérieux |

## Plan de production

1. Master Character : fait (étape 03).
2. JARVIS et VEILLEUR, prioritaires (étape 06).
3. Les 5 autres : même méthode, aucun coût de dessin supplémentaire (étape 06).
4. Contrôle automatique de chaque personnage, puis contrôle visuel de la famille côte à côte.
