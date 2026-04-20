import './pendingStartCallFromPlatform'

export { Chat } from './Chat'
export { ChatWithCalendar } from './ChatWithCalendar'
export { ChatWithCalendar as default } from './ChatWithCalendar'
export { Calendar } from './calendar/Calendar'

/**
 * IMPORTANT: Keep this entrypoint minimal.
 *
 * This file is used as the remote component entry when published to the platform.
 * Avoid broad `export *` re-exports or exporting modules with side-effects, as that
 * can introduce circular dependencies and TDZ ("Cannot access '<x>' before initialization")
 * errors in production-minified bundles.
 *
 * If you need additional exports for internal development, import directly from
 * the specific module instead of re-exporting here.
 */
