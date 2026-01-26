/**
 * Pluralizes an English word following standard rules
 * @param word - The word to pluralize
 * @returns The pluralized form of the word
 */
export function pluralize(word: string): string {
  if (!word) return word

  const lowerWord = word.toLowerCase()

  // Words ending in 'y' preceded by a consonant → change 'y' to 'ies'
  // (priority → priorities, category → categories)
  if (/[^aeiou]y$/.test(lowerWord)) {
    return word.slice(0, -1) + 'ies'
  }

  // Words ending in 's', 'x', 'z', 'ch', 'sh' → add 'es'
  // (status → statuses, box → boxes, church → churches)
  if (/(s|x|z|ch|sh)$/.test(lowerWord)) {
    return word + 'es'
  }

  // Words ending in 'o' preceded by a consonant → add 'es'
  // (hero → heroes, tomato → tomatoes)
  if (/[^aeiou]o$/.test(lowerWord)) {
    return word + 'es'
  }

  // Words ending in 'f' or 'fe' → change to 'ves'
  // (leaf → leaves, knife → knives)
  if (lowerWord.endsWith('f')) {
    return word.slice(0, -1) + 'ves'
  }
  if (lowerWord.endsWith('fe')) {
    return word.slice(0, -2) + 'ves'
  }

  // Default: add 's'
  return word + 's'
}
