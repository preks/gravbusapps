export const WORKSPACE_CHAT_RAIL_CLASS =
  'gba:w-full gba:max-w-[42rem] md:gba:max-w-[46rem] xl:gba:max-w-[56rem] 2xl:gba:max-w-[64rem]'

export const WORKSPACE_CHAT_GUTTER_CLASS = 'gba:px-4 sm:gba:px-6 lg:gba:px-8'

export const WORKSPACE_COMPOSER_OFFSET_CLASS = 'gba:pb-[9.75rem] sm:gba:pb-[11.5rem] lg:gba:pb-[12.5rem]'
/** Fixed bottom stack includes streaming island + composer while agent runs */
export const WORKSPACE_COMPOSER_STREAMING_ISLAND_OFFSET_CLASS = 'gba:pb-[20rem] sm:gba:pb-[22rem] lg:gba:pb-[23rem]'
export const WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS = 'gba:pb-[22rem] sm:gba:pb-[24rem] lg:gba:pb-[26rem]'

/** Bottom scroll sentinel: keeps scrollIntoView from stopping under the fixed composer-only stack */
export const WORKSPACE_END_SENTINEL_SCROLL_MARGIN_DEFAULT_CLASS =
  'gba:scroll-mb-[8rem] sm:gba:scroll-mb-[10rem] lg:gba:scroll-mb-[11rem]'

/** Bottom scroll sentinel: clears fixed composer + suggested follow-ups card */
export const WORKSPACE_END_SENTINEL_SCROLL_MARGIN_WITH_FOLLOWUPS_CLASS =
  'gba:scroll-mb-[19rem] sm:gba:scroll-mb-[21rem] lg:gba:scroll-mb-[23rem]'

/** Bottom scroll sentinel: clears composer + streaming island */
export const WORKSPACE_END_SENTINEL_SCROLL_MARGIN_STREAMING_ISLAND_CLASS =
  'gba:scroll-mb-[17rem] sm:gba:scroll-mb-[19rem] lg:gba:scroll-mb-[20rem]'

// Sits above the right-panel header (overlay mode starts at `top-24`, desktop at `top-36`)
// so the panel-toggle button never collides with the panel chrome.
export const WORKSPACE_TOP_CONTROLS_OFFSET_CLASS = 'gba:top-4 sm:gba:top-5 lg:gba:top-6'

/**
 * Right padding applied to the chat rail wrappers (scroll region, clarification
 * modal, bottom composer stack) when the right panel is docked + open. Keeps
 * the rail from being centered under the floating right panel. Values track
 * `WORKSPACE_RIGHT_RAIL_WIDTH_CLASS` plus the panel's right gutter.
 */
export const WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS =
  'gba:pr-[calc(20rem+2rem)] xl:gba:pr-[calc(22rem+2.5rem)] 2xl:gba:pr-[calc(24rem+2.5rem)]'

/**
 * Wide variant used when the right panel is showing a live document/slide
 * canvas preview — tracks `WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_CLASS` plus the
 * panel's right gutter so the chat rail doesn't slide under the canvas.
 */
export const WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS =
  'gba:pr-[calc(32rem+2rem)] 2xl:gba:pr-[calc(38rem+2.5rem)]'

/** Smooth slide when the panel toggles so chat + composer + modal move as one unit. */
export const WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS = 'gba:transition-[padding] gba:duration-300 gba:ease-out'

export const WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS = 'gba:top-36 sm:gba:top-36 lg:gba:top-[9.5rem]'

/**
 * First-paint default: on viewports ≥ this width we open the right panel
 * automatically because there is room for chat + panel side-by-side. On
 * narrower screens we start closed and let the user toggle it on demand.
 *
 * The panel is always rendered the same way (small floating right rail, no
 * backdrop) — this threshold only controls the initial `isRightPanelOpen`
 * value, not any visual mode.
 */
export const WORKSPACE_RIGHT_RAIL_AUTO_OPEN_BREAKPOINT_PX = 1280

export const WORKSPACE_RIGHT_RAIL_WIDTH_CLASS = 'gba:w-[min(20rem,calc(100%-2rem))] xl:gba:w-[22rem] 2xl:gba:w-[24rem]'

export const WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_CLASS = 'gba:w-[min(32rem,calc(100%-2rem))] 2xl:gba:w-[38rem]'

/** Pixel widths for desktop flex-flow right panel (must match CSS classes above) */
export const WORKSPACE_RIGHT_RAIL_DEFAULT_WIDTH_PX = 320
export const WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_PX = 512
export const WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_2XL_PX = 608
