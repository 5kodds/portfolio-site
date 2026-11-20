# ODS build files (vendored)

These files are copied, unchanged, from the Olaseni Design System build
(`5kodds/5kodds-olaseni-design-system`, commit `60bdeb5`, tokens v0.1, `@5kodds/ods-css` 0.1.0):

| File | Source |
|---|---|
| `ods-tokens.css` | `packages/tokens/dist/css/ods-tokens.css` |
| `ods.min.css` | `packages/css/dist/ods.min.css` |

**Never edit them by hand.** To update: run `npm run build` in the ODS repo and copy the two files
again. Once the packages are published to GitHub Packages, these can be replaced by
`@5kodds/ods-tokens` and `@5kodds/ods-css`.

Site-specific layout lives in `/assets/site.css`, which uses ODS semantic tokens only.
