# Utter Pulsar Home

A static personal homepage for Utter Pulsar, prepared for manual upload to GitHub Pages and the custom domain `www.wumuhuan.com`.

## What to upload

Upload the **contents of this folder** (`utter-pulsar-home/`) to the root of the GitHub Pages repository, not the folder itself.

The root of the published repository should look like this:

```text
index.html
styles.css
script.js
CNAME
.nojekyll
assets/
projects/
README.md
```

Important files:

- `index.html` — homepage.
- `styles.css` and `script.js` — homepage styling and particle animation.
- `projects/crazy-os/` — Crazy OS project page.
- `projects/mlp-from-scratch/` — MLP Without Third-Party Library article page with HTML and LaTeX formula derivations.
- `projects/api-yes/` and `projects/doodlepilot/` — finished first-pass project article pages.
- `projects/meow-monitor/` and `projects/understanding-bayes/` — local coming-soon project pages.
- `assets/crazy-os/*.mp4` — self-contained Crazy OS demo videos used by the Crazy OS page.
- `assets/mlp-theory-pages/*.png` — exported page images from the original MLP theory PDF, kept as reference assets.
- `CNAME` — custom domain configuration for `www.wumuhuan.com`.
- `.nojekyll` — tells GitHub Pages to publish files exactly as static assets.

## GitHub Pages setup

1. Put these files in the repository used for GitHub Pages, usually `Utter-pulsar.github.io` or the repository selected in GitHub Pages settings.
2. In GitHub: **Settings → Pages**.
3. Set the source branch/folder you are publishing from.
4. Keep the custom domain as `www.wumuhuan.com`.
5. Make sure the `CNAME` file stays in the repository root.
6. After DNS has propagated, enable **Enforce HTTPS** if GitHub allows it.

## DNS reminder

For a `www` custom domain, the DNS provider normally needs a CNAME record:

```text
Name: www
Type: CNAME
Value: Utter-pulsar.github.io
```

If the GitHub Pages repository name is different, use the GitHub Pages hostname shown in the repository's Pages settings.

## Local preview

Because the site uses relative links, it can be previewed by opening `index.html` directly in a browser. For the most accurate preview, run a small static server inside this folder, for example:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Notes for future iteration

- The site is currently fully static: HTML, CSS, and JavaScript only.
- Crazy OS videos are copied into `assets/crazy-os/` so the uploaded folder is self-contained.
- Remaining coming-soon project pages are intentionally minimal and can be replaced one by one later.
