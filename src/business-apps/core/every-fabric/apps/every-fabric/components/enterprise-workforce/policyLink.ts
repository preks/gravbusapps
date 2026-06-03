// Helpers for deep-linking Workforce policy references to the intranet
// (EveryPages) policy record they resolve to at run time.
//
// `buildPolicyDetailUrl` is re-exported from the agents picker so every
// surface points at the same `/platform/content/intranet/content-record`
// route. `isPolicyUuid` guards links so we only render them for refs that
// are real intranet ContentEntry uuids (legacy slug refs stay plain text).

import { buildPolicyDetailUrl, isPolicyUuid } from '../agents/AddPoliciesModal'

export { buildPolicyDetailUrl, isPolicyUuid }
