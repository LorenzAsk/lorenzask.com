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
| `index.html` | All the text on the page. Look for `✏️` comments. |
| `src/style.css` | Colours, fonts, spacing. Colours are at the top. |
| `src/landscape.js` | The 3D landscape. The `SETTINGS` block at the top is safe to play with. |
| `src/main.js` | Starts everything. |
| `public/` | Files copied as-is, like the browser-tab icon. |
