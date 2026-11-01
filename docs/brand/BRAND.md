# NestFlow brand assets

## Primary and source masters

**Logo B is primary:** the standalone emblem remains recognizable at small sizes without shrinking a long wordmark. Logo A is the secondary horizontal lockup for wider placements.

| Master | Content | Dimensions | Original bytes |
|---|---|---|---:|
| [Logo A](nestflow-logo-a.png) | Emblem plus NestFlow wordmark | 2098 × 749 | 444868 |
| [Logo B](nestflow-logo-b.png) | Standalone emblem | 1254 × 1254 | 557733 |

Both are original transparent raster masters, copied byte-for-byte. The images have subtle pixel/color variation; this guide does not flatten, recolor, trace or redesign them. The original files remain in the research workspace and the matching generated-images originals remain untouched.

## Extracted color samples

Measured from the actual PNGs, not the generation prompt. Method: count exact RGB values among nearly opaque pixels (alpha >= 250), group by teal/gold/dark-ink ranges, then select the most frequent exact value in each group. These are representative observed samples, not proof of original vector color specifications. Exclude transparent pixels and edge artifacts.

| Suggested variable | Extracted hex | Source | Use |
|---|---|---|---|
| --brand-teal | #027F7B | Primary B emblem | Primary identity |
| --brand-gold | #EEB346 | Primary B seed | Accent |
| --brand-ink | #08282B | A wordmark | Dark identity text |
| --brand-a-teal | #02776F | A emblem | Reference only |
| --brand-a-gold | #E2AC4E | A seed | Reference only |

The two generated masters have different sampled teal/gold values. Preserve both originals; use B samples for new CSS identity variables, rather than silently recoloring either master. These samples are not an accessible UI color system by themselves: validate contrast for every future foreground/background pairing. No new background or semantic colors are specified by this extraction.

## Typography: observed direction, not an identified font

Only A contains lettering: a bold rounded/geometric sans-serif wordmark, with substantial strokes and softly rounded details. There is no font file or font metadata establishing a family. B contains no lettering.

Suggested pairing derived from those visible traits: rounded sans-serif semibold/bold for headings, with a regular weight from the same family for body text; use tabular numerals for balances if the selected family supports them. This is a style pairing, not a verified named font pairing. Exact font family and licensing are unresolved; do not invent a family attribution or recreate the wordmark as live text.

## Delivered derivatives and SVG limitation

- docs/brand/nestflow-logo-a.png and nestflow-logo-b.png: unchanged masters.
- src/assets/nestflow-logo.png: unchanged primary B, ready for later in-app use.
- public/logo-192.png and logo-512.png: primary B resized proportionally to 192x192 and 512x512, preserving RGBA transparency; no crop, recolor or redesign.
- public/favicon.png: 32x32 raster favicon derived from primary B, preserving RGBA transparency by the same method.
- **Genuine SVG masters are missing.** public/favicon.svg and src/assets/nestflow-logo.svg were intentionally not fabricated. No tracing, redraw, or misleading SVG wrapper around a PNG was produced. Supply an original SVG to fill those paths; use the provided PNG fallbacks meanwhile.

No application code, styling, dependency installation, or app integration was performed.
