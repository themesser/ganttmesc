# Planning Gantt

Les plannings sont des fichiers JSON dans `plans/`. Chaque fichier se charge
dans `index.html` avec **Load/Save → Charger un fichier JSON**.

Pour créer ou modifier un planning depuis une conversation, utilise Node.js
et `planning-mcp.mjs` depuis la racine du dépôt. Le script fonctionne sans
dépendance, en mode MCP local ou en ligne de commande.

- `node planning-mcp.mjs --list` décrit les outils et leurs paramètres.
- `node planning-mcp.mjs --call lister_plannings` affiche les identifiants des plannings.
- `node planning-mcp.mjs --call lire_planning '{"id":"<id>"}'` fournit les identifiants des lignes et éléments.
- `node planning-mcp.mjs --call creer_planning '{"titre":"Montage","debut":"2027-01-11"}'` crée un fichier et retourne son identifiant.
- Pour un fichier exporté par l’éditeur, place-le dans `plans/` sous un nom ASCII sans espaces, par exemple `mon-planning.json`.

Utilise les identifiants retournés pour ajouter ou modifier une ligne ou un
élément. Relis le JSON après écriture et signale la date finale si la
restriction par identifiant a reporté un élément. Pousse les nouveaux fichiers
ou modifications vers GitHub lorsque l’utilisateur autorise la publication.

Le serveur MCP parle sur stdin/stdout. Lance-le avec le chemin de
`planning-mcp.mjs` et définis `GANTT_PLANS_DIR` sur le chemin absolu de
`plans/` dans le clone. Il lit et écrit dans ce clone. Git permet de
partager ensuite les changements entre assistants.
