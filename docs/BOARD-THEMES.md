# Daily Adventure Board — Themes & Assets

> Spec for the theming layer on `src/BoardGame.jsx`. Owner: this repo.
> Themes are additive — adding one never breaks the others.

## Status

| Theme | ID | Status | Notes |
|---|---|---|---|
| Space Quest | `space_quest` | ✅ Shipped (default) | Emoji-only; no asset deps. Procedural snake path. |
| Volcano Peaks | `volcano_peaks` | ✅ v3 | Refreshed bg.png (new artwork w/ jack-o-lantern volcano + stone pedestals). `treasureAnchor` pinned to the painted volcano face; `pathWaypoints` follow the central lava river. Dragon token rest/fly animation live. `space-tile.png` still pending. |
| Enchanted Forest | `enchanted_forest` | ✅ v3 complete | Full asset set: bg + start + treasure-locked + treasure-open + token + token-wink + space-tile. The "fly" alt slot is `token-wink.png` (animation-state semantic is "alt during motion" — works for fly, wink, cheer). Path waypoints zig through the fairy clearing. |
| Candy Concert | `candy_concert` | ✅ v3 | Full asset set: bg + start + treasure-locked + treasure-open + token + token-cheer + space-tile. Castle treasure at top; cookie path winds through cupcake / peppermint / cake pedestals. Token alt is `token-cheer.png`. |
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

### Path-fits-art rendering (v3 / v4)

When a theme provides `pathWaypoints` (≥ 2 points), `calcPositions()` in `src/BoardGame.jsx` switches from the procedural 3-column snake to one of two modes:

**Snap mode (v4)** — when `pathWaypoints.length === count` (space count = waypoint count exactly), each space lands at its waypoint position 1:1. This is how a theme bakes task positions into the artwork: paint N pedestals into bg.png, list N coords in `pathWaypoints`, set `boardDailyCap` to (N − 2). Volcano Peaks does this with 11 painted fire-circle pedestals matching START + 9 tasks + TREASURE at the default daily cap of 9.

**Interpolate mode (v3)** — when counts differ (e.g., parent dials the daily cap from 9 to 5), distributes spaces along the waypoint polyline using arc-length math. Density matches the path's actual length, so spaces stay evenly spaced even when bends bunch waypoints close together. Spaces still trace the painted geography — they just won't land on the exact painted pedestals.

Both modes:
- Use percentages (0-100) of the board's viewBox for waypoint coords.
- Use a **fixed viewBox height** (180 units) for themed boards — keeps the painted geography proportional regardless of space count. Procedural boards (Space Quest) still scale viewBoxH with space count.
- Apply `treasureAnchor` + `startAnchor` as **hard overrides** after positioning — ensures treasure stays exactly on its painted pedestal at every count.

**To bake painted positions into a new theme:**

1. Design the bg.png with N visible pedestals/markers for spaces.
2. Measure each pedestal's center as `{x%, y%}` of the image dimensions.
3. List the N coordinates in `pathWaypoints` in the order the player should visit them (typically a snake from bottom-up).
4. Set `treasureAnchor` + `startAnchor` to match the painted START + TREASURE positions exactly.
5. Document the "intended daily cap" for this theme in the status table.

### Parent control: Daily Quest Cap (v3)

`family_settings.boardDailyCap` (jsonb key, integer 3-14, default 9). When set, BoardGame slices `todaysTasks` to the first N (required tasks first, then extras). Treasure unlocks at full clear of the capped list. Parent dials via **More → Adventure Board → Today's Quest Cap (− / +)**. Same setting controls the board for the whole family.

### Image / emoji fallback rules

- `bgImg` is **layered over** `background` (gradient stays as the floor).
- `tokenRestImg` → if null, `tokenEmoji` renders alone. If set, both `tokenRestImg` + `tokenFlyImg` render and crossfade by opacity (`flying` state in BoardGame). The "fly" slot is semantically **"alt state during motion"** — works for fly (dragon), wink (fairy), cheer (candy character), or whatever motion the theme calls for.
- `treasureLockedImg` / `treasureOpenImg` → state-swapped per `space.state === "treasure-open"`. When art is present, the circular chip background is suppressed so the painted art reads clean.
- `startImg` → straight swap of emoji ↔ image.
- `spaceTileImg` → v3: now rendered. When set, the painted tile is layered over the activity-color circle as the chip background. The activity emoji + completion badge still render on top. Completed tasks dim the emoji + apply grayscale so the "done" state still reads.

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
