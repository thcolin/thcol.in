# thcol.in

Mon site perso, une page statique qui me présente : header (nom, photo, liens) et section `#projects`. Pour qui tombe sur mon nom.

## Dépôt

`thcolin/thcol.in`, public, base `main`. Parcel 2, source `src/index.html`, sortie `dist/`. Publié sur GitHub Pages (branche `gh-pages`, CNAME `thcol.in`).

## Lancer

```bash
yarn install
yarn start   # http://localhost:8080
```

## Vérifier

`yarn build` doit passer. Pas de tests, pas de lint.

## Recette visuelle

- Chantier frontend : tout ce qui touche `src/`.
- Lancer : un build de prod servi en statique, `npx parcel build src/index.html --public-url ./ --dist-dir <scratchpad>/dist` puis `python3 -m http.server 8082` dans ce dossier, et ouvrir `http://localhost:8082/#projects` dans le Chrome du MCP `chrome-devtools`. `yarn start` affiche en dev l'overlay d'erreur de Parcel sur le warning `defaultProps` de `react-responsive-virtual-grid`, qui masque la page.
- Tailles : 1440×900 et 390×844.
- Données : aucune base, tout le contenu est dans `src/`.
- Jamais depuis une session : `yarn deploy`, qui publie sur `gh-pages` et met le site en ligne.

## Où vit le suivi

Rien dans le dépôt. Les chantiers sont dans le vault, `self/projects/thcol.in/`.

## Ce qui tourne

GitHub Pages, `https://thcol.in`, gratuit. Le domaine est chez Gandi.

## Autonomie

`commit` et PR, comme tout le perso. Le dépôt est public : une PR est visible.

## Commits

Conventional Commits, la portée du chantier en scope, en anglais.

## Pièges

- React reste en 18 : `react-responsive-virtual-grid` 0.0.26 pose `defaultProps` sur un composant fonction, que React 19 ignore.
- `.shots/` est ignoré par git : captures de recette, jamais commitées.
