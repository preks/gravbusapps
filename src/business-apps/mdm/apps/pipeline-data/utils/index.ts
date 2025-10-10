/**
 * Converts a string to screaming snake case (e.g., "First Second" -> "FIRST_SECOND")
 * @param input - The input string to convert
 * @returns The converted string in screaming snake case
 */
export const convertToScreamingSnakeCase = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscores
    .toUpperCase() // Convert to uppercase
}
