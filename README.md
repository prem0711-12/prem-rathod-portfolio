# Prem Rathod — Portfolio

Redesigned static portfolio site. No build step, no dependencies to install.

## Run locally

From this folder, start any static file server, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

(Opening `index.html` directly by double-clicking also works, but a local
server is recommended so relative paths and the smooth-scroll/GSAP scripts
behave exactly like they will on real hosting.)

## Deploying

This is a plain static site — upload the whole folder as-is to GitHub Pages,
Netlify, Vercel, or any static host. `index.html` is the homepage.

## Structure

```
index.html                                    Home
about.html                                     About
contact.html                                   Contact
case-studies/slack-support-assistant/index.html   Featured case study
assets/css/style.css                           Shared design system (tokens, nav, buttons, loader, cursor, transitions)
assets/css/home.css                            Home page only
assets/css/inner.css                           About / Contact pages
assets/css/case-study.css                      Case study page
assets/js/main.js                              All interactivity (loader, cursor, page transitions, reveals, workflow simulation)
assets/img/slack-support-assistant-demo.gif    Case study demo recording
```

## Adding a future project

Other Projects on the homepage (`index.html`) is a simple numbered list —
copy one `.project-row` block, bump the number, and update the text/link/tag.
When you're ready to add a second full case study, duplicate the
`case-studies/slack-support-assistant/` folder as a template (same CSS
classes: `.cs-hero`, `.checklist`, `.cs-sections` etc. all work the same way)
and link it from the "Case Study" nav item or from a new entry in the
featured-teaser section.

## External libraries

Loaded from jsDelivr CDN (no install needed, requires internet at runtime):
- GSAP 3.12.5 — headline/loader animation, hero glow parallax
- GSAP ScrollTrigger 3.12.5 — scroll-linked parallax
- Lenis 1.1.18 — smooth scrolling

All motion gracefully degrades if a script fails to load or the visitor has
"reduce motion" enabled — content still reveals and the site stays fully
usable and accessible.
