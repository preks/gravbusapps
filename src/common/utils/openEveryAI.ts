/**
 * Utility to open Every AI sidebar with an initial prompt
 * Uses window.postMessage to communicate with gravity-platform
 */

export interface OpenEveryAIOptions {
  /**
   * Initial prompt/message to send when Every AI opens
   */
  prompt?: string
}

/**
 * Open Every AI sidebar with an optional initial prompt
 * @param options - Options including optional prompt
 */
export function openEveryAI(options?: OpenEveryAIOptions): void {
  if (typeof window === 'undefined') {
    console.warn('openEveryAI called in non-browser environment')
    return
  }

  const message = {
    type: 'OPEN_EVERY_AI',
    payload: {
      prompt: options?.prompt
    }
  }

  console.log('[openEveryAI] Opening Every AI sidebar with prompt:', options?.prompt)

  // Try custom event first (more reliable for same-window communication)
  try {
    const customEvent = new CustomEvent('openEveryAI', { detail: message })
    window.dispatchEvent(customEvent)
    console.log('[openEveryAI] Dispatched custom event')
  } catch (error) {
    console.warn('[openEveryAI] Failed to dispatch custom event:', error)
  }

  // Also try postMessage as fallback
  try {
    window.postMessage(message, '*')
    console.log('[openEveryAI] Sent postMessage')
  } catch (error) {
    console.warn('[openEveryAI] Failed to send postMessage:', error)
  }
}
