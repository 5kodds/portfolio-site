# Olaseni Otusanya: Personal Site

Personal website for Olaseni Otusanya.

**Live domain:** https://olaseniotusanya.site

**Positioning:** Builder, Product Thinker & Entrepreneur  
**Focus:** AI × Business × Real Economy  
**Working principle:** Build what matters. Understand what changes.

## Current work

- **Unabdicated**: book on judgment, agency and the human mind in the age of AI
- **PolicyPilot**: AI-assisted policy analysis prototype
- **Treeinapool**: digital growth and local-visibility studio

## Deployment

The live site is published with GitHub Pages from the `personal-brand-v1` branch.

## Design system

The site is built on the **Olaseni Design System (ODS)**, direction "A + C": calm structure, luminous detail.

- **Tokens and components:** `assets/ods/` holds the ODS build (`ods-tokens.css`, `ods.min.css`), copied unchanged from `5kodds/5kodds-olaseni-design-system`. Never edit those files; see `assets/ods/README.md` to update them.
- **Site layout:** `assets/site.css` is the only site stylesheet. It uses ODS semantic tokens only (no raw colours), `--ods-space-*` for spacing, `--ods-z-index-*` for stacking and logical properties.
- **Components used:** button, icon button, link, card (default, interactive, spotlight, inverse, subtle), stat tile, badge, alert, avatar, field, radio card group, bottom bar, empty state.
- **Light and dark mode:** follows the system setting; the header toggle saves a choice in `localStorage` (`ods-mode`) and sets `data-ods-mode` on `<html>`.
- **Type:** Figtree for text, JetBrains Mono for numbers, prices, dates and overlines (Google Fonts, SIL OFL).
- **Icons:** `assets/icons.svg`, Lucide-style (1.8 px stroke, round caps).
- **Navigation:** pill navigation in the header from 768 px; the ODS floating bottom bar on phones.

Built as a lightweight static site using HTML, CSS and JavaScript. Preview locally with any static server from the repo root, e.g. `python -m http.server 8000`.
