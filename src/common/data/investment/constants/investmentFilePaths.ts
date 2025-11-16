/**
 * Central file path definitions for investment-related file uploads
 * Used across IRM forms and components
 *
 * CRITICAL: This is the ONLY place where file upload paths are defined.
 * Forms pass the entity ID, this returns the complete path.
 */

export const InvestmentFilePaths = {
  /**
   * App name for all investment/IRM file uploads
   */
  APP_NAME: 'irm' as const,

  /**
   * Access scope for investment file uploads (tenant-specific)
   */
  ACCESS_SCOPE: 'tenant' as const,

  /**
   * Get the upload folder path for an investment account picture
   * @param accountId - Account ID from the form (can be undefined for new accounts)
   * @returns Folder path for account pictures
   */
  getAccountPicturePath: (accountId: string | undefined): string => {
    const id = accountId || 'temp'
    return `/investment-accounts/${id}/pictures`
  },

  /**
   * Get the upload folder path for an investment contact picture
   * @param contactId - Contact ID from the form (can be undefined for new contacts)
   * @returns Folder path for contact pictures
   */
  getContactPicturePath: (contactId: string | undefined): string => {
    const id = contactId || 'temp'
    return `/investment-contacts/${id}/pictures`
  },

  /**
   * Get the upload folder path for an investment lead picture
   * @param leadId - Lead ID from the form (can be undefined for new leads)
   * @returns Folder path for lead pictures
   */
  getLeadPicturePath: (leadId: string | undefined): string => {
    const id = leadId || 'temp'
    return `/investment-leads/${id}/pictures`
  },

  /**
   * Get the upload folder path for an investment account document
   * @param accountId - Account ID
   * @returns Folder path for account documents
   */
  getAccountDocumentPath: (accountId: string): string => {
    return `/investment-accounts/${accountId}/documents`
  },

  /**
   * Get the upload folder path for an investment document
   * @param investmentId - Investment ID
   * @returns Folder path for investment documents
   */
  getInvestmentDocumentPath: (investmentId: string): string => {
    return `/investments/${investmentId}/documents`
  }
} as const
