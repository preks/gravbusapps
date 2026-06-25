import { useTypewriterReveal } from './useTypewriterReveal'

interface UseAnimatedGreetingOptions {
  /** When false, show the full greeting immediately (no artificial typewriter delay). */
  enabled?: boolean
}

/**
 * Typewriter-style reveal for greeting markdown. Thin wrapper over the generic
 * typewriter hook so existing callers keep a stable API.
 */
export function useAnimatedGreeting(greetingContent: string, options: UseAnimatedGreetingOptions = {}) {
  const { enabled = true } = options
  const { revealed, isRevealing } = useTypewriterReveal(greetingContent, { enabled })
  return {
    animatedGreetingContent: revealed,
    isGreetingAnimating: isRevealing
  }
}
