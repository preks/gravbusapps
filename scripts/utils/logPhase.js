const DEFAULT_PHASE_DIVIDER = '='.repeat(80)

export function logPhase(title, { divider = DEFAULT_PHASE_DIVIDER } = {}) {
  console.log(`\n${divider}`)
  console.log(title)
  console.log(divider)
}
