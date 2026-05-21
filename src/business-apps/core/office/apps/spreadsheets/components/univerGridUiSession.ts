/**
 * Locale/menu labels read by module-level DOM helpers (MutationObserver callbacks).
 * Synced from `UniverSheetGrid` on each render via {@link syncUniverGridUiSession}.
 */
export type UniverGridMergeMenuLabels = { merge: string; unmerge: string }

type UniverGridUiSession = {
  appLocale: string
  mergeMenuLabels: UniverGridMergeMenuLabels
}

let session: UniverGridUiSession = {
  appLocale: 'en-US',
  mergeMenuLabels: { merge: 'Merge', unmerge: 'Unmerge' }
}

export function syncUniverGridUiSession(next: UniverGridUiSession): void {
  session = next
}

export function getUniverGridUiSession(): UniverGridUiSession {
  return session
}
