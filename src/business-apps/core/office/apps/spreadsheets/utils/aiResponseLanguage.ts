/**
 * Maps app locale codes to instructions appended to AI prompts so the model
 * responds in the user's language. Only natural-language fields should follow
 * the directive — JSON keys and enum values stay in their canonical form.
 */
const LOCALE_TO_LANGUAGE_NAME: Record<string, string> = {
  'de-DE': 'German',
  'ro-RO': 'Romanian',
  'en-US': 'English'
}

export function getLanguageNameForLocale(locale: string | undefined | null): string {
  if (!locale) return 'English'
  return LOCALE_TO_LANGUAGE_NAME[locale] ?? 'English'
}

/**
 * Returns a short directive that can be appended to an AI system prompt to
 * force responses in the user's language. JSON shape and enum values must
 * remain unchanged — only free-text fields should be translated.
 */
export function getAiResponseLanguageInstruction(locale: string | undefined | null): string {
  const language = getLanguageNameForLocale(locale)
  return `Always write every natural-language string (titles, summaries, narratives, explanations, observations, recommendations) in ${language}. Keep JSON keys, enum values, formula syntax, and column identifiers exactly as specified — do not translate them.`
}

/**
 * Convenience helper: appends the language directive to an existing system
 * prompt with sensible spacing.
 */
export function withLanguageDirective(systemPrompt: string, locale: string | undefined | null): string {
  return `${systemPrompt.trim()}\n\n${getAiResponseLanguageInstruction(locale)}`
}
