# GanttMesc

**GanttMesC** signifie « gantt mes couilles ». C’est un éditeur de diagrammes de Gantt pour préparer et ajuster des plannings directement dans un navigateur. Il génère un JSON modifiable par ton agent IA pour le piloter avec le connecteur MCP; l'éditeur HTML te permets de le modifier manuellement et de l'imprimer.

## Créer et modifier un planning depuis Claude ou Codex

Le serveur [`planning-mcp.mjs`](planning-mcp.mjs) s’exécute en local avec Node.js. Il peut lister, lire et créer des plannings, ajouter des lignes ou modifier des tâches. Il lit et écrit les fichiers JSON dans le dossier défini par `GANTT_PLANS_DIR`.

- **Claude Desktop** : ajoute un serveur local dans `claude_desktop_config.json`. Indique le chemin absolu de Node comme commande, celui de `planning-mcp.mjs` comme argument et celui du dossier `plans/` dans `GANTT_PLANS_DIR`. Relance ensuite Claude.
- **Claude Code et Codex** : ouvre le dépôt comme projet. La [configuration du MCP local et les commandes](AGENTS.md) se trouvent dans `AGENTS.md`.

Exemple de demande : « Crée un planning Montage, puis ajoute une livraison le 15 juin 2027. » Charge le JSON obtenu dans l’éditeur via **Load/Save**. Le dépôt GitHub contient le code et les instructions. Le MCP actuel est exécuté sur ta machine.

## Démarrage rapide

1. Télécharge le dépôt ou clone-le, puis ouvre [`index.html`](index.html) dans ton navigateur. Aucune installation n’est nécessaire pour utiliser l’éditeur.
2. Dans **Load/Save**, choisis **Nouveau Gantt** pour partir d’un planning vierge ou **Charger un fichier JSON** pour reprendre un planning existant.
3. Dans **Paramétrage**, règle les dates du planning, les vacances et les jours chômés. Exemple : `20/02-7/03; 17/04-2/05; 6/05;`. Les week-ends et les vacances peuvent être masqués séparément.

## Aide de l’éditeur

| Action | Geste |
| --- | --- |
| Ajouter une tâche | Clique sur une case vide. Un clic droit permet de choisir le type d’élément. |
| Ajouter un jalon global | Fais **Maj + clic** dans la barre des jours. |
| Modifier un élément | Double-clique dessus pour changer son intitulé, ses dates, son type ou son tampon. |
| Déplacer ou redimensionner | Glisse le bloc pour le déplacer, ou tire l’une de ses extrémités pour changer sa durée. |
| Ajouter un tampon | Fais **Maj + glisser** depuis la fin du bloc, ou règle le tampon dans la fenêtre d’édition. Le délai se compte en jours ouvrés. |
| Organiser les lignes | Survole un titre pour afficher le **+**. **Maj + clic** ajoute une sous-ligne. Glisse un titre vers le haut ou le bas pour changer l’ordre des lignes. |
| Affecter un identifiant à plusieurs tâches | Trace un rectangle depuis une zone vide, puis double-clique sur un élément sélectionné. En cas de chevauchement, l’élément ajouté ou modifié est reporté au prochain créneau disponible pour cet identifiant. |
| Zoomer, annuler ou supprimer | Utilise la molette pour zoomer, **⌘Z** pour annuler, **⇧⌘Z** pour rétablir et **⌫** pour supprimer la sélection. |

**Load/Save** permet de sauvegarder ou charger un JSON, de télécharger une copie HTML et d’exporter en PDF via la fenêtre d’impression. Le bouton **Aide** reprend les gestes dans l’éditeur.


