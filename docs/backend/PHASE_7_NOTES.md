# Phase 7 — Maps without UI change

## End-of-phase report

### Files added
- `src/lib/manzil/maps-geo.ts` — geo CRUD, embed URL helper, pin payload builder

### Files modified
- `src/routes/map-view.tsx` — Punjab iframe src uses Maps Embed API when `VITE_GOOGLE_MAPS_API_KEY` set (same layout)

### SQL to run
`properties.lat/lng`, `society_details.lat/lng/geojson`

### Env vars
- `VITE_GOOGLE_MAPS_API_KEY` (browser-restricted)

### Manual verify
1. Without key → existing Google maps embed query URL
2. With key → Embed v1 search URL
3. `updatePropertyGeo` / `fetchPropertiesWithGeo` / `buildMapPins` for future Layer-1

### Needs UI decision
- MarkerClusterer, Directions, Places, Street View, pin overlay on map-view — skipped (would change layout)

### Rollback
Unset Maps key; stop writing lat/lng.
