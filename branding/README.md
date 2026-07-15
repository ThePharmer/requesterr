# Requesterr branding overlay

This directory plus `scripts/rebrand.mjs` rebrands the upstream seerr source
tree to **Requesterr** at build time. The upstream files tracked in git stay
byte-identical to `upstream/develop`, so merging upstream releases stays
conflict-free — the rebrand is re-applied on every Docker build (both the
`build` stage and the final stage, since the final stage copies `public/`
from the raw build context).

## What it changes

- Default `applicationTitle` and email `senderName` settings
- PWA manifest name/short_name (`public/site.webmanifest`)
- The "Seerr" brand name in every i18n locale file (word-boundary match;
  the name is not translated, so this is safe in all languages)
- API spec title (`seerr-api.yml`)
- Public email logo URL → `https://requesterr.net/logo_full.svg`
- Overlays everything in `branding/public/` onto `public/`: logos, favicons
  (incl. .ico), PWA icons (regular + maskable), apple-touch icon, webpush
  badge, os_icon.svg (login page), and all 26 apple-splash screens

- The English `defaultMessage` strings compiled from the TSX sources (react-intl
  falls back to these when a translation is missing or empty)

Run manually with `pnpm rebrand` (mutates the working tree — restore with
`git checkout -- src seerr-api.yml server public`).

The script fails the build if any expected pattern is missing or any
user-facing "Seerr" string survives the sweep, so upstream drift cannot ship
a partially branded image silently.

**Local dev (`compose.yaml` + `Dockerfile.local`) is NOT branded**: the bind
mount shadows `/app` with the host checkout. If you need branding in dev, run
`pnpm rebrand` on the host and restore afterwards.

## Deliberately left alone

- Plex/Jellyfin user-agent strings (`X-Plex-Product: Seerr` etc.) — changing
  them re-registers the app as a new device with the media server
- Config paths, package name, logger labels, and other internals
- About-page support links (docs/GitHub/Discord) — it is still seerr under
  the hood and those are the real upstream resources

## Runtime settings to pair with this

- Settings → General → Application Title: set to `Requesterr` on existing
  instances (the patched default only applies to fresh installs)
- The email logo resolves via `requesterr.net`, which serves the branded
  `logo_full.svg` from this overlay

## The mark & regenerating assets

The mark is the gold "r in a play button" (concept P5 from the yellow
round). All assets in `branding/public/` are generated from the geometry in
`generate-assets.mjs` — edit the mark there and re-run
`node branding/generate-assets.mjs` (needs repo deps installed for sharp) to
rebuild the full set. Wordmarks render "requesterr" as an SVG `<text>`
element with a system font stack; swap in drawn letterforms later if wanted.
`public/os_logo_filled.png` still carries seerr branding but is unreferenced
in code and excluded from the Docker image via .dockerignore.
