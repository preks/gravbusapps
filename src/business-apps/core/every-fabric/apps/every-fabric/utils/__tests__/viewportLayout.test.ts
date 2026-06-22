import { isDevToolsLayoutShift, subscribeResponsiveLayoutViewport } from '../viewportLayout'

function setViewportMetrics(metrics: {
  innerWidth: number
  innerHeight: number
  outerWidth: number
  outerHeight: number
}): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: metrics.innerWidth })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: metrics.innerHeight })
  Object.defineProperty(window, 'outerWidth', { configurable: true, writable: true, value: metrics.outerWidth })
  Object.defineProperty(window, 'outerHeight', { configurable: true, writable: true, value: metrics.outerHeight })
}

describe('viewportLayout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setViewportMetrics({
      innerWidth: 1440,
      innerHeight: 900,
      outerWidth: 1440,
      outerHeight: 900
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('detects docked DevTools from outer/inner viewport gaps', () => {
    setViewportMetrics({
      innerWidth: 900,
      innerHeight: 900,
      outerWidth: 1440,
      outerHeight: 900
    })
    expect(isDevToolsLayoutShift()).toBe(true)
  })

  it('ignores DevTools layout shifts when syncing responsive width', () => {
    const onChange = jest.fn()
    const unsubscribe = subscribeResponsiveLayoutViewport(onChange, { debounceMs: 100 })

    setViewportMetrics({
      innerWidth: 700,
      innerHeight: 900,
      outerWidth: 1440,
      outerHeight: 900
    })
    window.dispatchEvent(new Event('resize'))
    jest.advanceTimersByTime(100)

    expect(onChange).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('debounces genuine viewport resizes', () => {
    const onChange = jest.fn()
    const unsubscribe = subscribeResponsiveLayoutViewport(onChange, { debounceMs: 100 })

    setViewportMetrics({
      innerWidth: 700,
      innerHeight: 900,
      outerWidth: 700,
      outerHeight: 900
    })
    window.dispatchEvent(new Event('resize'))
    jest.advanceTimersByTime(100)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(700)
    unsubscribe()
  })
})
