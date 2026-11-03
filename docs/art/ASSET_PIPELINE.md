# Pipeline des assets

## Principes

1. **Aucun original n'est altéré** : les assets du source restent dans le dépôt source.
2. **Provenance traçable** : chaque asset du produit est lié à sa source et à sa méthode de création.
3. **Vérification automatique** : dimensions, transparence, alignement et licence sont contrôlés.
4. **Séparer présentation et moteur** : une planche de présentation n'est jamais chargée par le moteur.

## Organisation

```
tools/art/                   Code source de l'art (versionné, reproductible)
public/assets/
  characters/<id>.png        Spritesheets
  environment/<atlas>.png    Tuiles et mobilier
  effects/<atlas>.png        Bulles et icônes
  manifest.json              Découpage, ancrages, provenance
docs/art/previews/           Planches de présentation, jamais chargées par le moteur
```

## Convention de nommage

- Tout en minuscules, avec des tirets : `character-jarvis.png`.
- Identifiants stables, indépendants du fichier : `character.jarvis`, `tile.floor-wood`, `prop.desk`.
- Identifiants d'animation : `idle`, `walk`, `work`, `think`.
- Directions : `down`, `left`, `right`, `up`.
- Le nom d'un agent Hermes n'apparaît jamais dans un identifiant technique d'agent : le lien passe par `AgentBinding`.

## Étapes de production

1. Définir ou modifier l'asset dans `tools/art/`.
2. Générer les PNG et le manifeste.
3. Contrôler automatiquement.
4. Examiner une planche de présentation agrandie.
5. Valider, puis versionner le PNG **et** sa source.

## Importer un asset externe

Interdit par défaut. Une exception exige, dans le manifeste : auteur, licence, URL ou preuve, méthode, et copie de l'original.
