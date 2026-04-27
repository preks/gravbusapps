/**
 * Single source of truth for sidebar geometry. Importing siblings (the
 * workspace layout needs to know the sidebar width to offset its top-row
 * controls) read these constants instead of hard-coding values.
 */

export const SIDEBAR_EXPANDED_WIDTH_REM = 17.5
export const SIDEBAR_COLLAPSED_WIDTH_REM = 3.5

/** Tailwind arbitrary-value widths for the island wrapper. */
export const SIDEBAR_EXPANDED_WIDTH_CLASS = 'gba:w-[17.5rem]'
export const SIDEBAR_COLLAPSED_WIDTH_CLASS = 'gba:w-[3.5rem]'

/** Island outer offsets — small padding from top/bottom/left as requested. */
export const SIDEBAR_ISLAND_OFFSET_CLASS = 'gba:my-3 gba:ml-3 sm:gba:my-4 sm:gba:ml-4 lg:gba:my-5 lg:gba:ml-5'

/** Shared island chrome: radius, border, background, subtle shadow. */
export const SIDEBAR_ISLAND_SHELL_CLASS =
  'gba:rounded-[1.5rem] gba:border gba:border-border/75 gba:bg-card/98 gba:backdrop-blur-md gba:shadow-[0_8px_24px_rgba(15,23,42,0.045)]'

/** Width transition; kept short so it feels responsive. */
export const SIDEBAR_WIDTH_TRANSITION_CLASS = 'gba:transition-[width] gba:duration-200 gba:ease-out'

/** Below this viewport width the sidebar auto-collapses on first paint. */
export const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX = 1024

/** Left offset for the workspace top-row controls so they clear the sidebar. */
export const WORKSPACE_CONTENT_LEFT_OFFSET_EXPANDED_CLASS = 'gba:pl-[19.5rem]'
export const WORKSPACE_CONTENT_LEFT_OFFSET_COLLAPSED_CLASS = 'gba:pl-[5.5rem]'

/** localStorage key. Intentionally does NOT mention "fabric" (see plan). */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'enterpriseAgentSidebarCollapsed'

/** Per-section collapse prefs. Keyed by stable section id (e.g. "active", "recents"). */
export const SIDEBAR_SECTION_COLLAPSED_STORAGE_PREFIX = 'enterpriseAgentSidebarSectionCollapsed:'

/** Small-label typography shared by section headers inside the sidebar. */
export const SIDEBAR_SECTION_LABEL_CLASS =
  'gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground'

/**
 * Max height for the Active + Recents scroll regions. Tuned so ~4 rows are
 * visible at once — the rest scroll inside the section. Keeps vertical space
 * free for future sidebar entries (pinned agents, shortcuts, etc.).
 */
export const SIDEBAR_LIST_MAX_HEIGHT_CLASS = 'gba:max-h-[13.5rem]'
