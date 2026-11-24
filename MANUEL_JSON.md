# GanttMesc · Manuel JSON pour Claude et ChatGPT

Ce manuel permet à un assistant de créer ou de modifier un planning compatible avec GanttMesc. Dans l’éditeur, **Load/Save → Sauvegarder le JSON** exporte un planning existant et **Load/Save → Charger un fichier JSON** ouvre le résultat.

## Consigne à donner à l’assistant

> Utilise le format décrit dans ce manuel. Travaille sur le fichier JSON joint ou pars de l’exemple si je demande un planning vierge. Modifie uniquement ce que je demande, conserve les identifiants et les champs existants, puis renvoie le JSON complet dans un fichier UTF-8 téléchargeable. Signale les dates déplacées à cause d’une restriction. Si un nom désigne plusieurs éléments, demande lequel modifier.

Le JSON doit contenir un seul objet, sans commentaires ni virgules finales. Les dates sont au format `AAAA-MM-JJ` et **la date de fin d’un élément est incluse**. Pour un élément d’un seul jour, `start` et `end` ont la même valeur.

## Structure du planning

| Champ | Type | Rôle |
| --- | --- | --- |
| `title` | Chaîne, obligatoire | Titre du planning. |
| `lots` | Tableau, obligatoire | Lots et lignes, dans leur ordre d’affichage. Peut être vide. |
| `items` | Tableau, obligatoire | Tâches, jalons, livraisons et périodes chômées. Peut être vide. |
| `startDate`, `endDate` | Dates, facultatives | Début du graphique et fin estimée. Les éléments peuvent étendre l’axe au-delà de la fin estimée. |
| `hideWeekends` | Booléen, facultatif | Masque les colonnes du samedi et du dimanche. |
| `hideHolidays` | Booléen, facultatif | Masque les colonnes des jours chômés. |
| `hideDayNumbers` | Booléen, facultatif | Masque uniquement les chiffres de la barre des jours. Les colonnes, les mois et les dates de livraison restent visibles. |

Les trois options d’affichage valent `false` par défaut. Un export peut aussi contenir un `copyId` interne. Conserve-le si tu modifies un fichier existant.

### Lots et lignes

Chaque lot contient `id`, `name`, `color` (format `#RRGGBB`) et `rows`. Chaque ligne contient `id` et `name`. Si `inline` vaut `true`, la première ligne tient lieu de titre du lot et les suivantes sont ses sous-lignes. Sinon, le titre du lot s’affiche au-dessus de ses lignes.

Utilise des identifiants uniques dans l’ensemble du document, y compris entre lots, lignes et éléments. Utilise des lettres ASCII, des chiffres, des tirets ou des underscores. Les champs `lot` et `row` d’un élément contiennent des identifiants, pas des intitulés. La ligne référencée doit appartenir au lot indiqué.

### Éléments

Chaque élément comporte `id`, `kind`, `start` et `end`. `name` est le libellé facultatif.

| Valeur de `kind` | Champs de rattachement | Format attendu |
| --- | --- | --- |
| `task` | `lot` et `row` | Tâche d’un ou plusieurs jours. |
| `delivery` | `lot` et `row` | Livraison ponctuelle. Utilise la même date dans `start` et `end`. |
| `review` | `lot` et `row` | Envoi suivi d’un délai de retour. Utilise `start = end` et indique le nombre de jours ouvrés dans `bufferDays`. |
| `marker` | Aucun | Jalon global. `diamond: true` l’affiche en losange. `caption` peut remplacer la date affichée pour un jalon non marqué comme livraison. |
| `off` | Aucun | Vacances, jour férié ou autre période chômée. Pour une seule journée, utilise `start = end`. |
| `allocation` | `lot` | Affectation visible dans la barre du haut, sans ligne de travail. |

**Tampons.** Pour `task`, `delivery`, `marker` et `review`, `bufferDays` est un entier positif exprimé en jours ouvrés. Omettre le champ ou utiliser `0` désactive le tampon. Pour un `review`, le décompte commence à `start`. Pour les autres types, il commence le lendemain de `end`. Les samedis, dimanches et périodes `off` sont exclus. Dans d’anciens exports, un `review` peut avoir une plage dans `start` et `end` ou un champ `extra`. Préserve ces données si tu ne modifies pas cet élément.

**Restrictions.** `restriction` est un identifiant facultatif pour `task`, `delivery`, `marker` et `review`, par exemple `"montage"`. La comparaison ignore la casse et les espaces aux extrémités. Si deux éléments de même identifiant se chevauchent, l’éditeur peut reporter l’élément au prochain créneau disponible, qui commence un jour ouvré. Le report conserve la durée de l’élément. Un tampon seul ne réserve pas la ressource.

## Exemple de fichier importable

```json
{
  "title": "Planning de production",
  "startDate": "2027-02-01",
  "endDate": "2027-02-26",
  "hideWeekends": true,
  "hideHolidays": false,
  "hideDayNumbers": false,
  "lots": [
    {
      "id": "lot-video",
      "name": "Vidéo",
      "color": "#378ADD",
      "rows": [
        {"id": "ligne-montage", "name": "Montage"}
      ]
    }
  ],
  "items": [
    {
      "id": "montage-v1",
      "kind": "task",
      "name": "Montage V1",
      "lot": "lot-video",
      "row": "ligne-montage",
      "start": "2027-02-08",
      "end": "2027-02-10",
      "restriction": "monteur"
    },
    {
      "id": "livraison-v1",
      "kind": "delivery",
      "name": "Envoi V1",
      "lot": "lot-video",
      "row": "ligne-montage",
      "start": "2027-02-11",
      "end": "2027-02-11",
      "bufferDays": 3
    },
    {
      "id": "vacances-hiver",
      "kind": "off",
      "name": "Vacances",
      "start": "2027-02-15",
      "end": "2027-02-16"
    },
    {
      "id": "validation-finale",
      "kind": "marker",
      "name": "Validation finale",
      "start": "2027-02-19",
      "end": "2027-02-19"
    }
  ]
}
```

## Avant de renvoyer le fichier

1. Vérifie le JSON, les dates, l’unicité des identifiants et les références `lot` / `row`.
2. Pour déplacer une tâche en conservant sa durée, décale `start` et `end` du même nombre de jours. Pour une livraison ponctuelle, déplace les deux dates ensemble.
3. Vérifie les conflits sur l’identifiant et indique toute date reportée. Si seul l’affichage change, préserve les dates et les éléments.
4. Renvoie le fichier complet. Dans le navigateur, les fichiers sont échangés par import/export. Avec le MCP local configuré, l’assistant peut lire et écrire les JSON du dossier `plans/`.
