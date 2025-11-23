/**
 * Central file path definitions for customer-related file uploads
 * Used across CRM forms and components
 *
 * CRITICAL: This is the ONLY place where file upload paths are defined.
 * Forms pass the entity ID, this returns the complete path.
 */

export const CustomerFilePaths = {
  /**
   * App name for all customer/CRM file uploads
   */
  APP_NAME: 'customerRelations' as const,

  /**
   * Access scope for customer file uploads (tenant-specific)
   */
  ACCESS_SCOPE: 'tenant' as const,

  /**
   * Get the upload folder path for a customer account picture
   * @param accountId - Account ID from the form (can be undefined for new accounts)
   * @returns Folder path for account pictures
   */
  getAccountPicturePath: (accountId: string | undefined): string => {
    const id = accountId || 'temp'
    return `/accounts/${id}/pictures`
  },

  /**
   * Get the upload folder path for a customer contact picture
   * @param contactId - Contact ID from the form (can be undefined for new contacts)
   * @returns Folder path for contact pictures
   */
  getContactPicturePath: (contactId: string | undefined): string => {
    const id = contactId || 'temp'
    return `/contacts/${id}/pictures`
  },

  /**
   * Get the upload folder path for a customer lead picture
   * @param leadId - Lead ID from the form (can be undefined for new leads)
   * @returns Folder path for lead pictures
   */
  getLeadPicturePath: (leadId: string | undefined): string => {
    const id = leadId || 'temp'
    return `/leads/${id}/pictures`
  },

  /**
   * Get the upload folder path for a customer account document
   * @param accountId - Account ID
   * @returns Folder path for account documents
   */
  getAccountDocumentPath: (accountId: string): string => {
    return `/accounts/${accountId}/documents`
  }
} as const
