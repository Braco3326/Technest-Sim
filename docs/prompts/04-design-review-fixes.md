# PROMPT — Pass design post-relecture d'Oscar (agent designer)

À lancer APRÈS qu'Oscar a relu la DA (docs/design-system.md §"À relire") et
tranché : accent (bleu #2E5FE6 vs vert studio), intensité des ombres, cartels de ports.

Colle ce prompt dans une session Claude Code (D:\teknest\tekpractice), idéalement
via l'agent designer (.claude/agents/designer.md).

---

Respecte CLAUDE.md et docs/design-system.md (tokens = seule source visuelle,
src/design/tokens.ts). Décisions d'Oscar : [REMPLIR ICI : accent ? ombres ? cartels ?]

Backlog design de la nuit, par priorité :
1. Cartels de ports denses (D1) : n'afficher les port-labels qu'au survol/drag
   (Interaction expose déjà le port sous le pointeur via portUnderPointer —
   ajoute un événement hover → DeviceSpawner montre/cache les label planes).
2. Position du spawn sandbox : la grille démarre à x=-3 et peut passer sous le
   panneau étagères — décale l'origine de spawn vers (0, 0, -1.2) et centre.
3. Micro-motion pédagogique (design-system §Principes 4) : pulse discret du
   port candidat pendant le drag (scale 1→1.08, 240ms ease) ; flash doux du
   cartel du device à la connexion réussie. Tokens motion UNIQUEMENT.
4. Vignettes des étagères : padding/fond uniformes (les PNG EEVEE ont des
   cadrages hétérogènes) — recadrage CSS object-fit + fond --tk-bg suffisent.
5. Vérifie CHAQUE changement par screenshot Playwright (pattern :
   tools/sandbox-shot.ts, tools/dash-shot.ts) et itère. WCAG AA maintenu
   (contrastes dans docs/design-system.md).

GATES : vitest + playwright verts, build passe, screenshots avant/après dans
test-results/. Commits atomiques ("design: ...") + push. Documente les choix
dans docs/design-system.md.
