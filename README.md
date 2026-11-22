# lorenzask.com

My personal site: one dark page with my name, four links and the
Kvantra mark. Plain HTML and CSS, no JavaScript, run locally with
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
| `index.html` | The whole page: the name, the links and the Kvantra mark. |
| `src/style.css` | Colours, fonts and layout. The colours and fonts are at the top. |
| `public/favicon.svg` | The icon in the browser tab. |
| `vercel.json` | Sends the old addresses (`/about/`, `/kvantra/`, `/contact/`, `/privacy/`) to the homepage. |

## Changing things

- **A link:** each row in the `links` list in `index.html` is a label and a link.
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
