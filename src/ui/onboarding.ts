/**
 * Onboarding (Beat 1): exam date + a 2-question self-check → seeds the
 * recommender and drops her STRAIGHT into a level. No signup wall, ever —
 * the first win comes before we ask for anything.
 */

export interface OnboardingConfig {
  version: number
  intro: string
  examDateLabel: string
  questions: {
    id: string
    label: string
    options: { id: string; label: string; rules: string[] }[]
  }[]
  cta: string
}

export interface OnboardingAnswers {
  version: number
  examDate: string | null // YYYY-MM
  weakRules: string[]
  choices: Record<string, string>
  completedAt: string
}

const KEY = 'audio-sim/onboarding'

export function loadOnboarding(storage: Pick<Storage, 'getItem'>): OnboardingAnswers | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingAnswers
    return parsed.version === 1 ? parsed : null
  } catch {
    return null
  }
}

export function saveOnboarding(
  storage: Pick<Storage, 'setItem'>,
  answers: Omit<OnboardingAnswers, 'version' | 'completedAt'>,
): OnboardingAnswers {
  const full: OnboardingAnswers = { version: 1, completedAt: new Date().toISOString(), ...answers }
  storage.setItem(KEY, JSON.stringify(full))
  return full
}

/** Days until the exam month (counted to its 1st day); null when unset/past unknown. */
export function daysToExam(examDate: string | null, todayIso: string): number | null {
  if (!examDate || !/^\d{4}-\d{2}$/.test(examDate)) return null
  const diff = Math.ceil(
    (Date.parse(`${examDate}-01T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000,
  )
  return diff >= 0 ? diff : null
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function renderOnboarding(
  root: HTMLElement,
  config: OnboardingConfig,
  onDone: (answers: OnboardingAnswers) => void,
): void {
  const questions = config.questions
    .map(
      (q) => `
      <fieldset class="ob-q" data-q="${q.id}">
        <legend>${esc(q.label)}</legend>
        ${q.options
          .map(
            (o) =>
              `<label class="ob-opt"><input type="radio" name="${q.id}" value="${o.id}" /><span>${esc(o.label)}</span></label>`,
          )
          .join('')}
      </fieldset>`,
    )
    .join('')

  root.innerHTML = `
    <div class="db-card ob-card">
      <h1>TekPractice</h1>
      <p class="db-sub">${esc(config.intro)}</p>
      <fieldset class="ob-q">
        <legend>${esc(config.examDateLabel)}</legend>
        <input type="month" id="ob-exam-date" min="2026-01" />
      </fieldset>
      ${questions}
      <button class="db-cta" id="ob-go">${esc(config.cta)}</button>
      <p class="ob-skip"><a href="#" id="ob-skip">Passer — je veux juste essayer</a></p>
    </div>`

  const submit = (skip: boolean): void => {
    const examDate = skip ? null : (root.querySelector<HTMLInputElement>('#ob-exam-date')?.value || null)
    const choices: Record<string, string> = {}
    const weakRules: string[] = []
    if (!skip)
      for (const q of config.questions) {
        const checked = root.querySelector<HTMLInputElement>(`input[name="${q.id}"]:checked`)
        if (!checked) continue
        choices[q.id] = checked.value
        const option = q.options.find((o) => o.id === checked.value)
        if (option) weakRules.push(...option.rules)
      }
    onDone(saveOnboarding(window.localStorage, { examDate, weakRules, choices }))
  }

  root.querySelector('#ob-go')!.addEventListener('click', () => submit(false))
  root.querySelector('#ob-skip')!.addEventListener('click', (e) => {
    e.preventDefault()
    submit(true)
  })
}
