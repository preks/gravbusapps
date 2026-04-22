import { useTypewriterReveal } from './useTypewriterReveal'

/**
 * Typewriter-style reveal for greeting markdown. Thin wrapper over the generic
 * typewriter hook so existing callers keep a stable API.
 */
export function useAnimatedGreeting(greetingContent: string) {
  const { revealed, isRevealing } = useTypewriterReveal(greetingContent)
  return {
    animatedGreetingContent: revealed,
    isGreetingAnimating: isRevealing
  }
}
