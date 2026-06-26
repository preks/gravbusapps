import { pickEffectivePreview, type EffectivePreviewState } from '../pickEffectivePreview'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'

const preview = (overrides: Partial<ArtifactPreview>): ArtifactPreview => ({
  artifactId: 'a1',
  artifactType: 'slides',
  title: 'Deck',
  status: 'ready',
  ...overrides
})

const state = (overrides: Partial<EffectivePreviewState>): EffectivePreviewState => ({
  previews: [],
  latestPreview: null,
  hasActivePreview: false,
  ...overrides
})

describe('pickEffectivePreview', () => {
  it('returns the live turn preview when the current turn has one', () => {
    const live = preview({ artifactId: 'turn-1', status: 'generating' })
    const turn = state({ previews: [live], latestPreview: live, hasActivePreview: true })
    const full = state({ previews: [live], latestPreview: live, hasActivePreview: true })

    const result = pickEffectivePreview(turn, full)

    expect(result).toBe(turn)
    expect(result.latestPreview).toBe(live)
  })

  it('pins the most recent finished canvas artifact when the turn has no live preview', () => {
    const older = preview({ artifactId: 'old', artifactType: 'document', status: 'ready', title: 'Doc' })
    const newer = preview({ artifactId: 'new', artifactType: 'slides', status: 'ready', title: 'Deck' })
    const turn = state({})
    const full = state({ previews: [older, newer] })

    const result = pickEffectivePreview(turn, full)

    expect(result.latestPreview).toBe(newer)
    expect(result.hasActivePreview).toBe(true)
    expect(result.previews).toBe(full.previews)
  })

  it('drops stale error/generating leftovers and returns null when nothing is finished', () => {
    const stale = preview({ artifactId: 'err', status: 'error' })
    const inflight = preview({ artifactId: 'gen', status: 'generating' })
    const turn = state({})
    const full = state({ previews: [stale, inflight] })

    const result = pickEffectivePreview(turn, full)

    expect(result.latestPreview).toBeNull()
    expect(result.hasActivePreview).toBe(false)
  })

  it('ignores finished but non-canvas artifact types (chart, pdf) when pinning', () => {
    const chart = preview({ artifactId: 'c', artifactType: 'chart', status: 'ready' })
    const pdf = preview({ artifactId: 'p', artifactType: 'pdf', status: 'ready' })
    const turn = state({})
    const full = state({ previews: [chart, pdf] })

    const result = pickEffectivePreview(turn, full)

    expect(result.latestPreview).toBeNull()
    expect(result.hasActivePreview).toBe(false)
  })
})
