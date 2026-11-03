# MeroAlpha

The landing page for [MeroAlpha](https://github.com/wheregmis/meroalpha), a macOS app where an AI agent researches the Nepal stock market (NEPSE) in a browser you can watch and runs a paper account in virtual NPR. No real money moves.

Plain HTML, CSS and JavaScript modules, no build step. Everything the site serves is in `public/`; `scripts/`, `tests/` and the release contract stay outside it and are never published.

```
public/          the Workers asset root (wrangler.jsonc)
  index.html  privacy.html  terms.html  install.sh  _headers
  css/         tokens.css (the app's colours) · base.css · site.css (shared) · landing.css · legal.css
  js/          changelog.mjs · release-notes.mjs · tabs.mjs · motion.mjs · copy.mjs
  assets/  demo/
scripts/  tests/  release-contract.json
```

`public/css/tokens.css` mirrors the light and dark `theme.cssVars` in the agent's `apps/desktop/nsh.json`; the site uses those colours only, as the agent's `docs/design-system.md` describes. Preview the pages alone with:

```sh
python3 -m http.server 4173 -d public
```

Screenshots and the in-browser demo (`public/demo/`) come from the app's synthetic tour fixture. The app repository builds the demo with NSH (`nsh package --target web`); `public/demo/` is committed so Cloudflare's Workers Builds deploys it from this repo with `wrangler.jsonc`. To refresh it, from the app repository:

```sh
npm run site:build    # rebuilds public/demo/; commit it here
npm run site:dev      # http://localhost:8787
```

## Workers Builds and local validation

`wrangler preview` requires the tracked `previews: {}` block in `wrangler.jsonc`; branches created before that fix must bring in current `master`. Static assets live in `public/`. A read-only packaging check is `npx wrangler@4.156.2 deploy --dry-run`; it does not create a Preview or deploy the site.

The asset root is `public/`, so scripts, tests and configuration are outside it. `public/.assetsignore` still excludes hidden files there, such as environment files and tooling databases. Never copy credentials or private application data into `public/`.


## Install

On a Mac with Apple silicon (macOS 14+), one command installs the latest release into `/Applications`:

```sh
curl -fsSL https://meroalpha.com/install.sh | sh
```

It downloads the ZIP and its checksum from the latest release, checks the checksum, re-signs the app ad-hoc,
replaces any installed copy only once the new one is in place, and opens it. Read it first at
[meroalpha.com/install.sh](https://meroalpha.com/install.sh) ([`public/install.sh`](public/install.sh) here). It skips the
Privacy & Security prompt because `curl` does not mark files as downloaded from the internet, which is what
Gatekeeper checks. It does not make the app notarized.

## App releases

This public repo also hosts MeroAlpha Agent downloads; app source stays private.
[Releases](https://github.com/wheregmis/meroalpha/releases/latest) are readable
without an account. Existing download buttons already use this destination.
Stable binaries are published here, beginning with [v0.3.1](https://github.com/wheregmis/meroalpha/releases/tag/v0.3.1).

| Asset | Purpose |
| --- | --- |
| `MeroAlpha-Agent-macos-arm64.zip` | macOS 14+ Apple silicon app, ad-hoc signed by default |
| `MeroAlpha-Agent-macos-arm64.zip.sha256` | SHA-256 download integrity |
| `appcast.xml` (optional) | Stable Sparkle metadata and Ed25519 archive authentication |

Without a signed appcast, a release is **manual download only**. The stable feed is
`https://github.com/wheregmis/meroalpha/releases/latest/download/appcast.xml`;
archive URLs inside it use immutable `vX.Y.Z` tags. No prerelease/Intel/Windows/Linux
channel is advertised. Public tags refer to website source, not private app source.
`release-contract.json`, `scripts/verify-release.mjs` and the standard-library XML/ZIP parser `scripts/release-metadata.py` match the agent repo;
contract changes require coordinated PRs.

The agent's local script builds/seals ad-hoc packages without Apple credentials.
It optionally authenticates update ZIPs using an existing Sparkle Ed25519 key.
Apple Developer ID and notarization are future optional improvements, not required
for downloads or archive authentication. Ad-hoc signing does not satisfy Gatekeeper:
macOS can block initial installation or an update. `install.sh` avoids that block by downloading
with `curl`, which Gatekeeper does not check; a browser download still needs Privacy & Security.
Enabled builds support authenticated native updates. The public ad-hoc 0.3.1 → 0.3.2 install/relaunch test passed after disposable acceptance; the owner completed initial installation. Builds without an enabled authenticated updater retain the public release-page fallback.

Maintainers validate local artifacts, create a draft, attach all allowed assets,
and publish as latest only after every upload succeeds. The cross-repository token
needs Contents: write on **this repository only**. Token/signing-key creation or
configuration needs separate owner approval. No secrets belong in this public
repo. The agent repo documents the local fallback for billing-blocked hosted CI.
The release scripts do not create credentials or change website deployment settings.

Published versions are immutable; fix packaging mistakes with a new version.
Inspect/retry failed drafts. Never mark an older release as latest, since that also
rolls back the feed. Serialize publishers. A manual-only release has no appcast,
so the native updater reports an unavailable feed and keeps the old app intact.

Local verification (Node 24+ and Python 3, no package dependencies):

```sh
node --test tests/release.test.mjs
# Manual-only release (checksum verification, authenticated: false):
node scripts/verify-release.mjs vX.Y.Z /path/to/assets
# Authenticated update (public key from an independently trusted source):
node scripts/verify-release.mjs vX.Y.Z /path/to/assets "$TRUSTED_UPDATE_PUBLIC_KEY"
```

Every ZIP is inspected without extraction: app identity, embedded version, minimum OS and arm64 executable must match the tag/contract. When an appcast exists, the verifier requires the trusted key and checks the actual parsed XML enclosure, exact
repository/tag URL, stable version, byte length and Ed25519 signature. Missing or
invalid authentication is never silently downgraded to manual-only. A checksum
beside a ZIP is not authenticity; do not get the key from that same download.
Research/account data is never included in a release or sent by update checks.

## Landing-page changelog

The What’s new section reads the latest three stable public releases from GitHub's unauthenticated releases API. Version/date links are validated against this repository; bodies render as bounded plain text, never HTML or remote images. No token, server or deployment secret is needed. API failure/rate limiting and disabled JavaScript retain a link to the full release history. Existing release notes are shown as-is; future agent releases supply useful changes from their reviewed prepared notes.

Run `node --test tests/changelog.test.mjs tests/release.test.mjs`. Serve locally with `python3 -m http.server -d public` for visual checks. Website deployment is separate from a code PR.
