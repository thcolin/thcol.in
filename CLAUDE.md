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
- Lancer : `yarn start`, puis ouvrir `http://localhost:8080/#projects` dans le Chrome du MCP `chrome-devtools`.
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
