import { createDocumentLayoutScheduler } from '../documentLayoutScheduler'

describe('createDocumentLayoutScheduler', () => {
  it('invokes runMeasurement once for coalesced generations in a single run', async () => {
    const runMeasurement = jest.fn()
    const scheduler = createDocumentLayoutScheduler({
      source: 'incremental-layout-engine',
      debounceMs: 0,
      runMeasurement,
      onStateChange: () => {}
    })

    scheduler.requestLayout({
      immediate: true,
      reason: 'initial-load',
      scope: 'full-document',
      pageRange: { startPage: 1, endPage: 5 }
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    expect(runMeasurement).toHaveBeenCalledTimes(1)
    expect(runMeasurement.mock.calls[0]?.[0]?.generation).toBe(1)
  })

  it('emits a single onStateChange when queueing work while measuring', async () => {
    let finishMeasure: (() => void) | null = null
    const measurePromise = new Promise<void>(resolve => {
      finishMeasure = resolve
    })

    const onStateChange = jest.fn()
    const scheduler = createDocumentLayoutScheduler({
      source: 'incremental-layout-engine',
      debounceMs: 0,
      runMeasurement: async () => {
        await measurePromise
      },
      onStateChange
    })

    scheduler.requestLayout({
      immediate: true,
      reason: 'initial-load',
      scope: 'full-document',
      pageRange: null
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const emissionsAfterFirstRequest = onStateChange.mock.calls.length

    scheduler.requestLayout({
      immediate: true,
      reason: 'editor-transaction',
      scope: 'structure',
      pageRange: null
    })

    const emissionsAfterSecondRequestWhileMeasuring = onStateChange.mock.calls.length

    expect(emissionsAfterSecondRequestWhileMeasuring - emissionsAfterFirstRequest).toBe(1)
    const lastCall = onStateChange.mock.calls[emissionsAfterSecondRequestWhileMeasuring - 1]?.[0]
    expect(lastCall?.status).toBe('scheduled')

    finishMeasure?.()
    await measurePromise
    await new Promise<void>(resolve => {
      queueMicrotask(() => resolve())
    })
  })

  it('dispose prevents further measurements', async () => {
    const runMeasurement = jest.fn()
    const scheduler = createDocumentLayoutScheduler({
      source: 'incremental-layout-engine',
      debounceMs: 0,
      runMeasurement,
      onStateChange: () => {}
    })

    scheduler.dispose()
    scheduler.requestLayout({
      immediate: true,
      reason: 'initial-load',
      scope: 'full-document',
      pageRange: null
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    expect(runMeasurement).not.toHaveBeenCalled()
  })
})
