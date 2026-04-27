/**
 * Skill-id helpers shared by the right-rail surfaces (Decisions/Activity).
 *
 * Mirrors prompt-manager's `_humanise_skill_id` in
 * `src/api/routes/deep_agent/status_messages.py` so the UI label stays in
 * sync with the status line the backend emits on `skill_load` tool calls.
 */

/**
 * Convert a kebab/snake-case skill id to a Title Case display name.
 *
 * Examples:
 *   - "create-hook"      -> "Create Hook"
 *   - "babysit"          -> "Babysit"
 *   - "update_cursor"    -> "Update Cursor"
 */
export function humanizeSkillId(skillId: string | null | undefined): string {
  if (!skillId) return ''
  return skillId
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => (word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ')
}
