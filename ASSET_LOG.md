# ASSET_LOG — track assets 3D

## 2026-07-15 — Run 1 : arrêt propre (Blender MCP injoignable)

**Consigne :** générer le connector kit + devices via le Blender MCP, run autonome,
skip-on-error, arrêt propre si MCP injoignable 3× de suite.

**Résultat : ARRÊT PROPRE avant le premier asset.**

| Tentative | Vérification | Résultat |
|---|---|---|
| 1 | ToolSearch `+blender` | aucun outil |
| 2 | ToolSearch `3d model mesh scene export glb` | aucun outil Blender (résultats Figma/Canva non pertinents) |
| 3 | ToolSearch `+mcp blender cube primitive modeling` | aucun outil |

**Cause :** le serveur Blender MCP était configuré sur le Mac Studio (cf.
Claude-Code-Prompt-Pack.md). Cette session tourne sur le PC Windows — aucun
serveur MCP Blender n'y est enregistré dans Claude Code.

**Constat matériel :** Blender **5.1** est installé localement
(`C:\Program Files\Blender Foundation\Blender 5.1`), mais pas sur le PATH.

**Options pour relancer le track :**
1. **Fallback CLI headless (recommandé, dispo immédiatement)** — scripts Python
   `bpy` exécutés via `blender --background --python <script>` : mêmes
   conventions (mètres 1:1, origine fonctionnelle, −Y mating, empties
   `port_<portId>`, single PBR, export .glb), même pipeline
   (export → gltf-transform → vignette → commit par asset → manifest).
   Nécessite : `npm i -D @gltf-transform/cli` pour l'optimisation Draco/KTX2.
2. Installer/configurer un serveur Blender MCP sur ce PC (`claude mcp add`),
   puis relancer la consigne d'origine telle quelle.

**Aucun asset généré, aucun fichier modifié dans public/assets/.**

## 2026-07-15 18:31 - Run 2 : batch CLI headless (Blender 5.1)

- 50/50 assets generes (voir public/assets/ASSET_MANIFEST.json)
- Echecs: aucun
- Pipeline: blender --background + gen_asset.py -> gltf-transform draco -> vignette -> commit/push par asset

## 2026-07-16 - Run 3 : incremental via Blender MCP live (connecte, port 9876)

Decisions loggees (consigne : incremental, pas de no-op) :
- Les 50 glb du Run 2 sont conformes (ids, empties port_*, budgets, Draco) -> PAS de regeneration aveugle.
- Delta reellement genere : les 5 MICROS, jusqu'ici geometriquement identiques, differencies via le MCP live :
  sm57 (grille plate) 400 tris - sm58 (boule) 744 - re20 (gros corps beige + anneaux) 868 - re50 (boule mousse ENG) 468 - u87 (corps nickel + panier) 636.
  Chacun : export selection-only -> gltf-transform draco -> vignette EEVEE fond clair -> verif vision -> commit "asset: <id>" -> push.
- NOUVEAU : DeviceSpawner charge public/assets/<id>.glb par-dessus les placeholders (couche scene, engine intact, non bloquant).
  Verifie : 4 niveaux, 0 warning de chargement (local) - box masquee, marqueurs/labels conserves.
- Integrite round-trip : les 45 autres glb importes dans Blender live (Draco decode OK 45/45) et re-rendus en vignettes EEVEE couleur.
  Piege corrige : clip_start camera 0.1m par defaut coupait entierement les connecteurs de 2-3 cm -> clip 1mm.
- Pieges d'export MCP corriges : l'exporteur glTF embarquait le Cube de la scene utilisateur (use_active_scene=True + use_selection=True obligatoires)
  et les orphelins des runs rates suffixaient les noms d'objets (.001) -> purge + verif name_ok par asset.
- Scene utilisateur Blender intacte (Camera/Cube/Light).

Skips (loggés, pas des echecs) :
- 45 glb non regeneres (deja conformes, aucune evolution de recette).
- Kit connecteurs : pas consomme par le runtime v1 (les extremites de cable sont des tubes ; visuels de connecteurs = P2 CableRenderer).
- Budget "appareils 800-4000 tris" traite comme un PLAFOND (les micros simples restent sous 800 sans perte de lisibilite).

Restant :
- Verif prod : attendre que la file de builds Vercel serve le dernier commit (hash bundle).
- P2 : recettes v2 pour consoles/speakers (details), visuels de connecteurs sur les cables, orientation fine des glb par device.
