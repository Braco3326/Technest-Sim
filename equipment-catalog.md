# Equipment Catalog — audio-sim (canonical v1, real gear)

> Human-readable mirror of `content/catalog.json`. **catalog.json is the source of truth** — if they ever disagree, fix the JSON first, then this file.
> Real brand/model names are internal reference data (personal learning tool). 3D assets use generic visual equivalents per CLAUDE.md.

**Priority key** — P1: required by a starter-level `requiredChain` · P2: present in a level for exploration/teaching, not in the minimal chain.

**Level tags** — `A1` Live · `B1` Radio · `C1` Duplex/N-1 · `D1` Post.

---

## Consoles

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `yamaha-ql1` | Yamaha QL1 | A1 | P1 | Compact digital FOH console, native Dante. The QL/CL series is the de-facto standard in small venues and schools. |
| `axia-iq` | Axia (Telos Alliance) iQ | B1, C1 | P1 | 8-fader AoIP broadcast console. **Chosen over Yamaha 01V96**: B1 teaches broadcast logic — the iQ has native GPIO tally, monitor-mute-on-open-mic and an N-1 bus; the 01V96 is a music console with none of that. |

## Microphones

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `shure-sm58` | Shure SM58 | A1 | P1 | THE live dynamic vocal mic. |
| `shure-sm57` | Shure SM57 | A1 | P1 | THE dynamic instrument mic (guitar amp in A1). |
| `ev-re20` | Electro-Voice RE20 | B1 | P1 | The historic radio broadcast dynamic. **Chosen over SM7B**, which trends podcast/music. |
| `ev-re50` | Electro-Voice RE50B | C1 | P1 | The standard omni dynamic reporter/ENG mic. |
| `neumann-u87-ai` | Neumann U 87 Ai | D1 | P1 | The studio large-diaphragm condenser; **requires +48 V** → drives rule R4. Chosen over AKG C414 as the more iconic VO/post mic. |

## Monitors / Speakers

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `qsc-k12-2` | QSC K12.2 | A1 | P1 | Ubiquitous 12" powered PA top. Active → line-level XLR in + IEC mains (no Speakon: that's for passive rigs; the connector stays in the type system for teaching). |
| `yamaha-dbr12` | Yamaha DBR12 | A1 | P1 | Common powered wedge. Judgment call: keeps the A1 Yamaha ecosystem coherent. |
| `genelec-8030c` | Genelec 8030C | B1, D1 | P1 | Ubiquitous active nearfield. Deliberately **reused** in both studio levels — one model, two rooms, like real life. |

## Stageboxes & I/O

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `yamaha-rio3224-d2` | Yamaha Rio3224-D2 | A1 | P1 | The standard Dante stagebox for QL/CL (etherCON primary). |
| `avid-hd-io` | Avid HD I/O 8x8x8 | D1 | P1 | Canonical Pro Tools HDX interface. **Chosen over UA Apollo x8**: DB25 analog, AES on DB25 and BNC wordclock are exactly the D1 lessons — and it has **no mic pres**, which is itself the lesson (see ISA One). |
| `avid-protools-hdx` | Avid Pro Tools \| HDX workstation | D1 | P1 | Industry-standard post DAW rig (workstation + HDX card, DigiLink to interface). Composite/role-based id — noted judgment call. |
| `focusrite-isa-one` | Focusrite ISA One | D1 | P1 | **Added beyond the prompt list**: the HD I/O has no preamps, so the U 87 needs one. Very common transformer pre; provides +48 V (R4). |
| `antelope-ocx-hd` | Antelope Audio OCX HD | D1 | P1 | **Added beyond the prompt list**: master word clock, so R8 has a real master/slave pair to teach with. |
| `playout-pc` | Generic playout workstation (RCS Zetta / WinMedia) | B1 | P1 | Commodity hardware — the software defines the role, hence the role-based id. Its consumer mini-jack out exists on purpose to teach R2 (−10 dBV vs +4 dBu). |

## Codecs

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `aeta-scoop5-s` | AETA Scoop5 S | C1 | P1 | Rack **studio** codec, French radio standard. **Correction to the prompt**: the "Scoopy+ S" is AETA's *portable*, not the studio unit — roles swapped to match reality. |
| `aeta-scoopy-plus-s` | AETA Scoopy+ S | C1 | P1 | The classic French **portable reporter** codec (Radio France kit). Kept AETA on both ends for one coherent ecosystem; Tieline Bridge-IT is the noted alternative brand. |

## Patchbays

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `switchcraft-studiopatch-9625` | Switchcraft StudioPatch 9625 | D1 | P2 (stub) → P1 (full D1) | 96-point TT/Bantam bay with DB25 rear. **Chosen over ADC / Mosses & Mitchell**: same job, more common today, and the DB25 rear pairs directly with the HD I/O. |

## Stands / Accessories

| Device id | Brand / Model | Level | Priority | Role & why this one |
|---|---|---|---|---|
| `km-210-9` | König & Meyer 210/9 | A1 | P2 | The classic boom mic stand. Prop only — no ports. |
| `yellowtec-mika` | Yellowtec m!ka arm | B1 | P2 | Standard on-air boom arm. Prop only. |
| `yellowtec-litt` | Yellowtec litt | B1 | P1 | Modular LED ON-AIR light, GPIO-driven (rules R5/R6). Same brand family as the m!ka. |

## Cables & Connectors

Cable *types* are implicit in v1 (a connection = a cable whose two ends must mate, rule R1). One cable is modeled as a device because it changes connector families:

| Device id | Brand / Model | Level | Priority | Role |
|---|---|---|---|---|
| `mogami-gold-db25-xlrm` | Mogami Gold DB25→8×XLR-M loom | D1 | P1 | How the DB25 world meets the XLR world in every studio (HD I/O outs → m905 ins). |

### Connector types (26) — `connectorTypes` in catalog.json

XLR3 M/F · XLR5 M/F (DMX) · 6.35 mm TRS & TS · 3.5 mm TRS · RCA · RJ45 · etherCON (mates RJ45) · Speakon NL4 · powerCON blue · powerCON TRUE1 · IEC C13/C14 · Schuko plug/socket · BNC 75 Ω · TT/Bantam · D-sub 25 · TOSLINK · USB-A/B/C · Avid DigiLink · GPIO terminal.

Mating is realistic: XLR M↔F, etherCON↔RJ45, IEC C13↔C14, Schuko plug↔socket, everything else mates its own kind. XLR5/DMX, Speakon, powerCON, TOSLINK, RCA, USB-A/B have **no device yet** — they're in the type system so R1 can teach "it doesn't fit" with wrong-cable distractors, and for P2 levels (passive PA, lighting).

### Signal types (16) — `signalTypes` in catalog.json

Analog: mic · pro line (+4 dBu) · consumer line (−10 dBV) · instrument Hi-Z · speaker · headphone.
Digital: AES3 · S/PDIF · MADI · AoIP (Dante/AES67/Livewire+/codec, simplified to one id) · word clock · computer-link (USB/TB/DigiLink, simplified to one id).
Control: GPIO/tally · DMX512. Power: phantom +48 V · mains 230 V.

---

## Rules ↔ levels map

| Rule | What it teaches | Module | Active in |
|---|---|---|---|
| R1 connector mate | wrong plug doesn't fit | engine | A1+ (always) |
| R2 signal mismatch | mic≠line, digital≠analog, pro≠consumer | engine | A1+ (always) |
| R3 direction | out→in only | engine | A1+ (always) |
| R4 phantom +48 V | condenser needs it, ribbon fears it | logic/phantom | D1 full (U 87 + ISA One) |
| R5 ON-AIR tally | open fader → red light | logic/gpio | B1 |
| R6 monitor mute | open mic mutes CR monitors | logic/gpio | B1 |
| R7 mix-minus N-1 | codec send = program − own return | logic/mixMinus | C1 |
| R8 word clock | one master, slaves lock, rates match | logic/clock | D1 |

## Assumptions (v1)

1. **Port sets are teaching-simplified** — e.g. 2 of the Rio's 32 mic-ins, one QL1 mix-out; enough for each level's chain, never every physical connector.
2. **Power ports exist but aren't required** in v1 chains (kept for a future "power up the rig" lesson).
3. **AoIP is one signal id** (`aoip`) covering Dante, AES67, Livewire+ and codec IP streams — protocol differences are beyond starter-level scope.
4. **DigiLink carries the `usb-audio` signal id** ("computer audio link") to keep the signal list at 16.
5. **Accessories (stands, arm) have empty port lists** — they're scene props supporting realism.
6. Consumer/pro level mismatch (playout PC mini-jack) is a **deliberate R2 trap**, not an error in the catalog.
