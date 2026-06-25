import { extractWithRetry } from '../shared/extractWithRetry'
import { buildTargetFieldAdapters } from '../shared/targetFieldAdapters'
import { investmentCompanyImportConfig } from '@/common/data/investment/types/investmentCompanyImportConfig'
import { flowbotClient } from '@/common/network/flowbot'

jest.mock('@/common/network/flowbot', () => ({
  flowbotClient: {
    extractFromFile: jest.fn()
  }
}))

describe('extractWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forwards investment_company_group_ref for InvestmentCompany extracts', async () => {
    ;(flowbotClient.extractFromFile as jest.Mock).mockResolvedValue({
      records: [{ name: 'Alpha GmbH' }],
      warnings: [],
      ownershipUpdates: [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          companyId: null,
          ownerCompanyNames: ['Beta Holdings'],
          ownerCompanyIds: [],
          ownedCompanyNames: [],
          ownedCompanyIds: []
        }
      ],
      executiveUpdates: [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          executiveNames: ['John Smith'],
          executiveEmployeeIds: ['employee-john-id'],
          executiveContactIds: [''],
          executiveSourceTypes: ['employee'],
          executiveTypeRef: 'LegalEntityExecutiveType:v1:CEO'
        }
      ]
    })

    const result = await extractWithRetry(
      new File(['Name\nAlpha GmbH\n'], 'companies.csv', { type: 'text/csv' }),
      investmentCompanyImportConfig,
      [{ sourceField: 'Name', targetField: 'name', transformationType: 'direct' }],
      JSON.stringify({ investmentCompanyGroupRef: 'InvestmentCompanyGroup:v1:PRIVATE_EQUITY' }),
      buildTargetFieldAdapters(['name'], true),
      'auto'
    )

    expect(flowbotClient.extractFromFile).toHaveBeenCalledWith(
      'InvestmentCompany',
      expect.any(File),
      JSON.stringify({ fieldMappings: [{ sourceField: 'Name', targetField: 'name', transformationType: 'direct' }] }),
      JSON.stringify({ investmentCompanyGroupRef: 'InvestmentCompanyGroup:v1:PRIVATE_EQUITY' }),
      'investment',
      'default',
      0,
      5000,
      'auto',
      undefined,
      undefined,
      'InvestmentCompanyGroup:v1:PRIVATE_EQUITY'
    )
    expect(result.ownershipUpdates).toHaveLength(1)
    expect(result.executiveUpdates).toHaveLength(1)
  })
})
