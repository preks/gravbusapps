import type { EditorView } from '@tiptap/pm/view'

type FrameScheduler = (callback: FrameRequestCallback) => number
type FrameCanceler = (handle: number) => void

export function createDeferredRepaginationScheduler(params: {
  runEvaluation: (view: EditorView) => void
  scheduleFrame?: FrameScheduler
  cancelScheduledFrame?: FrameCanceler
}) {
  const scheduleFrame = params.scheduleFrame ?? requestAnimationFrame
  const cancelScheduledFrame = params.cancelScheduledFrame ?? cancelAnimationFrame

  let frameOne: number | null = null
  let frameTwo: number | null = null
  let scheduledView: EditorView | null = null
  let stabilizationAttemptsRemaining = 0

  const clear = () => {
    if (frameOne !== null) {
      cancelScheduledFrame(frameOne)
      frameOne = null
    }

    if (frameTwo !== null) {
      cancelScheduledFrame(frameTwo)
      frameTwo = null
    }

    scheduledView = null
  }

  const schedule = (view: EditorView, minimumStabilizationAttempts = 0) => {
    stabilizationAttemptsRemaining = Math.max(stabilizationAttemptsRemaining, minimumStabilizationAttempts)
    scheduledView = view

    if (frameOne !== null) {
      cancelScheduledFrame(frameOne)
    }

    if (frameTwo !== null) {
      cancelScheduledFrame(frameTwo)
    }

    frameOne = scheduleFrame(() => {
      frameOne = null
      frameTwo = scheduleFrame(() => {
        frameTwo = null
        const nextView = scheduledView
        scheduledView = null
        if (!nextView) return

        params.runEvaluation(nextView)
      })
    })
  }

  return {
    clear,
    destroy: clear,
    schedule,
    getStabilizationAttemptsRemaining: () => stabilizationAttemptsRemaining,
    decrementStabilizationAttempts: () => {
      stabilizationAttemptsRemaining = Math.max(0, stabilizationAttemptsRemaining - 1)
      return stabilizationAttemptsRemaining
    },
    resetStabilizationAttempts: () => {
      stabilizationAttemptsRemaining = 0
    }
  }
}
