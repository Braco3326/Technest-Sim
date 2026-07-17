# PROMPT — R8 complet : sample-rate mismatch via controls "enum" (extension ADR-0001)

Colle ce prompt tel quel dans une session Claude Code ouverte dans D:\teknest\tekpractice.

---

Respecte CLAUDE.md. Lis d'abord : docs/adr/0001-device-state.md (§Consequences,
l'extension enum y est déjà planifiée), src/logic/clock.ts (le scope v1 et le
TODO), tools/schemas.ts (Control), src/engine/ConnectionGraph.ts (setControl),
src/ui/controlsPanel.ts, tests/logic/clock.test.ts.

ATTENTION CONTRAINTE : ConnectionGraph.setControl prend un boolean. Étendre à
string = extension d'interface engine → ADR OBLIGATOIRE (docs/adr/0006-enum-controls.md) :
- Control zod gagne type:'enum' + options:[string] + defaultOption:string
  (le champ default reste boolean pour les toggles — deux formes discriminées).
- setControl(instanceId, controlId, value: boolean | string) ; TypedError
  'INVALID_CONTROL_VALUE' si la valeur n'est pas dans options. Snapshot expose
  controls: Record<string, boolean | string>.
- Vérifie l'impact sur logic/* existants (gpio lit des booleans : garde des
  type guards) et sur ControlsPanel (rend un <select> pour les enums).

CONTENU (data uniquement) : ajoute "sample-rate" (options 44100/48000/96000,
défaut 48000) aux devices numériques D1 : avid-hd-io, avid-protools-hdx,
antelope-ocx-hd. Le validateur vérifie options non vides + defaultOption ∈ options.

LOGIC : logic/clock.ts — en PLUS du slave non-locké : pour chaque connexion
au signal numérique (aes3/spdif/madi/aoip/usb-audio), si les deux instances ont
un control sample-rate et des valeurs différentes → violation R8 (subjects =
les deux ports). Tests : triggers (44.1 vs 48 sur le DigiLink) + doesn't-trigger
(mêmes rates ; devices sans control ignorés).

GATES : validate:catalog vert · vitest vert · playwright vert · build passe.
Commits atomiques + push. Les textes pédagogiques restent dans catalog.json (R8.teach déjà bon).
