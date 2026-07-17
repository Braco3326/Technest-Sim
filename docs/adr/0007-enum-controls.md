# ADR-0007 — Enum device controls (R8 sample-rate), extension of ADR-0001

- **Status:** Accepted (run de durcissement, 2026-07-17) — exécution de docs/prompts/02
- **Beat servi:** 5 (la règle d'examen R8 : horloge & sample-rate)
- **Note de numérotation:** docs/prompts/02 proposait `0006-enum-controls.md`, mais 0006 est
  déjà pris par le coach IA → cet ADR est le **0007**.

## Contexte

ADR-0001 §Consequences prévoyait déjà des controls `enum` (sample rate) « même forme, pas de
nouvelle architecture ». logic/clock.ts ne couvrait que le SLAVE non-locké ; le mismatch de
fréquence d'échantillonnage (44,1 kHz d'un côté, 48 kHz de l'autre sur le même lien numérique
= clics) restait en P2 faute d'un control non-booléen.

## Décision

**1. Content — `Control` devient une union discriminée sur `type`** (tools/schemas.ts) :
- `toggle` : `default: boolean`, `enables?` (inchangé — gate un flag de port).
- `enum` : `options: string[]` (≥2) + `defaultOption: string`. Pas de `enables` (lu
  directement par logic/*, pas de gating de flag). Le validateur vérifie `defaultOption ∈ options`.

**2. Engine — la valeur d'un control devient `ControlValue = boolean | string`** (types.ts).
`ConnectionGraph.setControl(instanceId, controlId, value: ControlValue)` valide :
- control enum → `value` doit être une `options` déclarée, sinon `TypedError('INVALID_CONTROL_VALUE')`.
- control toggle → `value` doit être un booléen, sinon `INVALID_CONTROL_VALUE`.
`getControl` et `snapshot().instances[].controls` exposent `ControlValue`. Les defaults à la
construction : toggle → `default`, enum → `defaultOption`. `effectiveFlags` ne gate que les
toggles (les enums n'ont pas d'`enables`).

**3. Logic — logic/clock.ts, en PLUS du slave non-locké** : pour chaque connexion portant un
signal numérique (aes3/spdif/madi/aoip/usb-audio), si les deux instances déclarent un control
`sample-rate` avec des valeurs différentes → R8 (subjects = les deux ports). Les modules qui
lisent des booléens (gpio fader-*, mixMinus route-*) sont protégés par un `typeof === 'boolean'`.

**4. UI — ControlsPanel rend un `<select>` par control enum** (clavier-accessible), qui
dispatch `SET_CONTROL` avec l'option choisie. Toggles et matrice de routage inchangés.

**5. Content data** : `sample-rate` (44100/48000/96000, défaut 48000) ajouté aux 3 devices
numériques de D1 (avid-protools-hdx, avid-hd-io, antelope-ocx-hd). Défaut IDENTIQUE partout
→ D1 reste gagnable sans changement (le mismatch est un piège optionnel + testé unitairement).

## Rejeté
- **Double-master detection** : reste P2. Un `wordclock-in` (slave) ne prend qu'un câble, donc
  « deux masters vers un slave » est physiquement inexprimable sans un hub de distribution
  d'horloge (device multi-slave) — hors périmètre.
- **Forcer le réglage de sample-rate comme étape requise de D1** : changerait l'arc D1
  (phantom+clock) et son e2e ; laissé en piège avancé/sandbox. Option future.
- **Un type de valeur par control (générique number/string/bool)** : YAGNI ; toggle+enum
  couvrent tous les besoins R1–R8.

## Conséquences
- `INVALID_CONTROL_VALUE` ajouté à `ErrorCode`.
- Tests : clock (triggers 44,1 vs 48 · doesn't-trigger mêmes rates / lien absent / device sans
  control) + ConnectionGraph (default, option invalide, garde de type, snapshot).
- SavedRig.controls (shelf.ts) élargi à `ControlValue` — les rigs sandbox sérialisent les enums.
