import { scheduleCoalescedTimeout } from '../collaborationRepairScheduler'

describe('scheduleCoalescedTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps the first scheduled execution when called repeatedly', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null }
    const callback = jest.fn()

    scheduleCoalescedTimeout(timeoutRef, 100, callback)
    jest.advanceTimersByTime(60)
    scheduleCoalescedTimeout(timeoutRef, 100, callback)
    jest.advanceTimersByTime(39)

    expect(callback).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('allows scheduling again after the callback runs', () => {
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null }
    const callback = jest.fn()

    scheduleCoalescedTimeout(timeoutRef, 25, callback)
    jest.advanceTimersByTime(25)
    scheduleCoalescedTimeout(timeoutRef, 25, callback)
    jest.advanceTimersByTime(25)

    expect(callback).toHaveBeenCalledTimes(2)
  })
})
