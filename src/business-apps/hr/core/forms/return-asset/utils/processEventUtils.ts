/**
 * Utility functions for dispatching process completion events
 */

export interface ProcessCompletionPayload {
  resolution: 'success' | 'failure'
  processName: string
  domain: string
  response: {
    employeeAsset?: any
    asset?: any
    deallocation?: any
    allocation?: any
  }
}

/**
 * Dispatch process completion events
 * Sends both processCompletion and taskCompletion events
 */
export const dispatchProcessCompletionEvents = (payload: ProcessCompletionPayload) => {
  window.dispatchEvent(
    new CustomEvent('com.newwork.process.processCompletion', {
      detail: payload
    })
  )

  window.dispatchEvent(
    new CustomEvent('com.newwork.process.taskCompletion', {
      detail: payload
    })
  )
}
