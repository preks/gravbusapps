// Export all account-record queries
export * from './getActivityByAccountId'
export * from './salesActivityQueries'
export * from './SalesTaskQueries'
export * from './CrmNoteQueries'
export * from './GetAccountByIdQueries'

// Default export for wrapper compatibility
import * as getActivityByAccountId from './getActivityByAccountId'
import * as salesActivityQueries from './salesActivityQueries'
import * as SalesTaskQueries from './SalesTaskQueries'
import * as CrmNoteQueries from './CrmNoteQueries'
import * as GetAccountByIdQueries from './GetAccountByIdQueries'

export default {
  ...getActivityByAccountId,
  ...salesActivityQueries,
  ...SalesTaskQueries,
  ...CrmNoteQueries,
  ...GetAccountByIdQueries
}
