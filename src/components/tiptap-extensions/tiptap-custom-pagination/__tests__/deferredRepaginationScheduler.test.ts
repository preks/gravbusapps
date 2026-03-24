import type { EditorView } from '@tiptap/pm/view'
import { createDeferredRepaginationScheduler } from '../deferredRepaginationScheduler'

function createFrameSchedulerHarness() {
  let nextHandle = 1
  const scheduled = new Map<number, FrameRequestCallback>()

  return {
    scheduleFrame(callback: FrameRequestCallback) {
      const handle = nextHandle++
      scheduled.set(handle, callback)
      return handle
    },
    cancelScheduledFrame(handle: number) {
      scheduled.delete(handle)
    },
    flushNext() {
      const nextEntry = scheduled.entries().next().value as [number, FrameRequestCallback] | undefined
      if (!nextEntry) return false

      const [handle, callback] = nextEntry
      scheduled.delete(handle)
      callback(0)
      return true
    },
    flushAll() {
      while (this.flushNext()) {
        // flush until empty
      }
    }
  }
}

describe('createDeferredRepaginationScheduler', () => {
  it('runs evaluation only after the second scheduled frame', () => {
    const frames = createFrameSchedulerHarness()
    const runEvaluation = jest.fn()
    const scheduler = createDeferredRepaginationScheduler({
      runEvaluation,
      scheduleFrame: frames.scheduleFrame,
      cancelScheduledFrame: frames.cancelScheduledFrame
    })
    const view = {} as EditorView

    scheduler.schedule(view)
    expect(runEvaluation).not.toHaveBeenCalled()

    frames.flushNext()
    expect(runEvaluation).not.toHaveBeenCalled()

    frames.flushNext()
    expect(runEvaluation).toHaveBeenCalledWith(view)
  })

  it('coalesces reschedules and evaluates the latest view once', () => {
    const frames = createFrameSchedulerHarness()
    const runEvaluation = jest.fn()
    const scheduler = createDeferredRepaginationScheduler({
      runEvaluation,
      scheduleFrame: frames.scheduleFrame,
      cancelScheduledFrame: frames.cancelScheduledFrame
    })
    const firstView = { id: 'first' } as unknown as EditorView
    const secondView = { id: 'second' } as unknown as EditorView

    scheduler.schedule(firstView)
    scheduler.schedule(secondView)
    frames.flushAll()

    expect(runEvaluation).toHaveBeenCalledTimes(1)
    expect(runEvaluation).toHaveBeenCalledWith(secondView)
  })

  it('tracks stabilization attempts across scheduling and resets', () => {
    const frames = createFrameSchedulerHarness()
    const scheduler = createDeferredRepaginationScheduler({
      runEvaluation: jest.fn(),
      scheduleFrame: frames.scheduleFrame,
      cancelScheduledFrame: frames.cancelScheduledFrame
    })
    const view = {} as EditorView

    scheduler.schedule(view, 2)
    scheduler.schedule(view, 1)
    expect(scheduler.getStabilizationAttemptsRemaining()).toBe(2)

    expect(scheduler.decrementStabilizationAttempts()).toBe(1)
    expect(scheduler.decrementStabilizationAttempts()).toBe(0)
    expect(scheduler.decrementStabilizationAttempts()).toBe(0)

    scheduler.schedule(view, 4)
    expect(scheduler.getStabilizationAttemptsRemaining()).toBe(4)

    scheduler.resetStabilizationAttempts()
    expect(scheduler.getStabilizationAttemptsRemaining()).toBe(0)
  })

  it('clears pending work before evaluation runs', () => {
    const frames = createFrameSchedulerHarness()
    const runEvaluation = jest.fn()
    const scheduler = createDeferredRepaginationScheduler({
      runEvaluation,
      scheduleFrame: frames.scheduleFrame,
      cancelScheduledFrame: frames.cancelScheduledFrame
    })

    scheduler.schedule({} as EditorView)
    scheduler.clear()
    frames.flushAll()

    expect(runEvaluation).not.toHaveBeenCalled()
  })
})
