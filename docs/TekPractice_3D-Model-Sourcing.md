# TekPractice — 3D Model Sourcing Strategy (download / AI-gen / model)
_How to get the gear models fast and legally, instead of sculpting all 24 from scratch. Research-backed, July 2026._

## The core truth
- **Downloading saves the sculpting, not the integration.** Every model — downloaded, AI-generated, or hand-made — still needs: convert → `.glb`, add `port_<portId>` empties at the real I/O positions (matching `catalog.json`), match real dimensions, single PBR material, optimize (Draco + KTX2). That "rigging" pass is mandatory regardless of source. Net win is still large (~70% of the effort).
- **Two separate legal layers** (do not confuse them):
  1. **Copyright of the file** → the model's license.
  2. **Trademark / trade dress of the real product** → NOT granted by the file's license.

## The license guide (copyright layer)
| License | Free? | Commercial? | Attribution? | Verdict |
|---|---|---|---|---|
| **CC0 / Public Domain** | yes | yes | no | **Best** — use & ship freely |
| **CC-BY** | yes | yes | **yes (credit required)** | Good — usable, must log credit |
| **CC-BY-SA** | yes | yes | yes + share-alike | Caution (share-alike can infect) |
| **CC-BY-NC / editorial / personal-only** | yes | **no** | — | **Do NOT ship** (personal test only) |
| **GrabCAD** | yes | **no redistribution** | — | **Reference only, never ship** |
| Paid / royalty-free (TurboSquid…) | no | yes | per-license | Only if bought; check terms |

## The trademark layer (applies to ALL sources)
A correctly-licensed *file* of branded gear still depicts a trademark. **Now (personal/learning): fine. Commercial launch: genericize** (remove logos/text, slightly alter trade dress) or get clearance. The shipped `.glb` are *our* recreations, generic-marked for the commercial track. (This is your already-accepted "trademark for later" flag.)

## Sources
**Ready-made models:**
- **Poly Pizza** (poly.pizza) — CC0, low-poly, no login. Great for generic speakers/mics/stands.
- **Sketchfab** (tag `audio-equipment`) — huge; filter **Downloadable + License = CC0/CC-BY**. Many exact-brand models; check each.
- **awesome-cc0** (github.com/madjin/awesome-cc0) — curated CC0 list.
- **Thingiverse / Printables** — CC-licensed STLs of real gear; convert STL → glb.
- **GrabCAD** — exact manufacturer CAD; **reference only, never ship.**

**AI image-to-3D (from your product photos):**
- **Tripo AI** — fastest (~10s), clean meshes, free tier, GLB.
- **Meshy** — versatile, ~20–30s, GLB/FBX/OBJ/STL, free tier.
- **Rodin (Hyper3D)** — best topology/UVs; free to generate / pay to download.
- **Luma AI** — NeRF capture from photos/video, photoreal (~$1/scene).
→ You own the generation (no third-party file license); feeds from the `assets-source/**/photos/` we're gathering. Trademark on likeness still applies.

## Recommended: TIERED HYBRID (per device, in order)
1. **CC0 download** if a good match exists → fastest, cleanest legally.
2. **CC-BY download** if only that → use it, log the credit.
3. **AI-generate from the product photo** if no good download → fast, owned, matches the real unit.
4. **Hand-model from photos/CAD** only for hero pieces or gaps.
Then EVERY asset goes through the same rig pass.

## The integration ("rig") pass — mandatory for every model
1. Convert to `.glb`.
2. Reorient + scale to real dimensions (`assets-source/**/notes.md`), origin at functional point.
3. Add `port_<portId>` empties at true I/O positions, names EXACTLY matching the device ports in `catalog.json`.
4. Single PBR material; strip logos/brand text for the commercial track (keep a branded variant internally if wanted).
5. Optimize: gltf-transform Draco + KTX2; tri budgets (connectors 300–800, devices 800–4000).
6. Drop into `public/assets/<device-id>.glb` — replaces placeholder, no engine change.

## License logging (non-negotiable)
Extend `ASSET_MANIFEST.json` per asset: `{ id, source (download-cc0 | download-ccby | ai-tripo | modeled), sourceUrl, author, license, attributionText, trademark: generic | branded-internal }`. Keep `assets-source/CREDITS.md` for CC-BY attributions. Raw downloads stay in the **gitignored** `assets-source/`; only processed `.glb` ship.

## Do-NOT list
- Never ship GrabCAD or CC-BY-NC / personal/editorial models.
- Never ship raw branded downloads commercially without genericizing/clearance.
- Never add a model without its `port_*` empties matching the catalog (it won't work in Focus & Patch).

## Decisions for Oscar
1. **License floor:** CC0-only (safest, fewer matches) **vs** CC0 + CC-BY-with-attribution (recommended now — more coverage, just log credits).
2. **Use AI image-to-3D?** (recommended yes — fast, owned, uses your photos.)

## Next (on approval)
A **sourcing-agent prompt**: per catalog device, search the chosen sources for a correctly-licensed match, record URL + license into a candidates manifest, download into the gitignored `assets-source/<cat>/<id>/candidates/`, and queue the rig pass. AI-gen candidates generated from the gathered photos in parallel. You review candidates, pick the best per device, then a Blender/gltf-transform pass rigs + optimizes them into `public/assets/`.
