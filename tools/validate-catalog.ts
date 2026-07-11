/**
 * validate-catalog — verifies content/catalog.json + content/levels/*.json
 * are internally consistent (Prompt 0.5b gate, pre-engine).
 *
 * Checks:
 *  1. zod shape validation (fail-fast with JSON path)
 *  2. unique ids everywhere (connectors, signals, devices, ports, rules, instances)
 *  3. every ref resolves: matesWith → connectorTypes, port.connector/signal → types,
 *     device.levels → level files, level deviceId → devices, chain instance/port → level/device,
 *     logicChecks → rules
 *  4. matesWith symmetry (if A mates B, B mates A)
 *  5. chain direction sanity (from-port may not be "in", to-port may not be "out")
 *  6. chain connector mating + signal identity (the R1/R2 ground truth must hold
 *     for every REQUIRED connection — required chains must be solvable)
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'))

// ── zod schemas ────────────────────────────────────────────────────────────
const PortFlag = z.enum([
  'providesPhantom', 'requiresPhantom', 'isClockMaster', 'isClockSlave',
  'isMicInput', 'isMonitorOut', 'isOnAirTally', 'isDantePrimary',
])
const Port = z.object({
  portId: z.string().min(1),
  dir: z.enum(['in', 'out', 'bidir']),
  connector: z.string().min(1),
  signal: z.string().min(1),
  flags: z.array(PortFlag).optional(),
})
const Device = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'device id must be a kebab-case slug'),
  label: z.string().min(1),
  levels: z.array(z.string()),
  realWorld: z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    category: z.string().min(1),
    typicalUse: z.string().min(1),
    notes: z.string(),
  }),
  ports: z.array(Port),
})
const Catalog = z.object({
  version: z.number(),
  meta: z.object({}).passthrough(),
  connectorTypes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    gender: z.enum(['male', 'female', 'universal']),
    matesWith: z.array(z.string()).min(1),
  })),
  signalTypes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    class: z.enum(['analog', 'digital', 'control', 'power']),
  })),
  devices: z.array(Device),
  rules: z.array(z.object({
    id: z.string().regex(/^R[1-8]$/),
    slug: z.string().min(1),
    module: z.enum(['engine', 'logic/phantom', 'logic/gpio', 'logic/mixMinus', 'logic/clock']),
    severity: z.enum(['error', 'warning']),
    title: z.string().min(1),
    check: z.string().min(1),
    teach: z.string().min(1),
  })),
}).passthrough()

const PortRef = z.object({ instance: z.string().min(1), port: z.string().min(1) })
const Level = z.object({
  id: z.string().min(1),
  version: z.number(),
  domain: z.enum(['live', 'radio', 'duplex', 'post']),
  title: z.string().min(1),
  brief: z.string().min(1),
  devices: z.array(z.object({ instanceId: z.string().min(1), deviceId: z.string().min(1) })),
  requiredChain: z.array(z.object({ from: PortRef, to: PortRef })),
  logicChecks: z.array(z.string()),
  successMessage: z.string().min(1),
}).passthrough()

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
const ruleIds = new Set(catalog.rules.map((r) => r.id))
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

  for (const rc of lvl.logicChecks)
    if (!ruleIds.has(rc)) fail(`${file}: logicChecks → unknown rule "${rc}"`)
}

// ── report ──────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`✗ catalog INVALID — ${errors.length} error(s):\n`)
  for (const e of errors) console.error('  • ' + e)
  process.exit(1)
}

const totalPorts = catalog.devices.reduce((n, d) => n + d.ports.length, 0)
console.log('✓ catalog VALID')
console.log(`  connectorTypes : ${catalog.connectorTypes.length} (matesWith symmetric)`)
console.log(`  signalTypes    : ${catalog.signalTypes.length}`)
console.log(`  devices        : ${catalog.devices.length} (${totalPorts} ports, all connector/signal refs resolve)`)
console.log(`  rules          : ${catalog.rules.length} (R1–R8)`)
for (const lvl of levels)
  console.log(`  level ${lvl.id}       : ${lvl.devices.length} instances, ${lvl.requiredChain.length} required connections, logicChecks [${lvl.logicChecks.join(', ')}] — chain solvable (R1/R2/R3 clean)`)
