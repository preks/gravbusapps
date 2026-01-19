/**
 * Utility functions for dispatching process-related events
 */

/**
 * Dispatches a 'com.newwork.process.continue' event with the specified parameters
 * @param event The event identifier
 * @param payload The payload data to include with the event
 */
export function dispatchProcessContinueEvent(event: string, payload: any): void {
  window.dispatchEvent(
    new CustomEvent('com.newwork.process.continue', {
      detail: {
        event,
        payload
      }
    })
  )
}
