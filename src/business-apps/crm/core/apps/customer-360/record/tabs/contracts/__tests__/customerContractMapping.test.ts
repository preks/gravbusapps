import { buildOfficeAssetUrl, mapContractAssignment } from '../customerContractMapping'

describe('customerContractMapping', () => {
  it('maps document-service contract assignments into Customer 360 contracts', () => {
    const contract = mapContractAssignment({
      assignment: {
        id: 'assignment-1',
        spaceId: 'space-1',
        assetId: 'doc-1',
        assetType: 'document',
        role: 'contract'
      },
      asset: {
        id: 'doc-1',
        type: 'document',
        name: 'Master Services Agreement',
        mimeType: 'application/vnd.newwork.document',
        fileSize: 1024,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z'
      },
      contractMetadata: {
        id: 'metadata-1',
        contractNumber: 'MSA-2026',
        contractType: 'msa',
        status: 'active',
        effectiveDate: '2026-01-01',
        signedDate: '2026-01-02',
        expiryDate: '2026-12-31',
        renewalDate: '2026-10-01',
        reminderDeadlineDate: '2026-09-01',
        terminationDate: '2026-11-30',
        noticePeriodDays: 30,
        nextReminder: {
          id: 'reminder-1',
          remindAt: '2026-08-01',
          title: 'Review renewal'
        }
      }
    })

    expect(contract).toMatchObject({
      id: 'assignment-1',
      assignmentId: 'assignment-1',
      spaceId: 'space-1',
      assetId: 'doc-1',
      assetType: 'document',
      name: 'Master Services Agreement',
      status: 'active',
      contractNumber: 'MSA-2026',
      contractType: 'msa',
      signedDate: '2026-01-02',
      expiryDate: '2026-12-31',
      reminderDeadlineDate: '2026-09-01',
      terminationDate: '2026-11-30',
      noticePeriodDays: 30,
      contractMetadataId: 'metadata-1',
      nextReminder: {
        id: 'reminder-1',
        dueDate: '2026-08-01',
        label: 'Review renewal'
      }
    })
  })

  it('does not treat contract metadata ids as assignment ids', () => {
    const contract = mapContractAssignment({
      id: 'metadata-1',
      asset: { id: 'doc-1', type: 'document', name: 'Contract' },
      contractMetadata: {
        id: 'metadata-1',
        status: 'active'
      }
    })

    expect(contract.assignmentId).toBeUndefined()
    expect(contract.id).toBe('doc-1')
    expect(contract.contractMetadataId).toBe('metadata-1')
  })

  it('builds Office URLs for editable document-service asset types', () => {
    expect(buildOfficeAssetUrl({ assetType: 'document', assetId: 'doc-1' })).toBe(
      '/platform/every-office/documents?docId=doc-1&view=editor&from=customer-360'
    )
    expect(buildOfficeAssetUrl({ assetType: 'spreadsheet_app', assetId: 'sheet-1' })).toBe(
      '/platform/every-office/spreadsheets?appId=sheet-1&view=viewer&from=customer-360'
    )
    expect(buildOfficeAssetUrl({ assetType: 'drive_file', assetId: 'file-1' })).toBe(
      '/platform/every-office/drive?fileId=file-1&from=customer-360'
    )
  })
})
