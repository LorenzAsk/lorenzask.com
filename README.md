# lorenzask.com

My personal site. Plain HTML and CSS, with a 3D landscape drawn by
[Three.js](https://threejs.org) and run locally with [Vite](https://vite.dev).

## Run it on your Mac

```bash
npm install     # first time only: downloads the libraries into node_modules/
npm run dev     # starts the site at http://localhost:5173 and refreshes on save
```

Stop it with `Ctrl + C`.

## Where things are

| File | What it is |
|---|---|
| `index.html` | The homepage: hero, The long run, Off the clock, Moments. |
| `about/`, `contact/`, `privacy/` | The other pages, one folder each. |
| `src/style.css` | Colours, fonts, spacing. The colours are at the top. |
| `src/landscape.js` | The 3D landscape. The `SETTINGS` block at the top is safe to play with. |
| `src/motion.js` | Smooth scrolling, reveals, the header. |
| `src/ultra.js` | The long run: your chapters drawn as a race you scroll through. The chapters themselves are the list in `index.html`. |
| `src/cube.js` | The Rubik's cube on the homepage. |
| `src/forms.js` | The contact form and copy buttons. |
| `src/roadmap.js` | The Kvantra roadmap: a pinned scene where scrolling slides the milestones along a rising line. |
| `kvantra/index.html` | The Kvantra page: ambition, roadmap and the open role. |
| `public/` | Files copied as they are: the tab icon and photos. |
| `public/icons/` | The Kvantra mark used in the footer. |
| `vercel.json` | Vercel settings (empty for now). |

## Adding a photo

Put the photo in `public/photos/`, then in `index.html` under `PHOTOS`, replace
a placeholder `<figure class="photo is-placeholder">` with one like the first:
an `<img>` pointing at `/photos/your-photo.jpg`, and a `<figcaption>`.
