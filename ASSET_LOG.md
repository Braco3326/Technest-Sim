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
