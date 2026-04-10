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

export const WORKSPACE_TOP_CONTROLS_OFFSET_CLASS = 'gba:top-20 sm:gba:top-20 lg:gba:top-[5rem]'

export const WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS = 'gba:top-36 sm:gba:top-36 lg:gba:top-[9.5rem]'

export const WORKSPACE_RIGHT_RAIL_WIDTH_CLASS = 'gba:w-[min(22rem,calc(100%-2rem))] 2xl:gba:w-[24rem]'

/** Non-desktop right rail: clears fixed bottom composer (no follow-ups) */
export const WORKSPACE_RIGHT_RAIL_BOTTOM_DEFAULT_CLASS = 'gba:bottom-[10rem] sm:gba:bottom-[11.5rem]'

/** Non-desktop right rail: clears composer + follow-ups stack */
export const WORKSPACE_RIGHT_RAIL_BOTTOM_WITH_FOLLOWUPS_CLASS =
  'gba:bottom-[19rem] sm:gba:bottom-[21rem] lg:gba:bottom-[22rem]'

/** Non-desktop right rail: clears composer + streaming island */
export const WORKSPACE_RIGHT_RAIL_BOTTOM_STREAMING_ISLAND_CLASS =
  'gba:bottom-[18rem] sm:gba:bottom-[20rem] lg:gba:bottom-[21rem]'
