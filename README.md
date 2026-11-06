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
| `index.html` | The homepage: hero, Now, The long run, Off the clock, Moments. |
| `about/`, `contact/`, `privacy/` | The other pages, one folder each. |
| `src/style.css` | Colours, fonts, spacing. The colours are at the top. |
| `src/landscape.js` | The 3D landscape. The `SETTINGS` block at the top is safe to play with. |
| `src/motion.js` | Smooth scrolling, reveals, the header. |
| `src/ultra.js` | The long run: your chapters drawn as a race you scroll through. The chapters themselves are the list in `index.html`. |
| `src/cube.js` | The Rubik's cube on the homepage. |
| `src/forms.js` | The contact form and copy buttons. |
| `public/` | Files copied as they are: the tab icon and photos. |
| `public/icons/` | The Kvantra mark used in the footer. |
| `vercel.json` | Sends anyone with the old /kvantra/ link straight to kvantra.ai. |

## Updating the Now section

Edit the list under `NOW` in `index.html`, and change "Updated November 2026"
to the current month.

## Adding a photo

Put the photo in `public/photos/`, then in `index.html` under `PHOTOS`, replace
a placeholder `<figure class="photo is-placeholder">` with one like the first:
an `<img>` pointing at `/photos/your-photo.jpg`, and a `<figcaption>`.
