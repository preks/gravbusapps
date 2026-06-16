/**
 * Resolve the user's "Show technical reasoning" preference.
 *
 * The flag lives in `UserPreferencesSettings.show_technical_reasoning` and is
 * surfaced only on dev tenants (via Developer Settings in `UserPreferences`).
 * It defaults to `false` for everyone, so production users always see the
 * friendly reasoning trail rendered from `user_facing_title` /
 * `user_facing_summary` on each reasoning step.
 *
 * When the preferences API is still loading (or the context provider has
 * not finished its initial fetch), the hook conservatively returns `false`
 * so the friendly view is the default chat experience.
 */
import { useUserPreferencesContext } from '../context/UserPreferencesContext'

export function useShowTechnicalReasoning(): boolean {
  const { preferences } = useUserPreferencesContext()
  return preferences?.settings?.show_technical_reasoning === true
}

export default useShowTechnicalReasoning
