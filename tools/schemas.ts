/**
 * schemas — single source of zod truth for content/*.json.
 * Used by validate-catalog.ts (runtime validation) and
 * generate-schema.ts (editor JSON-schema generation).
 * The engine's CatalogLoader (src/engine) will import these too — do not fork them.
 */
import { z } from 'zod'

export const PortFlag = z.enum([
  'providesPhantom', 'requiresPhantom', 'isClockMaster', 'isClockSlave',
  'isMicInput', 'isMonitorOut', 'isOnAirTally', 'isDantePrimary',
])

export const Port = z.object({
  portId: z.string().min(1),
  dir: z.enum(['in', 'out', 'bidir']),
  connector: z.string().min(1),
  signal: z.string().min(1),
  flags: z.array(PortFlag).optional(),
})

/**
 * A physical switch/knob on the device (ADR-0001, device state).
 * `enables` gates a port flag on the runtime control value:
 * e.g. ISA One "+48V" toggle gates providesPhantom on in-mic —
 * the flag is only EFFECTIVE while the control is on.
 */
export const Control = z.object({
  id: z.string().min(1),
  type: z.enum(['toggle']),
  label: z.string().min(1),
  default: z.boolean(),
  enables: z.object({
    flag: PortFlag,
    ports: z.array(z.string().min(1)).min(1),
  }).optional(),
})

export const Device = z.object({
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
  controls: z.array(Control).optional(),
})

export const Rule = z.object({
  id: z.string().regex(/^R[1-8]$/),
  slug: z.string().min(1),
  module: z.enum(['engine', 'logic/phantom', 'logic/gpio', 'logic/mixMinus', 'logic/clock']),
  severity: z.enum(['error', 'warning']),
  title: z.string().min(1),
  check: z.string().min(1),
  teach: z.string().min(1),
})

export const Catalog = z.object({
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
  rules: z.array(Rule),
}).passthrough()

export const PortRef = z.object({ instance: z.string().min(1), port: z.string().min(1) })

export const Level = z.object({
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

/** Referential mapping rules → BC/épreuves (content/readiness.json, ADR-0003). */
export const Readiness = z.object({
  version: z.number(),
  competencies: z.record(z.object({ label: z.string().min(1), inGame: z.boolean() })),
  epreuves: z.record(z.object({ label: z.string().min(1), coefficient: z.number().positive() })),
  rules: z.record(
    z.object({
      bc: z.array(z.string().min(1)).min(1),
      epreuves: z.array(z.string().min(1)).min(1),
      tip: z.string().min(1),
    }),
  ),
}).passthrough()

export type CatalogT = z.infer<typeof Catalog>
export type LevelT = z.infer<typeof Level>
export type ReadinessT = z.infer<typeof Readiness>
