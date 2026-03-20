/**
 * Every Office entry point
 *
 * The platform URL `/platform/every-office` is the public URL for "Desk".
 * This entry exists so the host can load the `url_every-office` screen key
 * while reusing the `DeskHub` implementation.
 */

export { DeskHub as default, DeskHub } from '../desk'
export type { DeskHubProps } from '../desk'
