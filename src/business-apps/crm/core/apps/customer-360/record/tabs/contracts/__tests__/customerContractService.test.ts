import {
  assignContractAsset,
  deleteContractAssignment,
  FALLBACK_CONTRACT_CATALOGS,
  getContractCatalogs,
  listAccountContracts,
  updateContractMetadata,
  upsertContractMetadata
} from '../customerContractService'

const mockFetch = jest.fn()

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body)
  })
}

function mockErrorResponse(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body)
  })
}

describe('customerContractService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  it('loads contract catalogs from document-service', async () => {
    mockJsonResponse({
      statuses: ['draft', 'active'],
      contractTypes: ['base', 'nda']
    })

    await expect(getContractCatalogs('token')).resolves.toEqual({
      statuses: ['draft', 'active'],
      contractTypes: ['base', 'nda']
    })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/contract-catalogs'), expect.any(Object))
  })

  it('falls back when contract catalogs are empty', async () => {
    mockJsonResponse({ statuses: [], contractTypes: [] })

    await expect(getContractCatalogs('token')).resolves.toEqual(FALLBACK_CONTRACT_CATALOGS)
  })

  it('does not call the contracts aggregate endpoint when account space is missing', async () => {
    mockErrorResponse(404, { message: 'Space not found for dimension' })

    await expect(listAccountContracts('token', 'account-1')).resolves.toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/spaces/by-dimension?'), expect.any(Object))
  })

  it('sends only generic contract metadata fields', async () => {
    mockJsonResponse({})

    await upsertContractMetadata('token', 'assignment-1', {
      contractNumber: 'MSA-2026',
      contractType: 'base',
      status: 'active',
      effectiveDate: '2026-01-01',
      signedDate: '2026-01-02',
      expiryDate: '2026-12-31',
      renewalDate: '2026-10-01',
      reminderDeadlineDate: '2026-09-01',
      terminationDate: '2026-11-30',
      noticePeriodDays: 30
    })

    const [, options] = mockFetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({
      contractNumber: 'MSA-2026',
      contractType: 'base',
      status: 'active',
      effectiveDate: '2026-01-01',
      signedDate: '2026-01-02',
      expiryDate: '2026-12-31',
      renewalDate: '2026-10-01',
      reminderDeadlineDate: '2026-09-01',
      terminationDate: '2026-11-30',
      noticePeriodDays: 30
    })
  })

  it('updates metadata with PATCH against the assignment id endpoint', async () => {
    mockJsonResponse({})

    await updateContractMetadata('token', 'assignment-1', {
      contractNumber: '12312451',
      contractType: 'base',
      status: 'active',
      effectiveDate: '2026-06-13',
      signedDate: '2026-06-12',
      expiryDate: '2026-06-18',
      renewalDate: '2026-06-20',
      terminationDate: '2026-06-30',
      reminderDeadlineDate: '2026-06-10'
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/space-asset-assignments/assignment-1/contract-metadata')
    expect(options.method).toBe('PATCH')
  })

  it('does not build metadata URLs with missing assignment ids', async () => {
    await expect(updateContractMetadata('token', '', { status: 'active' })).rejects.toThrow('Assignment id missing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('deletes contract assignments by assignment id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: async () => ''
    })

    await deleteContractAssignment('token', 'assignment-1')

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/space-asset-assignments/assignment-1')
    expect(options.method).toBe('DELETE')
  })

  it('does not build delete URLs with missing assignment ids', async () => {
    await expect(deleteContractAssignment('token', '')).rejects.toThrow('Assignment id missing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('reads the assignment id from the backend assignment envelope', async () => {
    mockJsonResponse({
      assignment: {
        id: 'assignment-1',
        spaceId: 'space-1',
        assetType: 'document',
        assetId: 'doc-1',
        role: 'contract'
      },
      asset: { id: 'doc-1' }
    })

    await expect(
      assignContractAsset('token', {
        spaceId: 'space-1',
        assetType: 'document',
        assetId: 'doc-1'
      })
    ).resolves.toEqual({ id: 'assignment-1' })
  })

  it('fails before metadata submission when assignment response has no id', async () => {
    mockJsonResponse({ assignment: {}, asset: { id: 'doc-1' } })

    await expect(
      assignContractAsset('token', {
        spaceId: 'space-1',
        assetType: 'document',
        assetId: 'doc-1'
      })
    ).rejects.toThrow('assignment id')
  })
})
