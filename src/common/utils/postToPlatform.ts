/**
 * Sends a message to the platform window (parent and top) so the platform receives it
 * when the app runs in an iframe, including nested iframes.
 */
export function postToPlatform(message: object): void {
  if (typeof globalThis.parent === 'undefined') return
  globalThis.parent.postMessage(message, '*')
  if (globalThis.top && globalThis.top !== globalThis.parent) {
    globalThis.top.postMessage(message, '*')
  }
}
