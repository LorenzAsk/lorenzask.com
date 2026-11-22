# lorenzask.com

My personal site: one dark page with my name, a Contact and a Startup
section that open like an FAQ, and the Kvantra mark. Plain HTML and CSS, plus one small script for the mark, run locally with
[Vite](https://vite.dev).

## Run it on your Mac

```bash
npm install     # first time only: downloads Vite into node_modules/
npm run dev     # starts the site at http://localhost:5173 and refreshes on save
```

Stop it with `Ctrl + C`.

## Where things are

| File | What it is |
|---|---|
| `index.html` | The whole page: the name, the two sections and the Kvantra mark. |
| `src/style.css` | Colours, fonts and layout. The colours and fonts are at the top. |
| `src/mark.js` | Makes the Kvantra mark scatter into dots under the mouse and rebuild. The `SETTINGS` block at the top is safe to play with. |
| `public/favicon.svg` | The icon in the browser tab. |
| `public/fonts/` | The two fonts (Instrument Serif and Inter) and their licences. Hosted here so the page loads nothing from other sites. |
| `vercel.json` | Sends the old addresses (`/about/`, `/kvantra/`, `/contact/`, `/privacy/`) to the homepage. |

## Changing things

- **A link:** each section in `index.html` starts with a line of links (`panel-links`).
- **The Kvantra text:** the two `<p>` paragraphs under it in the Startup section.
- **Which section starts open:** the one whose `<details>` tag has the word `open`.
- **Colours:** the tokens at the top of `src/style.css` (`--bg`, `--text`, `--mark`).

## Publishing

The site is hosted on Vercel and updates when you push to GitHub:

```bash
git add -A
git commit -m "Describe the change"
git push
```

Commit under your own name only. On this plan, Vercel blocks a deployment
from a private repository when the commit has a co-author line.
