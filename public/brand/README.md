# TikTym logos

Drawn by `npm run brand:kit` (scripts/brand-kit.mjs). Don't edit these files by hand; change the script and redraw.
Also online at app.tiktym.com/brand/svg/… and app.tiktym.com/brand/png/… once the app is deployed.

## Lockups

| File name | What it is | Use it for |
|---|---|---|
| `tiktym-mark-…` | The bead ring alone | Small spaces, favicons, watermarks, stickers |
| `tiktym-wordmark-…` | "TikTym" alone | Where the ring is already shown nearby |
| `tiktym-horizontal-…` | Ring, then the name | Website headers, email signatures, slides; the default |
| `tiktym-stacked-…` | Ring above the name | Square spaces: posters, social posts, merchandise |
| `tiktym-tagline-horizontal-…` | Ring, name and brand line beside it | Banners, LinkedIn cover, presentations |
| `tiktym-tagline-stacked-…` | Ring, name and brand line, one under the other | Posters, flyers, the end card of a video |
| `tiktym-app-icon` | The ring on its dark green tile | Profile pictures (LinkedIn, WhatsApp, YouTube), store listings |

## Motion logo

The ring fills bead by bead, the gold bead pulses, then the name and brand line come in, ending on the static logo.

| File name | What it is | Use it for |
|---|---|---|
| `…-animated.svg` | The ring, ring + name, and both brand-line lockups, in `-color`, `-color-on-dark` and `-white`; plays once (2.4 s, the ring alone 1.9 s) and stays on the logo | Websites, the app, slides that play SVG. People with reduced motion turned on see the static logo |

## Colours

| Ending | For |
|---|---|
| `-color` | Light backgrounds (the default) |
| `-color-on-dark` | Dark backgrounds |
| `-black` | One-colour printing on light paper |
| `-white` | One colour on photos or dark backgrounds |

The PNGs have transparent backgrounds, so the `-white` and `-color-on-dark` ones look empty in a white preview.

## Formats

- **SVG**: sharp at any size. The text is turned into shapes, so no font is needed. Use it in Figma, Canva, Illustrator and websites.
- **PNG**: 2400 pixels on the long side (the ring and app icon are 1024 square). Use it in Word, PowerPoint, WhatsApp and anywhere SVG isn't accepted.

## Brand

- Colours: ink green `#16302E`, light background `#EDF0EA`, gold `#C98E0E` (`#E6B23C` on dark), dark background `#0F1B19`.
- Fonts: Bricolage Grotesque ExtraBold for the name, Figtree for text (both free on Google Fonts).
- Brand line: "100 minutes a day for your productive life".
- Keep space around the logo at least as wide as the gold bead's ring gap; don't stretch, recolour or add effects.
