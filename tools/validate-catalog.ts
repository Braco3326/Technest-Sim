/**
 * validate-catalog — verifies content/catalog.json + content/levels/*.json
 * are internally consistent (Prompt 0.5b gate, pre-engine).
 *
 * Checks:
 *  1. zod shape validation (fail-fast with JSON path) — schemas in tools/schemas.ts
 *  2. unique ids everywhere (connectors, signals, devices, ports, rules, controls, instances)
 *  3. every ref resolves: matesWith → connectorTypes, port.connector/signal → types,
 *     device.levels → level files, level deviceId → devices, chain instance/port → level/device,
 *     logicChecks → rules
 *  4. matesWith symmetry (if A mates B, B mates A)
 *  5. chain direction sanity (from-port may not be "in", to-port may not be "out")
 *  6. chain connector mating + signal identity (the R1/R2 ground truth must hold
 *     for every REQUIRED connection — required chains must be solvable)
 *  7. logicChecks declares DOMAIN modules only — engine invariants (R1/R2/R3,
 *     module "engine") are always-on in ConnectionGraph and must NOT be listed
 *  8. controls (ADR-0001): unique ids per device; enables.ports exist on the
 *     device and actually carry the gated flag
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { Catalog, Level } from './schemas'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'))

// ── load + shape-validate (fail fast with JSON path) ───────────────────────
const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

function parseOrDie<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const r = schema.safeParse(data)
  if (!r.success) {
    for (const i of r.error.issues) fail(`${file} → ${i.path.join('.')}: ${i.message}`)
    console.error(errors.join('\n'))
    process.exit(1)
  }
  return r.data
}

const catalog = parseOrDie(Catalog, read('content/catalog.json'), 'content/catalog.json')
const LEVEL_IDS = ['a1', 'b1', 'c1', 'd1'] as const
const levels = LEVEL_IDS.map((id) =>
  parseOrDie(Level, read(`content/levels/${id}.json`), `content/levels/${id}.json`),
)

// ── uniqueness ──────────────────────────────────────────────────────────────
function assertUnique(items: string[], what: string) {
  const seen = new Set<string>()
  for (const it of items) {
    if (seen.has(it)) fail(`duplicate ${what}: "${it}"`)
    seen.add(it)
  }
}
assertUnique(catalog.connectorTypes.map((c) => c.id), 'connectorTypes.id')
assertUnique(catalog.signalTypes.map((s) => s.id), 'signalTypes.id')
assertUnique(catalog.devices.map((d) => d.id), 'devices.id')
assertUnique(catalog.rules.map((r) => r.id), 'rules.id')
for (const d of catalog.devices) assertUnique(d.ports.map((p) => p.portId), `ports.portId in ${d.id}`)

const connectorIds = new Set(catalog.connectorTypes.map((c) => c.id))
const signalIds = new Set(catalog.signalTypes.map((s) => s.id))
const deviceById = new Map(catalog.devices.map((d) => [d.id, d]))
const ruleById = new Map(catalog.rules.map((r) => [r.id, r]))
const levelIds = new Set<string>(LEVEL_IDS)

// ── cross-references in catalog ─────────────────────────────────────────────
for (const c of catalog.connectorTypes)
  for (const m of c.matesWith) {
    if (!connectorIds.has(m)) fail(`connectorTypes["${c.id}"].matesWith → unknown connector "${m}"`)
    else {
      const other = catalog.connectorTypes.find((x) => x.id === m)!
      if (!other.matesWith.includes(c.id))
        fail(`matesWith asymmetry: "${c.id}" mates "${m}" but not vice-versa`)
    }
  }

for (const d of catalog.devices) {
  for (const lv of d.levels)
    if (!levelIds.has(lv)) fail(`devices["${d.id}"].levels → unknown level "${lv}"`)
  for (const p of d.ports) {
    if (!connectorIds.has(p.connector)) fail(`devices["${d.id}"].ports["${p.portId}"].connector → unknown "${p.connector}"`)
    if (!signalIds.has(p.signal)) fail(`devices["${d.id}"].ports["${p.portId}"].signal → unknown "${p.signal}"`)
  }
  // controls (ADR-0001)
  if (d.controls) {
    assertUnique(d.controls.map((c) => c.id), `controls.id in ${d.id}`)
    for (const ctl of d.controls) {
      // Naming conventions consumed by logic/* modules (see equipment-catalog.md):
      //   fader-<portId>          → port must exist and be an isMicInput
      //   route-<srcPort>-to-<busPort> → both ports must exist (src=in, bus=out)
      if (ctl.id.startsWith('fader-')) {
        const pid = ctl.id.slice('fader-'.length)
        const port = d.ports.find((p) => p.portId === pid)
        if (!port) fail(`devices["${d.id}"].controls["${ctl.id}"] → unknown port "${pid}"`)
        else if (!(port.flags ?? []).includes('isMicInput'))
          fail(`devices["${d.id}"].controls["${ctl.id}"] → port "${pid}" is not flagged isMicInput (fader-* convention drives R5/R6)`)
      }
      const route = /^route-(.+)-to-(.+)$/.exec(ctl.id)
      if (route) {
        const [, src, bus] = route
        const srcPort = d.ports.find((p) => p.portId === src)
        const busPort = d.ports.find((p) => p.portId === bus)
        if (!srcPort) fail(`devices["${d.id}"].controls["${ctl.id}"] → unknown source port "${src}"`)
        else if (srcPort.dir === 'out') fail(`devices["${d.id}"].controls["${ctl.id}"] → source "${src}" must be an input/bidir`)
        if (!busPort) fail(`devices["${d.id}"].controls["${ctl.id}"] → unknown bus port "${bus}"`)
        else if (busPort.dir === 'in') fail(`devices["${d.id}"].controls["${ctl.id}"] → bus "${bus}" must be an output/bidir`)
      }
      if (!ctl.enables) continue
      for (const pid of ctl.enables.ports) {
        const port = d.ports.find((p) => p.portId === pid)
        if (!port) fail(`devices["${d.id}"].controls["${ctl.id}"].enables.ports → unknown port "${pid}"`)
        else if (!(port.flags ?? []).includes(ctl.enables.flag))
          fail(`devices["${d.id}"].controls["${ctl.id}"] gates flag "${ctl.enables.flag}" on port "${pid}" — but that port does not carry the flag`)
      }
    }
  }
}

if (catalog.rules.length !== 8) fail(`expected 8 rules, got ${catalog.rules.length}`)

// ── levels: refs, direction, mating, signal identity ───────────────────────
const mates = (a: string, b: string) =>
  catalog.connectorTypes.find((c) => c.id === a)!.matesWith.includes(b)

for (const lvl of levels) {
  const file = `content/levels/${lvl.id}.json`
  assertUnique(lvl.devices.map((d) => d.instanceId), `instanceId in ${file}`)
  const instToDevice = new Map<string, (typeof catalog.devices)[number]>()

  for (const inst of lvl.devices) {
    const dev = deviceById.get(inst.deviceId)
    if (!dev) { fail(`${file}: devices["${inst.instanceId}"].deviceId → unknown device "${inst.deviceId}"`); continue }
    if (!dev.levels.includes(lvl.id))
      fail(`${file}: "${inst.deviceId}" used here but catalog devices["${inst.deviceId}"].levels lacks "${lvl.id}"`)
    instToDevice.set(inst.instanceId, dev)
  }

  lvl.requiredChain.forEach((conn, i) => {
    const at = `${file}: requiredChain[${i}]`
    const resolveEnd = (ref: { instance: string; port: string }, end: 'from' | 'to') => {
      const dev = instToDevice.get(ref.instance)
      if (!dev) { fail(`${at}.${end}: unknown instance "${ref.instance}"`); return null }
      const port = dev.ports.find((p) => p.portId === ref.port)
      if (!port) { fail(`${at}.${end}: device "${dev.id}" has no port "${ref.port}"`); return null }
      return port
    }
    const from = resolveEnd(conn.from, 'from')
    const to = resolveEnd(conn.to, 'to')
    if (!from || !to) return
    if (from.dir === 'in') fail(`${at}: "from" port ${conn.from.instance}.${conn.from.port} is an input (R3 would reject the required chain)`)
    if (to.dir === 'out') fail(`${at}: "to" port ${conn.to.instance}.${conn.to.port} is an output (R3 would reject the required chain)`)
    if (!mates(from.connector, to.connector))
      fail(`${at}: connectors don't mate: ${from.connector} ↛ ${to.connector} (R1 would reject the required chain)`)
    if (from.signal !== to.signal)
      fail(`${at}: signal mismatch ${from.signal} ≠ ${to.signal} (R2 would reject the required chain)`)
  })

  for (const rc of lvl.logicChecks) {
    const rule = ruleById.get(rc)
    if (!rule) { fail(`${file}: logicChecks → unknown rule "${rc}"`); continue }
    if (rule.module === 'engine')
      fail(`${file}: logicChecks lists "${rc}" — engine invariants (R1/R2/R3) are ALWAYS active in ConnectionGraph.connect() and must not be declared; logicChecks is for domain modules (R4–R8) only`)
  }
}

// ── report ──────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`✗ catalog INVALID — ${errors.length} error(s):\n`)
  for (const e of errors) console.error('  • ' + e)
  process.exit(1)
}

const totalPorts = catalog.devices.reduce((n, d) => n + d.ports.length, 0)
const totalControls = catalog.devices.reduce((n, d) => n + (d.controls?.length ?? 0), 0)
console.log('✓ catalog VALID')
console.log(`  connectorTypes : ${catalog.connectorTypes.length} (matesWith symmetric)`)
console.log(`  signalTypes    : ${catalog.signalTypes.length}`)
console.log(`  devices        : ${catalog.devices.length} (${totalPorts} ports, ${totalControls} control(s), all refs resolve)`)
console.log(`  rules          : ${catalog.rules.length} (R1–R8; engine invariants barred from logicChecks)`)
for (const lvl of levels)
  console.log(`  level ${lvl.id}       : ${lvl.devices.length} instances, ${lvl.requiredChain.length} required connections, logicChecks [${lvl.logicChecks.join(', ') || '—'}] — chain solvable (R1/R2/R3 clean)`)
