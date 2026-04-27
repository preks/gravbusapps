import {
  PPTX_PARITY_MATRIX,
  DECK_ARCHETYPES,
  getCapability,
  getCapabilitiesByCategory,
  summarizeParity
} from '../parityMatrix'

describe('PPTX parity matrix', () => {
  it('defines unique capability ids', () => {
    const ids = PPTX_PARITY_MATRIX.map(cap => cap.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('declares every capability with a valid support level', () => {
    const supports = new Set(['exact', 'approximated', 'unsupported'])
    for (const cap of PPTX_PARITY_MATRIX) {
      expect(supports.has(cap.support)).toBe(true)
      expect(cap.feature.length).toBeGreaterThan(0)
    }
  })

  it('summary counts match the matrix entries', () => {
    const s = summarizeParity()
    expect(s.total).toBe(PPTX_PARITY_MATRIX.length)
    expect(s.exact + s.approximated + s.unsupported).toBe(s.total)
  })

  it('has non-trivial coverage of the top-level categories', () => {
    const critical = ['text', 'shape', 'image', 'chart', 'table', 'background', 'theme']
    for (const category of critical) {
      const caps = getCapabilitiesByCategory(category as 'text')
      expect(caps.length).toBeGreaterThan(0)
    }
  })

  it('keeps exact support above a floor so we do not regress quietly', () => {
    const s = summarizeParity()
    const ratio = s.exact / s.total
    expect(ratio).toBeGreaterThanOrEqual(0.2)
  })

  it('getCapability returns the correct entry', () => {
    const cap = getCapability('text-plain')
    expect(cap).toBeDefined()
    expect(cap!.support).toBe('exact')
    expect(getCapability('does-not-exist')).toBeUndefined()
  })

  it('tracks roadmap-covered authoring capabilities', () => {
    const authoring = getCapabilitiesByCategory('authoring' as 'text')
    expect(authoring.length).toBeGreaterThanOrEqual(4)
    for (const cap of authoring) {
      expect(cap.coveredByRoadmap).toBe(true)
    }
  })

  it('flags explicitly out-of-scope shape capabilities', () => {
    const outOfScope = PPTX_PARITY_MATRIX.filter(cap => cap.coveredByRoadmap === false)
    expect(outOfScope.some(cap => cap.id === 'shape-merge-operations')).toBe(true)
    expect(outOfScope.some(cap => cap.id === 'effects-bevel-3d')).toBe(true)
  })

  it('deck archetype thresholds reference valid capability ids', () => {
    const knownIds = new Set(PPTX_PARITY_MATRIX.map(c => c.id))
    for (const arch of DECK_ARCHETYPES) {
      expect(arch.minExactRatio).toBeGreaterThan(0)
      expect(arch.minSupportedRatio).toBeGreaterThanOrEqual(arch.minExactRatio)
      expect(arch.minSupportedRatio).toBeLessThanOrEqual(1)
      for (const id of arch.requiredCapabilities) {
        expect(knownIds.has(id)).toBe(true)
      }
    }
  })
})
