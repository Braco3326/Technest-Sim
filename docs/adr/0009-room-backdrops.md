# ADR-0009 — Salles réalistes en backdrop DATA-driven (Set-System, phase décor)

- **Status:** Accepted (run sourcing environnements, 2026-07-18)
- **Specs:** docs/TekPractice_Set-System.md (§2 staging — phase décor seulement) +
  docs/TekPractice_3D-Model-Sourcing.md (légal/pipeline identiques aux devices)

## Décisions
1. **La salle est un champ DATA du preset** : `Environment.set { glb, position?, rotationY?, scale? }`
   (content/environments/*.json). NB : la spec esquissait `backdrop: "<glb>"` — backdrop étant
   déjà l'objet couleurs, la salle vit sous `set` (dévié, loggé).
2. **La salle enveloppe l'origine** où le matériel vit déjà : on ancre LA SALLE (offset y pour
   les praticables — plateau live à y=-1.05), jamais le matériel. Le placement fin par device =
   passe Set Editor (spec §4), pas ce run.
3. **Chargement non-bloquant, studio blanc invincible** : échec de glb → warn + scène blanche
   intacte ; le ground blanc n'est retiré QUE si la salle charge (elle apporte son sol).
   Preset `blanc` ajouté (sélectionnable en sandbox) — le secours est un choix, pas juste un repli.
4. **Pipeline identique aux devices** : Sketchfab CC-BY vérifié à l'API → Blender (échelle en
   mètres par largeur réelle, ground/centre, décimation ≤100k) → webp 1024 + Draco →
   public/assets/environments/ (raw gitignoré, CREDITS + manifest).

## Sourcé (licences CC Attribution vérifiées au download)
| espace | modèle | dims | poids |
|---|---|---|---|
| live-stage (plateau/A1) | Music_concert_stage_Low_poly | 12×10×5 m | 661 KB |
| theatre-stage | Theatre stage (rideaux/proscenium) | 12×16×11 m | 376 KB |
| radio-booth (radio/B1) | AB Radio Studio (mobilier inclus) | 9×5×3 m | 971 KB |
| studio (D1) | AUCUN candidat réaliste CC0/CC-BY → studio blanc conservé + queue |

## Rejetés
- Salles NC/ND (écartées d'office) ; dioramas isométriques cartoon (anti-DA réaliste).
- Ancrer le matériel à la salle (inverse) : casserait layouts/e2e existants.
