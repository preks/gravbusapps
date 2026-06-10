/**
 * Utility to open Every AI sidebar with an initial prompt
 * Uses window.postMessage to communicate with gravity-platform
 */

declare global {
  interface Window {
    __everyAIInitialPayload?: {
      prompt?: string
      additionInfo?: string
      skills?: string[]
      newSession?: boolean
      createdAt: number
    }
  }
}

export interface OpenEveryAIOptions {
  /**
   * Initial prompt/message to send when Every AI opens
   */
  prompt?: string
  /**
   * Hidden context for Flowbot request payload (not user-visible text)
   */
  additionInfo?: string
  /**
   * Optional skill names to force-enable for this request.
   */
  skills?: string[]
  /**
   * When true, clear the current Every AI conversation before sending the prompt.
   */
  newSession?: boolean
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

  // Keep the latest payload in memory to avoid sessionStorage size limits
  // when additionInfo contains large HTML documents.
  window.__everyAIInitialPayload = {
    prompt: options?.prompt,
    additionInfo: options?.additionInfo,
    skills: options?.skills,
    newSession: options?.newSession,
    createdAt: Date.now()
  }

  const message = {
    type: 'OPEN_EVERY_AI',
    payload: {
      prompt: options?.prompt,
      additionInfo: options?.additionInfo,
      skills: options?.skills,
      newSession: options?.newSession
    }
  }

  console.log('[openEveryAI] Opening Every AI sidebar with prompt:', options?.prompt)
  try {
    if (options?.prompt) {
      sessionStorage.setItem('everyAIInitialPrompt', options.prompt)
    } else {
      sessionStorage.removeItem('everyAIInitialPrompt')
    }
  } catch (error) {
    console.warn('[openEveryAI] Failed to persist initial prompt to sessionStorage:', error)
  }

  // Persisting full HTML payloads to sessionStorage can exceed quota.
  // Keep this best-effort and non-blocking.
  try {
    if (options?.additionInfo) {
      sessionStorage.setItem('everyAIInitialAdditionInfo', options.additionInfo)
    } else {
      sessionStorage.removeItem('everyAIInitialAdditionInfo')
    }
  } catch (error) {
    console.warn('[openEveryAI] Failed to persist additionInfo to sessionStorage:', error)
  }

  try {
    if (options?.skills) {
      sessionStorage.setItem('everyAIInitialSkills', JSON.stringify(options.skills))
    } else {
      sessionStorage.removeItem('everyAIInitialSkills')
    }
  } catch (error) {
    console.warn('[openEveryAI] Failed to persist skills to sessionStorage:', error)
  }

  try {
    if (options?.newSession) {
      sessionStorage.setItem('everyAINewSession', 'true')
    } else {
      sessionStorage.removeItem('everyAINewSession')
    }
  } catch (error) {
    console.warn('[openEveryAI] Failed to persist newSession flag to sessionStorage:', error)
  }

  // Try custom event first (more reliable for same-window communication)
  try {
    const customEvent = new CustomEvent('openEveryAI', { detail: message })
    window.dispatchEvent(customEvent)
    if (options?.newSession) {
      window.dispatchEvent(new CustomEvent('everyAIStartNewSession'))
    }
    console.log('[openEveryAI] Dispatched custom event')
  } catch (error) {
    console.warn('[openEveryAI] Failed to dispatch custom event:', error)
  }

  // Also try postMessage as fallback. When this screen runs inside an iframe,
  // the platform host that owns the Every AI sidebar listens on the parent /
  // top window, so broadcast there too (guarded to avoid double-posting when
  // we are not embedded).
  const messageTargets: Window[] = [window]
  if (window.parent && window.parent !== window) messageTargets.push(window.parent)
  if (window.top && window.top !== window && window.top !== window.parent) messageTargets.push(window.top)

  messageTargets.forEach(target => {
    try {
      target.postMessage(message, '*')
    } catch (error) {
      console.warn('[openEveryAI] Failed to send postMessage:', error)
    }
  })
  console.log('[openEveryAI] Sent postMessage to', messageTargets.length, 'window(s)')
}
