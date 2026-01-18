/**
 * Common pre-submit utilities for CRM and IRM forms
 * Handles file uploads and creator/author field setting
 */

import type { FileClient } from '@/common/network/files/FileClient'
import { uploadFiles, type FileEntity, type FileContext } from '@/common/utils/fileUtils'

export interface PreSubmitOptions {
  /** User info for setting creator/author fields */
  userInfo?: {
    id?: string
    employeeDetails?: {
      employeeId?: string
    }
  }
  /** File client for uploading files */
  fileClient: FileClient
  /** File context (ACTIVITY, NOTE, TASK) */
  fileContext: string
  /** App name constant */
  appName: string
  /** Function to get file entity from reference entity type */
  getFileEntityFromType: (entityType: any) => string
  /** Function to get reference entity type from form data */
  getReferenceEntityType: (data: any) => any
  /** Whether to set creator fields (true) or author fields (false) */
  useCreatorFields?: boolean
  /** Additional entity ID fields to check (e.g., investmentId for IRM) */
  additionalEntityIdFields?: string[]
}

/**
 * Common pre-submit handler for Activity, Note, and Task forms
 * Handles:
 * - Setting creator/author fields
 * - Uploading pending files
 * - Combining existing and new documents
 */
export const createFormPreSubmitHandler = (options: PreSubmitOptions) => {
  const {
    userInfo,
    fileClient,
    fileContext,
    appName,
    getFileEntityFromType,
    getReferenceEntityType,
    useCreatorFields = true,
    additionalEntityIdFields = []
  } = options

  return async (data: any) => {
    // Set creator/author fields if not present
    const employeeId = userInfo?.employeeDetails?.employeeId
    const userId = userInfo?.id

    if (useCreatorFields) {
      // Set _creatorEmployee object for payload builders that expect it
      if (userId && !data._creatorEmployee) {
        data._creatorEmployee = {
          userId: userId,
          ...(employeeId && { id: employeeId })
        }
      }

      // Also set individual fields for backward compatibility
      if (!data.creatorEmployeeId && employeeId) {
        data.creatorEmployeeId = employeeId
      }
      if (!data.creatorUserId && userId) {
        data.creatorUserId = userId
      }
    } else if (!data.authorEmployeeId && employeeId) {
      // Notes use authorEmployeeId instead of creatorEmployeeId
      data.authorEmployeeId = employeeId
    }

    // Upload pending files if any
    let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
    if (data._pendingFiles && data._pendingFiles.length > 0) {
      try {
        // Determine reference entity from form data
        // Check additional fields first (e.g., investmentId), then standard fields
        const findReferenceEntityId = (): string => {
          const additionalId = additionalEntityIdFields.map(field => data[field]).find(Boolean)
          if (additionalId) return additionalId
          if (data.accountId) return data.accountId
          if (data.contactId) return data.contactId
          if (data.leadId) return data.leadId
          if (data.opportunityId) return data.opportunityId
          return 'temp-' + Date.now()
        }
        const referenceEntityId = findReferenceEntityId()

        const referenceEntityType = getReferenceEntityType(data)
        const fileEntity = getFileEntityFromType(referenceEntityType) as FileEntity

        uploadedDocuments = await uploadFiles(
          data._pendingFiles,
          referenceEntityId,
          fileEntity,
          fileContext as FileContext,
          appName,
          fileClient
        )
      } catch (error) {
        console.error('Failed to upload files:', error)
        throw error
      }
    }

    // Combine existing documents (as objects with ID) and newly uploaded documents
    const existingDocumentsAsObjects = (data.documents || [])
      .filter((doc: any) => doc.id)
      .map((doc: any) => ({
        id: doc.id,
        version: doc.version
      }))

    const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

    // Return enhanced data with documents
    return {
      ...data,
      documents: allDocuments
    }
  }
}
