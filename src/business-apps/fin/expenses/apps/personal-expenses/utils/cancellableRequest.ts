/**
 * Helper function to make a request cancellable using AbortController.
 * This allows application-level cancellation even when the underlying network request
 * doesn't support AbortSignal directly.
 *
 * @template T - The type of the promise result
 * @param requestPromise - The promise representing the network request
 * @param controller - The AbortController to use for cancellation
 * @returns A promise that will reject with an AbortError if cancelled
 */
export const makeCancellableRequest = <T>(requestPromise: Promise<T>, controller: AbortController): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Check if already aborted before starting
    if (controller.signal.aborted) {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      reject(abortError)
      return
    }

    // Set up abort listener
    const abortHandler = () => {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      reject(abortError)
    }

    controller.signal.addEventListener('abort', abortHandler, { once: true })

    // Execute the request
    requestPromise
      .then(result => {
        // Check if aborted after request completes
        if (controller.signal.aborted) {
          const abortError = new Error('Request aborted')
          abortError.name = 'AbortError'
          reject(abortError)
          return
        }
        controller.signal.removeEventListener('abort', abortHandler)
        resolve(result)
      })
      .catch(error => {
        controller.signal.removeEventListener('abort', abortHandler)
        reject(error)
      })
  })
}
