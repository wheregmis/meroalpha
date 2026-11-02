# MeroAlpha

The landing page for [MeroAlpha](https://github.com/wheregmis/meroalpha), a macOS app where an AI agent researches the Nepal stock market (NEPSE) in a browser you can watch and runs a paper account in virtual NPR. No real money moves.

Plain HTML and CSS, no build step. Preview it with:

```sh
python3 -m http.server 4173
```

Screenshots come from the app's synthetic tour fixture.

## App releases

This public repo also hosts MeroAlpha Agent downloads; app source stays private.
[Releases](https://github.com/wheregmis/meroalpha/releases/latest) are readable
without an account. Existing download buttons already use this destination.
A production binary becomes available when a maintainer publishes the first release.

| Asset | Purpose |
| --- | --- |
| `MeroAlpha-Agent-macos-arm64.zip` | macOS 14+ Apple silicon app, ad-hoc signed by default |
| `MeroAlpha-Agent-macos-arm64.zip.sha256` | SHA-256 download integrity |
| `appcast.xml` (optional) | Stable Sparkle metadata and Ed25519 archive authentication |

Without a signed appcast, a release is **manual download only**. The stable feed is
`https://github.com/wheregmis/meroalpha/releases/latest/download/appcast.xml`;
archive URLs inside it use immutable `vX.Y.Z` tags. No prerelease/Intel/Windows/Linux
channel is advertised. Public tags refer to website source, not private app source.
`release-contract.json` and `scripts/verify-release.mjs` match the agent repo;
contract changes require coordinated PRs.

The agent's local script builds/seals ad-hoc packages without Apple credentials.
It optionally authenticates update ZIPs using an existing Sparkle Ed25519 key.
Apple Developer ID and notarization are future optional improvements, not required
for downloads or archive authentication. Ad-hoc signing does not satisfy Gatekeeper:
macOS can block initial installation or an update. No security check is bypassed.
In-app installation remains disabled until a disposable two-version test succeeds
under normal macOS security settings; otherwise the app opens the release page.

Maintainers validate local artifacts, create a draft, attach all allowed assets,
and publish as latest only after every upload succeeds. The cross-repository token
needs Contents: write on **this repository only**. Token/signing-key creation or
configuration needs separate owner approval. No secrets belong in this public
repo. The agent repo documents the local fallback for billing-blocked hosted CI.
This PR creates neither credentials, production releases, nor deployments.

Published versions are immutable; fix packaging mistakes with a new version.
Inspect/retry failed drafts. Never mark an older release as latest, since that also
rolls back the feed. Serialize publishers. A manual-only release has no appcast,
so the native updater reports an unavailable feed and keeps the old app intact.

Local verification (Node 24+, no dependencies):

```sh
node --test tests/release.test.mjs
# Manual-only release (checksum verification, authenticated: false):
node scripts/verify-release.mjs vX.Y.Z /path/to/assets
# Authenticated update (public key from an independently trusted source):
node scripts/verify-release.mjs vX.Y.Z /path/to/assets "$TRUSTED_UPDATE_PUBLIC_KEY"
```

When an appcast exists, the verifier requires the trusted key and checks exact
repository/tag URL, stable version, byte length and Ed25519 signature. Missing or
invalid authentication is never silently downgraded to manual-only. A checksum
beside a ZIP is not authenticity; do not get the key from that same download.
Research/account data is never included in a release or sent by update checks.
