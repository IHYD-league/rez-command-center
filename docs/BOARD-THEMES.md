# Daily Adventure Board — Themes & Assets

> Spec for the theming layer on `src/BoardGame.jsx`. Owner: this repo.
> Themes are additive — adding one never breaks the others.

## Status

| Theme | ID | Status | Notes |
|---|---|---|---|
| Space Quest | `space_quest` | ✅ Shipped (default) | Emoji-only; no asset deps. Procedural snake path. |
| Volcano Peaks | `volcano_peaks` | ✅ v3 | Refreshed bg.png (new artwork w/ jack-o-lantern volcano + stone pedestals). `treasureAnchor` pinned to the painted volcano face; `pathWaypoints` follow the central lava river. Dragon token rest/fly animation live. `space-tile.png` still pending. |
| Enchanted Forest | `enchanted_forest` | ✅ v3 | bg + start + treasure-locked + treasure-open present. Tokens not provided yet → emoji 🦋 fallback. Path waypoints zig through the clearing. |
| Water World | `water_world` | ⏳ Planned | Folder exists in `graphics/board-game/water-world/`; awaiting assets. |

## Per-family, not per-profile

The board is a **shared family canvas** — when Reznor's at the table doing math, anyone in the family can glance at his board. One theme per family keeps the visual experience coherent. Stored at:

```
family_settings.boardTheme  ("space_quest" | "volcano_peaks" | ...)
```

Set by a parent via **More → Board Theme** in the parent settings area (`BoardThemePicker` in `src/App.jsx`). Takes effect on the next render of the Board tab — no reload, no migration.

**Per-profile theming** is intentionally NOT implemented in v1. If we add it later, that overrides this family setting on a per-render basis. Storage would move to `user_prefs.prefs.boardTheme`, with the `family_settings` value remaining as the family default.

## Theme contract

Every theme object in the `BOARD_THEMES` registry has these fields:

```js
{
  id:                "<snake_case_id>",
  name:              "Human Friendly Name",
  background:        "<CSS background>",      // always required (fallback)
  bgImg:             "/board/themes/<id>/bg.png" | null,
  pathStroke:        "rgba(...)",
  pathGlow:          "rgba(...)",
  tokenEmoji:        "🚀",                    // always required (fallback)
  tokenRestImg:      "/board/themes/<id>/token.png" | null,
  tokenFlyImg:       "/board/themes/<id>/token-flying.png" | null,
  treasureEmoji:     "🏆",                    // always required (fallback)
  treasureLockedImg: "/board/themes/<id>/treasure-locked.png" | null,
  treasureOpenImg:   "/board/themes/<id>/treasure-open.png" | null,
  treasureLabel:     "<theme-flavored label>",
  startEmoji:        "🛸",                    // always required (fallback)
  startImg:          "/board/themes/<id>/start.png" | null,
  startLabel:        "Start",
  spaceTileImg:      "/board/themes/<id>/space-tile.png" | null,
  fallbackColor:     "#hex",                  // activity tile color when activity has none

  // v3 — art-anchored layout
  treasureAnchor:    { x: 50, y: 16 } | null, // pinned treasure position (0-100 % into viewBox)
  startAnchor:       { x: 50, y: 92 } | null, // pinned start position
  pathWaypoints:     [{x,y}, ...]   | null,   // path snakes through these, bottom-up; spaces
                                              // distribute evenly along the polyline arc length.
                                              // Treasure + start anchors override the first/last.
}
```

### Path-fits-art rendering (v3)

When a theme provides `pathWaypoints` (≥ 2 points), `calcPositions()` in `src/BoardGame.jsx` switches from the procedural 3-column snake to an **arc-length distribution** along the polyline. Density matches the path's actual length, so spaces stay evenly spaced even when bends bunch waypoints close together.

- Waypoint coords are **percentages (0-100)** of the board's viewBox.
- A themed board uses a **fixed viewBox height** (180 units) regardless of space count — keeps the painted geography proportional. Procedural boards (Space Quest) still scale viewBoxH with space count.
- `treasureAnchor` + `startAnchor` are applied **after** the polyline interpolation as hard overrides — ensures treasure stays exactly on its painted pedestal even at edge counts.

### Parent control: Daily Quest Cap (v3)

`family_settings.boardDailyCap` (jsonb key, integer 3-14, default 9). When set, BoardGame slices `todaysTasks` to the first N (required tasks first, then extras). Treasure unlocks at full clear of the capped list. Parent dials via **More → Adventure Board → Today's Quest Cap (− / +)**. Same setting controls the board for the whole family.

### Image / emoji fallback rules

- `bgImg` is **layered over** `background` (gradient stays as the floor).
- `tokenRestImg` → if null, `tokenEmoji` renders alone. If set, both `tokenRestImg` + `tokenFlyImg` render and crossfade by opacity (`flying` state in BoardGame).
- `treasureLockedImg` / `treasureOpenImg` → state-swapped per `space.state === "treasure-open"`. When art is present, the circular chip background is suppressed so the painted art reads clean.
- `startImg` → straight swap of emoji ↔ image.
- `spaceTileImg` → not used in v1 rendering. Reserved for when per-space painted tiles ship. Currently each task space uses the activity's color + emoji regardless of theme.

## Asset spec

| File | Size | Type | Notes |
|---|---|---|---|
| `bg.png` | 1260 × 2400 | Opaque PNG | Top + bottom 200 px should tile-safe in a similar tone so vertical scroll doesn't show a hard edge. |
| `start.png` | 256 × 256 | Transparent PNG | Pedestal/marker, centered. |
| `token.png` | 256 × 256 | Transparent PNG | Resting state, facing up, ≤ 70% of canvas. |
| `token-flying.png` | 256 × 256 | Transparent PNG | Flying state. Same character, wings out/etc. |
| `treasure-locked.png` | 384 × 384 | Transparent PNG | Closed chest, dim. |
| `treasure-open.png` | 384 × 384 | Transparent PNG | Open chest with glow baked in. |
| `space-tile.png` | 192 × 192 | Transparent PNG | (Not yet wired) Per-task icon background. |

## Adding a new theme

1. Pick a `snake_case_id`.
2. Drop the PNG asset set into `public/board/themes/<id>/`.
3. Add a new const in `src/BoardGame.jsx` matching the theme contract.
4. Add it to the `BOARD_THEMES` registry.
5. Update the status table at the top of this doc.
6. No DB migration, no transform.js change. Parent flips to it in the Board Theme picker.

If an asset isn't ready yet, leave its field `null` — the emoji fallback fills the gap until you drop the PNG in.

## Future / not in v1

- **Per-profile theme override.** Storage: `user_prefs.prefs.boardTheme`. Logic: if set, use it; else fall back to `family_settings.boardTheme`.
- **Per-space painted tiles (`spaceTileImg`).** Will require a small change in `SpaceMarker` to render the image under/instead of the activity color circle.
- **Animated treasure ember sparkles** baked as a CSS layer over `treasure-open.png`.
- **Audio per theme** — e.g., Volcano Peaks might have a low rumble cue on rocket launch where Space Quest has the synth swipe.
- **Dragon-fly animation refinements** — currently a 200ms opacity crossfade between `token.png` and `token-flying.png`. Could swap to a frame sequence if a multi-frame asset arrives.
- **Water World theme** — pending full asset set. Suggested character: friendly fish or surfacing whale. Color palette: deep teals + sandy gold treasure.
