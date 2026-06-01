import { clampHeight, isFixedViewportHtmlArtifact, shouldUseAutoHeightHtmlViewer } from './AutoHeightHtmlIframe'

describe('shouldUseAutoHeightHtmlViewer', () => {
  it('uses auto-height for generic and dashboard html', () => {
    expect(shouldUseAutoHeightHtmlViewer('merge_dashboard.html')).toBe(true)
    expect(shouldUseAutoHeightHtmlViewer('org-merge-report.html')).toBe(true)
    expect(shouldUseAutoHeightHtmlViewer('acme-crm.timeline.html')).toBe(true)
    expect(shouldUseAutoHeightHtmlViewer('artifacts/foo/bar.html')).toBe(true)
  })

  it('uses fixed viewport for cinematic / hyperframe patterns', () => {
    expect(shouldUseAutoHeightHtmlViewer('hyperframe.html')).toBe(false)
    expect(shouldUseAutoHeightHtmlViewer('launch-composition.html')).toBe(false)
    expect(shouldUseAutoHeightHtmlViewer('story.cinema.html')).toBe(false)
    expect(shouldUseAutoHeightHtmlViewer('intro-gsap-demo.html')).toBe(false)
    expect(isFixedViewportHtmlArtifact('hyperframe.html')).toBe(true)
  })

  it('returns false for non-html paths', () => {
    expect(shouldUseAutoHeightHtmlViewer('report.md')).toBe(false)
    expect(shouldUseAutoHeightHtmlViewer('chart.json')).toBe(false)
  })
})

describe('clampHeight', () => {
  it('clamps inline variant between 360 and min(720, 70vh)', () => {
    const maxInline = Math.min(720, Math.round((globalThis.innerHeight ?? 800) * 0.7))
    expect(clampHeight(100, 'inline')).toBe(360)
    expect(clampHeight(2000, 'inline')).toBe(maxInline)
    expect(clampHeight(500, 'inline')).toBe(500)
  })

  it('clamps panel variant with higher ceiling', () => {
    expect(clampHeight(100, 'panel')).toBe(420)
    expect(clampHeight(1500, 'panel')).toBe(1500)
  })

  it('allows modal variant to grow beyond panel cap', () => {
    expect(clampHeight(5000, 'modal')).toBe(5000)
  })
})
