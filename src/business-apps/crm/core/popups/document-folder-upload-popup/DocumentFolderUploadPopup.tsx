/**
 * CRM Document Folder Upload Popup — Wrapper
 *
 * Extracts the active record context from `additionalData` (lead / contact /
 * account / opportunity — CRM has no `investment`) and delegates all UI and
 * submit behaviour to the shared popup in
 * `src/common/components/common-relations/popups/document-folder-upload-popup`.
 *
 * Mirrors the wrapper pattern used by `DocumentPopup`: the common logic
 * lives in `/common`, and each app only owns the entity-extraction + app
 * config.
 *
 * Submits `{ documentTree: FolderUploadPayload }` which is the shape the
 * `saveCrmDocumentTree` Kogito task expects — its
 * `SaveCrmDocumentTreeModelInput` declares the wrapper field as
 * `documentTree` (whereas the IRM equivalent uses `investmentDocumentTree`).
 * Wired via the `customerFolderUpload` flow context.
 */

import React, { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  DocumentFolderUploadPopup as SharedDocumentFolderUploadPopup,
  type DocumentFolderUploadPopupProps as SharedProps
} from '@/common/components/common-relations/popups/document-folder-upload-popup'
import type { FolderUploadEntityIds } from '@/common/utils/folderUploadUtils'

export type CrmDocumentFolderUploadEntityType = 'account' | 'contact' | 'lead' | 'opportunity'

export interface DocumentFolderUploadPopupProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface CrmEntityContext {
  readonly entityType: CrmDocumentFolderUploadEntityType | ''
  readonly entityId: string
  readonly entityIds: FolderUploadEntityIds
}

function extractCrmEntityContext(additionalData: BusinessAppContextProps['additionalData']): CrmEntityContext {
  const ad = (additionalData as any) || {}
  const externalContext = ad?.externalContextData || {}
  const initialParameters =
    ad?.payload ||
    ad?.psi_taskPayload?.psi_initialParameters?.payload ||
    ad?.psi_taskPayload?.initialParameters?.payload ||
    {}
  const urlParams = new URLSearchParams(globalThis.location.search)

  const accountId =
    externalContext?.accountId ||
    ad?.accountId ||
    ad?.account ||
    initialParameters?.account ||
    urlParams.get('accountId') ||
    ''
  const contactId =
    externalContext?.contactId ||
    ad?.contactId ||
    ad?.contact ||
    initialParameters?.contact ||
    urlParams.get('contactId') ||
    ''
  const leadId =
    externalContext?.leadId || ad?.leadId || ad?.lead || initialParameters?.lead || urlParams.get('leadId') || ''
  const opportunityId =
    externalContext?.opportunityId ||
    ad?.opportunityId ||
    ad?.opportunity ||
    initialParameters?.opportunity ||
    urlParams.get('opportunityId') ||
    ''

  let entityType: CrmDocumentFolderUploadEntityType | '' = ''
  let entityId = ''

  if (accountId) {
    entityType = 'account'
    entityId = accountId
  } else if (contactId) {
    entityType = 'contact'
    entityId = contactId
  } else if (leadId) {
    entityType = 'lead'
    entityId = leadId
  } else if (opportunityId) {
    entityType = 'opportunity'
    entityId = opportunityId
  }

  const entityIds: FolderUploadEntityIds = {}
  if (accountId) entityIds.account = accountId
  if (contactId) entityIds.contact = contactId
  if (leadId) entityIds.lead = leadId
  if (opportunityId) entityIds.opportunity = opportunityId

  return { entityType, entityId, entityIds }
}

export const DocumentFolderUploadPopup: React.FC<DocumentFolderUploadPopupProps> = props => {
  const { additionalData } = props

  const { entityType, entityId, entityIds } = useMemo(() => extractCrmEntityContext(additionalData), [additionalData])

  const sharedProps: SharedProps = {
    ...props,
    entityType,
    entityId,
    entityIds,
    payloadKey: 'documentTree',
    'data-testid': 'crm-document-folder-upload-popup'
  }

  return <SharedDocumentFolderUploadPopup {...sharedProps} />
}

export default DocumentFolderUploadPopup
