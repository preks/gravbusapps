/**
 * MSN-style Nudge Utilities
 * Provides sound effects and shake animations for chat nudges
 */

/**
 * Play nudge sound effect
 * Uses Web Audio API to generate a notification sound
 */
export const playNudgeSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Create a short beep sound (double beep like MSN)
    const playBeep = (frequency: number, duration: number, delay: number) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      // Envelope for smooth sound
      const now = audioContext.currentTime + delay
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)

      oscillator.start(now)
      oscillator.stop(now + duration)
    }

    // Play double beep (800Hz, 600Hz) like MSN
    playBeep(800, 0.15, 0)
    playBeep(600, 0.15, 0.2)
  } catch (error) {
    console.error('Failed to play nudge sound:', error)
  }
}

/**
 * Shake animation for nudge effect
 * Applies MSN-style shake animation to an element
 */
export const applyShakeAnimation = (element: HTMLElement | null) => {
  if (!element) return

  // Add shake animation class
  element.classList.add('chat-nudge-shake')

  // Remove class after animation completes
  setTimeout(() => {
    element.classList.remove('chat-nudge-shake')
  }, 500)
}

/**
 * Inject shake animation CSS if not already present
 */
export const injectNudgeStyles = () => {
  const styleId = 'chat-nudge-styles'

  // Check if styles already injected
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @keyframes chat-nudge-shake {
      0%, 100% { transform: translate(0, 0); }
      10%, 30%, 50%, 70%, 90% { transform: translate(-10px, 0); }
      20%, 40%, 60%, 80% { transform: translate(10px, 0); }
    }
    
    .chat-nudge-shake {
      animation: chat-nudge-shake 0.5s ease-in-out;
    }
    
    @keyframes chat-nudge-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
    
    .chat-nudge-pulse {
      animation: chat-nudge-pulse 0.3s ease-in-out;
    }
  `

  document.head.appendChild(style)
}
