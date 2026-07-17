/**
 * Ancrage (RAG) STRICT du coach IA — fonctions PURES (ADR-0006 décision 3).
 * buildGrounding() assemble le SEUL contexte que le LLM verra : la règle
 * déclenchée, les devices impliqués (specs catalog), le graphe courant.
 * validateReply() rejette toute réponse qui cite une règle inconnue, du
 * matériel hors contexte, ou qui ne cite aucune source.
 */
import type { Registry } from '../engine/CatalogLoader'
import type { RigSnapshot } from '../engine/types'
import type { CoachQuestion } from './AiCoach'

export interface GroundedDevice {
  deviceId: string
  name: string
  portLines: string[]
}

export interface Grounding {
  ruleId?: string
  ruleLine?: string
  errorCode?: string
  devices: GroundedDevice[]
  graphLines: string[]
  readinessLine?: string
  /** Citations [Rn] autorisées = règles réellement présentes au catalog. */
  allowedRuleIds: string[]
  /** Citations [catalog:x] autorisées = devices impliqués dans la question. */
  allowedDeviceIds: string[]
  /** Tous les ids du catalog — pour détecter la mention de matériel HORS contexte. */
  knownDeviceIds: string[]
}

export function buildGrounding(
  registry: Registry,
  snapshot: RigSnapshot,
  q: CoachQuestion,
  readinessLine?: string,
): Grounding {
  const rule = q.ruleId ? registry.ruleById.get(q.ruleId) : undefined

  const involvedInstances = new Set(q.subjects.map((s) => s.instance))
  const involvedDeviceIds = new Set<string>()
  for (const inst of snapshot.instances)
    if (involvedInstances.has(inst.instanceId)) involvedDeviceIds.add(inst.deviceId)

  const devices: GroundedDevice[] = [...involvedDeviceIds].map((deviceId) => {
    const d = registry.deviceById.get(deviceId)
    return {
      deviceId,
      name: d?.label ?? deviceId,
      portLines: (d?.ports ?? []).map(
        (p) => `${p.portId} (${p.dir}, connecteur ${p.connector}, signal ${p.signal})`,
      ),
    }
  })

  const graphLines = snapshot.connections.map(
    (c) => `${c.a.instance}:${c.a.port} ↔ ${c.b.instance}:${c.b.port}`,
  )

  return {
    ruleId: q.ruleId,
    ruleLine: rule ? `${rule.id} — ${rule.title} : ${rule.teach}` : undefined,
    errorCode: q.errorCode,
    devices,
    graphLines,
    readinessLine,
    allowedRuleIds: [...registry.ruleById.keys()],
    allowedDeviceIds: [...involvedDeviceIds],
    knownDeviceIds: [...registry.deviceById.keys()],
  }
}

/** Sérialise le pack pour le message utilisateur envoyé au provider. */
export function groundingToContext(g: Grounding): string {
  const parts: string[] = ['## CONTEXTE (seule source de vérité autorisée)']
  if (g.ruleLine) parts.push(`Règle déclenchée : ${g.ruleLine}`)
  else if (g.errorCode) parts.push(`Erreur gameplay : ${g.errorCode}`)
  for (const d of g.devices)
    parts.push(`Appareil [catalog:${d.deviceId}] « ${d.name} » — ports : ${d.portLines.join(' ; ')}`)
  parts.push(
    g.graphLines.length
      ? `Câblage actuel :\n${g.graphLines.map((l) => `- ${l}`).join('\n')}`
      : 'Câblage actuel : aucun câble.',
  )
  if (g.readinessLine) parts.push(`Progression de l'élève : ${g.readinessLine}`)
  return parts.join('\n')
}

export type ReplyValidation =
  | { ok: true; citations: string[] }
  | { ok: false; reason: string }

const CITE_RULE = /\[(R\d+)\]/g
const CITE_DEVICE = /\[catalog:([a-z0-9-]+)\]/g

export function validateReply(text: string, g: Grounding): ReplyValidation {
  const citations: string[] = []

  for (const m of text.matchAll(CITE_RULE)) {
    if (!g.allowedRuleIds.includes(m[1]))
      return { ok: false, reason: `règle inconnue citée : ${m[1]}` }
    citations.push(`[${m[1]}]`)
  }
  for (const m of text.matchAll(CITE_DEVICE)) {
    if (!g.allowedDeviceIds.includes(m[1]))
      return { ok: false, reason: `matériel hors contexte cité : ${m[1]}` }
    citations.push(`[catalog:${m[1]}]`)
  }
  if (citations.length === 0) return { ok: false, reason: 'aucune source citée' }

  // Mention en clair d'un device du catalog ABSENT du contexte → invention.
  for (const id of g.knownDeviceIds) {
    if (g.allowedDeviceIds.includes(id)) continue
    if (new RegExp(`(^|[^a-z0-9-])${id}([^a-z0-9-]|$)`).test(text))
      return { ok: false, reason: `mention de matériel absent du montage : ${id}` }
  }

  return { ok: true, citations: [...new Set(citations)] }
}
