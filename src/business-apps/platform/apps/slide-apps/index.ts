/**
 * Slide Apps - Presentation slide decks
 *
 * Create and manage slide decks with live collaboration (Yjs) via document-service.
 * Spectacle-based editor fully integrated.
 */

export { SlidesAppsHub } from './SlidesAppsHub'
export { SlidesApiService } from './services'
export {
  useSlides,
  useSlidesHubUrlState,
  useSlidesHubFavorites,
  useSlidesHubFiltering,
  useSlidesHubUserLookup
} from './hooks'
export { SlideEditor, ShareSlideDialog, ManageSharesDialog, PresentMode, VersionHistoryPanel } from './components'
export type { Slide, SlideSummary, SlidePermission } from './types'

export { SlidesAppsHub as default } from './SlidesAppsHub'
