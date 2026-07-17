/**
 * Teknest design tokens — THE single source of visual truth (design-system.md).
 * White, calm, gallery-grade: the gear is the hero, the UI recedes.
 * Consumed by: index.html CSS (via injectTokens → CSS custom properties),
 * the Babylon scene (scene/*, main.ts) and the HUD components.
 * NEVER hardcode a color/duration/spacing outside this file.
 */

export const TOKENS = {
  color: {
    // Canvas & surfaces
    bg: '#F5F6F8', // 3D scene clear color — soft paper white
    floor: '#FCFCFD', // stage floor — near-white, lets contact shadows read
    surface: '#FFFFFF', // HUD cards
    surfaceBorder: '#E6E8EE',
    overlay: 'rgba(24, 28, 38, 0.32)', // win-screen scrim — calm, not black

    // Ink (WCAG AA on surface/bg)
    ink: '#1B2129', // 15.4:1 on white
    inkMuted: '#5A6372', // 6.4:1 on white
    inkFaint: '#8B93A3', // decorative only

    // One accent (white text on accent = 4.6:1 AA)
    accent: '#2E5FE6',
    accentInk: '#FFFFFF',

    // Semantic (teaching feedback — calm, never neon)
    success: '#1F9D5B',
    successInk: '#0B3A21',
    error: '#D93A47',
    warning: '#D98324',
    info: '#2E5FE6',

    // Ports (direction coding, distinguishable on device bodies)
    portIn: '#2E7DDB',
    portOut: '#E08A2E',
    portBidir: '#8A63D2',

    // Scene objects
    deviceBody: '#465064', // placeholder boxes (real glbs carry their own PBR)
    cable: '#2A2F3A', // committed cable — dark line on white floor
    cableNeutral: '#B9BFCC',
    cableOk: '#1F9D5B',
    cableBad: '#D93A47',
    contactShadow: 'rgba(20, 24, 32, 0.20)', // soft blob under devices
  },

  type: {
    family: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    size: { xs: '11px', sm: '12.5px', md: '14px', lg: '16px', xl: '21px' },
    weight: { regular: 450, medium: 550, bold: 650 },
  },

  space: { xs: '4px', sm: '8px', md: '14px', lg: '20px', xl: '32px' },

  radius: { sm: '7px', md: '12px', lg: '18px' },

  elevation: {
    card: '0 1px 2px rgba(27,33,41,0.05), 0 8px 24px rgba(27,33,41,0.07)',
    raised: '0 2px 6px rgba(27,33,41,0.08), 0 16px 40px rgba(27,33,41,0.10)',
  },

  motion: {
    fast: '140ms',
    base: '240ms',
    slow: '420ms',
    ease: 'cubic-bezier(0.2, 0, 0, 1)', // decisive start, soft landing
  },
} as const

/** Push every token onto :root as --tk-* custom properties (called once at boot). */
export function injectTokens(root: HTMLElement = document.documentElement): void {
  const set = (k: string, v: string) => root.style.setProperty(k, v)
  for (const [k, v] of Object.entries(TOKENS.color)) set(`--tk-${kebab(k)}`, v)
  set('--tk-font', TOKENS.type.family)
  for (const [k, v] of Object.entries(TOKENS.type.size)) set(`--tk-text-${k}`, v)
  for (const [k, v] of Object.entries(TOKENS.type.weight)) set(`--tk-weight-${k}`, String(v))
  for (const [k, v] of Object.entries(TOKENS.space)) set(`--tk-space-${k}`, v)
  for (const [k, v] of Object.entries(TOKENS.radius)) set(`--tk-radius-${k}`, v)
  for (const [k, v] of Object.entries(TOKENS.elevation)) set(`--tk-elev-${k}`, v)
  set('--tk-motion-fast', TOKENS.motion.fast)
  set('--tk-motion-base', TOKENS.motion.base)
  set('--tk-motion-slow', TOKENS.motion.slow)
  set('--tk-motion-ease', TOKENS.motion.ease)
}

const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

/** Accessibility: 3D-side animations must respect prefers-reduced-motion (CSS side is handled by a media query). */
export const motionEnabled = (): boolean =>
  typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
