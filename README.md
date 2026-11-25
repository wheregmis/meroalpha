# MeroAlpha

The landing page for [MeroAlpha](https://github.com/wheregmis/meroalpha), a macOS app where an AI agent researches the Nepal stock market (NEPSE) in a browser you can watch and runs a paper account in virtual NPR. No real money moves.

Plain HTML and CSS, no build step. Preview the pages alone with:

```sh
python3 -m http.server 4173
```

Screenshots and the in-browser demo (`demo/`) come from the app's synthetic tour fixture. The app repository builds the demo with NSH (`nsh package --target web`); `demo/` is committed so Cloudflare's Workers Builds deploys it from this repo with `wrangler.jsonc`. To refresh it, from the app repository:

```sh
npm run site:build    # rebuilds demo/; commit it here
npm run site:dev      # http://localhost:8787
```

## Status

MeroAlpha is in closed beta. Nothing is public yet: this site offers no downloads, install
script or release notes, only the in-browser demo. App source and releases stay private.
