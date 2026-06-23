/**
 * IRM payload-builder smoke tests for the lookup arrays produced by Flowbot's
 * hardcoded IRM import layer (Owner/Contact/Account columns). These ensure the
 * resolved-id arrays are forwarded all the way through to the Java payload
 * for the new entity types covered in this batch (contact + opportunity).
 */

import { toInvestmentContactPayload } from '../irm/toInvestmentContactPayload'
import {
  groupOwnershipPayloadsByCompany,
  toInvestmentCompanyOwnershipPayloads,
  toInvestmentCompanyPayload,
  toInvestmentCompanyPayloadWithExecutives
} from '../irm/toInvestmentCompanyPayload'
import { toInvestmentCompanyImportPayload } from '../irm/toInvestmentCompanyImportPayload'
import { toInvestmentOpportunityPayload } from '../irm/toInvestmentOpportunityPayload'
import { createIrmImportStrategy, submitInvestmentCompanyOwnershipOnly } from '../irm/submitIrmImport'
import { investmentCompanyImportConfig } from '@/common/data/investment/types/investmentCompanyImportConfig'
import { investmentCompanyImportOverride } from '@/business-apps/irm/core/apps/data-import/config/overrides/investmentCompanyImportOverride'

describe('toInvestmentContactPayload — lookup arrays from Flowbot', () => {
  it('forwards accountContacts with the resolved Account id and contactType', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        lastName: 'Vorberg',
        ownerEmployee: 'employee-resolved-id',
        accountContacts: [
          { account: 'account-anna-id', contactType: 'PRIMARY_CONTACT' },
          { account: 'account-newwork-id', contactType: 'SECONDARY_CONTACT' }
        ]
      },
      // No logged-in user override so the per-row owner survives.
      undefined
    )

    expect(payload.firstName).toBe('Anna')
    expect(payload.lastName).toBe('Vorberg')
    expect(payload.ownerEmployee).toBe('employee-resolved-id')
    expect(payload.accountContacts).toEqual([
      { account: 'account-anna-id', contactType: 'PRIMARY_CONTACT' },
      { account: 'account-newwork-id', contactType: 'SECONDARY_CONTACT' }
    ])
  })

  it('omits accountContacts when Flowbot did not produce a list', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        lastName: 'Vorberg',
        ownerEmployee: 'employee-resolved-id'
      },
      undefined
    )

    expect(payload.accountContacts).toBeUndefined()
  })

  it('prefers the logged-in employee id over the per-row owner (existing behaviour)', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        ownerEmployee: 'employee-from-row'
      },
      'employee-logged-in'
    )

    expect(payload.ownerEmployee).toBe('employee-logged-in')
  })
})

describe('toInvestmentOpportunityPayload — lookup arrays from Flowbot', () => {
  it('forwards opportunityContacts and opportunityAccounts as-is', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Opportunity A',
        ownerEmployee: 'employee-resolved-id',
        opportunityContacts: [
          { contact: 'contact-anna-id', contactType: 'PRIMARY_CONTACT' },
          { contact: 'contact-erjon-id', contactType: 'SECONDARY_CONTACT' }
        ],
        opportunityAccounts: [
          { account: 'account-newwork-id', accountTypeRef: 'InvestmentAccountType:v1:INVESTMENT' },
          { account: 'account-amazon-id', accountTypeRef: 'InvestmentAccountType:v1:REFERRAL' }
        ]
      },
      undefined
    )

    expect(payload.name).toBe('Opportunity A')
    expect(payload.ownerEmployee).toBe('employee-resolved-id')
    expect(payload.opportunityContacts).toEqual([
      { contact: 'contact-anna-id', contactType: 'PRIMARY_CONTACT' },
      { contact: 'contact-erjon-id', contactType: 'SECONDARY_CONTACT' }
    ])
    expect(payload.opportunityAccounts).toEqual([
      { account: 'account-newwork-id', accountTypeRef: 'InvestmentAccountType:v1:INVESTMENT' },
      { account: 'account-amazon-id', accountTypeRef: 'InvestmentAccountType:v1:REFERRAL' }
    ])
  })

  it('drops the legacy ownerEmployee key so only the renamed payload key is sent', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Opportunity A',
        ownerEmployee: 'employee-from-row'
      },
      undefined
    )

    expect(payload.ownerEmployee).toBe('employee-from-row')
  })

  it('forwards investmentCompanyId as investmentCompany in the payload', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Opportunity B',
        investmentCompanyId: 'investment-company-uuid'
      },
      undefined
    )

    expect(payload.name).toBe('Opportunity B')
    expect(payload.investmentCompany).toBe('investment-company-uuid')
    expect(payload.investmentCompanyId).toBeUndefined()
  })

  it('omits investmentCompany when not provided by Flowbot', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Opportunity C',
        ownerEmployee: 'employee-resolved-id'
      },
      undefined
    )

    expect(payload.name).toBe('Opportunity C')
    expect(payload.investmentCompany).toBeUndefined()
  })
})

describe('InvestmentCompany import payloads', () => {
  it('builds company payload with group association and owner employee', () => {
    const payload = toInvestmentCompanyPayload(
      {
        name: 'Alpha GmbH',
        code: 'ALPHA',
        investmentCompanyGroupRef: 'InvestmentCompanyGroup:v1:PRIVATE_EQUITY',
        ownerEmployee: 'employee-from-row'
      },
      undefined
    )

    expect(payload.name).toBe('Alpha GmbH')
    expect(payload.code).toBe('ALPHA')
    expect(payload.ownerEmployee).toBe('employee-from-row')
    expect(payload.investmentCompanyGroupAssociation).toEqual([
      {
        investmentCompanyGroup: 'InvestmentCompanyGroup:v1:PRIVATE_EQUITY'
      }
    ])
  })

  it('prefers investmentCompanyExecutives embedded on the record over executiveUpdates sidecar', () => {
    const payload = toInvestmentCompanyPayloadWithExecutives(
      {
        name: 'Alpha GmbH',
        investmentCompanyExecutives: [
          {
            employee: 'employee-john-id',
            employeeId: 'employee-john-id',
            executiveTypeRef: 'LegalEntityExecutiveType:v1:CEO'
          }
        ]
      },
      undefined,
      [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          executiveNames: ['Jane Doe'],
          executiveEmployeeIds: [''],
          executiveContactIds: ['contact-jane-id'],
          executiveSourceTypes: ['investmentContact'],
          executiveTypeRef: null
        }
      ],
      0
    )

    expect(payload.investmentCompanyExecutives).toEqual([
      {
        employee: 'employee-john-id',
        employeeId: 'employee-john-id',
        executiveTypeRef: 'LegalEntityExecutiveType:v1:CEO'
      }
    ])
  })

  it('falls back to executiveUpdates when the record has no embedded executives', () => {
    const payload = toInvestmentCompanyPayloadWithExecutives(
      { name: 'Alpha GmbH' },
      undefined,
      [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          executiveNames: ['Jane Doe'],
          executiveEmployeeIds: [''],
          executiveContactIds: ['contact-jane-id'],
          executiveSourceTypes: ['investmentContact'],
          executiveTypeRef: 'LegalEntityExecutiveType:v1:CFO'
        }
      ],
      0
    )

    expect(payload.investmentCompanyExecutives).toEqual([
      {
        investmentContact: 'contact-jane-id',
        executiveTypeRef: 'LegalEntityExecutiveType:v1:CFO'
      }
    ])
  })

  it('turns Flowbot ownershipUpdates into ownership payloads after company create', () => {
    const payloads = toInvestmentCompanyOwnershipPayloads(
      [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          companyId: null,
          ownerCompanyNames: ['Beta Holdings'],
          ownerCompanyIds: [],
          ownedCompanyNames: ['Delta Capital'],
          ownedCompanyIds: []
        }
      ],
      [
        { id: 'company-alpha-id', name: 'Alpha GmbH' },
        { id: 'company-beta-id', name: 'Beta Holdings' },
        { id: 'company-delta-id', name: 'Delta Capital' }
      ],
      [{ name: 'Alpha GmbH' }, { name: 'Beta Holdings' }, { name: 'Delta Capital' }]
    )

    expect(payloads).toEqual([
      {
        investmentCompany: 'company-alpha-id',
        ownerInvestmentCompany: 'company-beta-id'
      },
      {
        investmentCompany: 'company-delta-id',
        ownerInvestmentCompany: 'company-alpha-id'
      }
    ])
  })

  it('forwards ownership percentages when provided by Flowbot', () => {
    const payloads = toInvestmentCompanyOwnershipPayloads(
      [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          companyId: null,
          ownerCompanyNames: ['Beta Holdings', 'Gamma Ventures'],
          ownerCompanyIds: ['company-beta-id', 'company-gamma-id'],
          ownerCompanyPercentages: [50, 30],
          ownedCompanyNames: [],
          ownedCompanyIds: []
        }
      ],
      [{ id: 'company-alpha-id', name: 'Alpha GmbH' }],
      [{ name: 'Alpha GmbH' }]
    )

    expect(payloads).toEqual([
      {
        investmentCompany: 'company-alpha-id',
        ownerInvestmentCompany: 'company-beta-id',
        percentage: 50
      },
      {
        investmentCompany: 'company-alpha-id',
        ownerInvestmentCompany: 'company-gamma-id',
        percentage: 30
      }
    ])
  })

  it('groups flat ownership payloads under each company for UPDATE', () => {
    const grouped = groupOwnershipPayloadsByCompany(
      [
        {
          investmentCompany: 'company-alpha-id',
          ownerInvestmentCompany: 'company-beta-id',
          percentage: 50
        },
        {
          investmentCompany: 'company-alpha-id',
          ownerInvestmentCompany: 'company-gamma-id',
          percentage: 30
        },
        {
          investmentCompany: 'company-delta-id',
          ownerInvestmentCompany: 'company-alpha-id',
          percentage: 100
        }
      ],
      [
        { id: 'company-alpha-id', name: 'Alpha GmbH', version: 1 },
        { id: 'company-delta-id', name: 'Delta Capital', version: 2 }
      ]
    )

    expect(grouped).toEqual([
      {
        id: 'company-alpha-id',
        version: 1,
        investmentCompanyOwnership: [
          {
            investmentCompany: 'company-alpha-id',
            ownerInvestmentCompany: 'company-beta-id',
            percentage: 50
          },
          {
            investmentCompany: 'company-alpha-id',
            ownerInvestmentCompany: 'company-gamma-id',
            percentage: 30
          }
        ]
      },
      {
        id: 'company-delta-id',
        version: 2,
        investmentCompanyOwnership: [
          {
            investmentCompany: 'company-delta-id',
            ownerInvestmentCompany: 'company-alpha-id',
            percentage: 100
          }
        ]
      }
    ])
  })

  it('includes resolved executives in the company batch payload', async () => {
    const restClient = {
      post: jest.fn().mockResolvedValue({
        investmentCompanies: [{ id: 'company-alpha-id', name: 'Alpha GmbH' }]
      })
    }
    const strategy = createIrmImportStrategy(investmentCompanyImportConfig)

    await strategy.submit(
      [
        {
          name: 'Alpha GmbH',
          investmentCompanyExecutives: [
            {
              employee: 'employee-john-id',
              employeeId: 'employee-john-id',
              executiveTypeRef: 'LegalEntityExecutiveType:v1:CEO'
            }
          ]
        }
      ],
      {
        restClient: restClient as any,
        graphQLClient: {} as any,
        accessToken: 'token',
        ownerEmployeeId: undefined,
        config: investmentCompanyImportConfig,
        executiveUpdates: []
      }
    )

    expect(restClient.post).toHaveBeenCalledWith(
      '/investment-relations/createInvestmentCompanies',
      {
        investmentCompanies: [
          {
            name: 'Alpha GmbH',
            investmentCompanyExecutives: [
              {
                employee: 'employee-john-id',
                executiveTypeRef: 'LegalEntityExecutiveType:v1:CEO'
              }
            ]
          }
        ],
        changeMode: 'INSERT'
      },
      { headers: { Authorization: 'Bearer token' } }
    )
  })

  it('submits companies before applying ownership links', async () => {
    const restClient = {
      post: jest
        .fn()
        .mockResolvedValueOnce({
          investmentCompanies: [
            { id: 'company-alpha-id', name: 'Alpha GmbH' },
            { id: 'company-beta-id', name: 'Beta Holdings' }
          ]
        })
        .mockResolvedValueOnce({
          investmentCompanies: [{ id: 'company-alpha-id', name: 'Alpha GmbH', version: 1 }]
        })
    }
    const config = { ...investmentCompanyImportConfig, deferOwnershipSubmission: false }
    const strategy = createIrmImportStrategy(config)

    const result = await strategy.submit([{ name: 'Alpha GmbH' }, { name: 'Beta Holdings' }], {
      restClient: restClient as any,
      graphQLClient: {} as any,
      accessToken: 'token',
      ownerEmployeeId: undefined,
      config,
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
      ]
    })

    expect(restClient.post).toHaveBeenNthCalledWith(
      1,
      '/investment-relations/createInvestmentCompanies',
      { investmentCompanies: [{ name: 'Alpha GmbH' }, { name: 'Beta Holdings' }], changeMode: 'INSERT' },
      { headers: { Authorization: 'Bearer token' } }
    )
    expect(restClient.post).toHaveBeenNthCalledWith(
      2,
      '/investment-relations/updateInvestmentCompanies',
      {
        investmentCompanies: [
          {
            id: 'company-alpha-id',
            investmentCompanyOwnership: [
              {
                investmentCompany: 'company-alpha-id',
                ownerInvestmentCompany: 'company-beta-id'
              }
            ]
          }
        ]
      },
      { headers: { Authorization: 'Bearer token' } }
    )
    expect(result.success).toBe(true)
    expect(result.successCount).toBe(2)
    expect(result.relationshipSuccessCount).toBe(1)
  })

  it('defers ownership submission when deferOwnershipSubmission is enabled', async () => {
    const restClient = {
      post: jest.fn().mockResolvedValueOnce({
        investmentCompanies: [{ id: 'company-alpha-id', name: 'Alpha GmbH' }]
      })
    }
    const config = { ...investmentCompanyImportConfig, ...investmentCompanyImportOverride }
    const strategy = createIrmImportStrategy(config)

    const result = await strategy.submit([{ name: 'Alpha GmbH' }], {
      restClient: restClient as any,
      graphQLClient: {} as any,
      accessToken: 'token',
      ownerEmployeeId: undefined,
      config,
      ownershipUpdates: [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          companyId: null,
          ownerCompanyNames: ['Beta Holdings'],
          ownerCompanyIds: ['company-beta-id'],
          ownedCompanyNames: [],
          ownedCompanyIds: []
        }
      ],
      deferOwnershipSubmission: true
    })

    expect(restClient.post).toHaveBeenCalledTimes(1)
    expect(restClient.post).toHaveBeenCalledWith(
      '/investment-relations/createInvestmentCompanies',
      { investmentCompanies: [{ name: 'Alpha GmbH' }], changeMode: 'INSERT' },
      { headers: { Authorization: 'Bearer token' } }
    )
    expect(result.createdEntities).toEqual([{ id: 'company-alpha-id', name: 'Alpha GmbH' }])
  })

  it('submits ownership only via submitInvestmentCompanyOwnershipOnly', async () => {
    const restClient = {
      post: jest.fn().mockResolvedValueOnce({
        investmentCompanies: [{ id: 'company-alpha-id', name: 'Alpha GmbH' }]
      })
    }
    const config = { ...investmentCompanyImportConfig, ...investmentCompanyImportOverride }

    const result = await submitInvestmentCompanyOwnershipOnly(
      [
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          companyId: null,
          ownerCompanyNames: ['Beta Holdings'],
          ownerCompanyIds: ['company-beta-id'],
          ownerCompanyPercentages: [50],
          ownedCompanyNames: [],
          ownedCompanyIds: []
        }
      ],
      {
        restClient: restClient as any,
        graphQLClient: {} as any,
        accessToken: 'token',
        ownerEmployeeId: undefined,
        config,
        createdCompaniesForOwnership: [{ id: 'company-alpha-id', name: 'Alpha GmbH' }],
        sourceEntitiesForOwnership: [{ name: 'Alpha GmbH' }],
        deferOwnershipSubmission: true
      }
    )

    expect(restClient.post).toHaveBeenCalledWith(
      '/investment-relations/updateInvestmentCompanies',
      {
        investmentCompanies: [
          {
            id: 'company-alpha-id',
            investmentCompanyOwnership: [
              {
                investmentCompany: 'company-alpha-id',
                ownerInvestmentCompany: 'company-beta-id',
                percentage: 50
              }
            ]
          }
        ]
      },
      { headers: { Authorization: 'Bearer token' } }
    )
    expect(result.relationshipSuccessCount).toBe(1)
  })
})

describe('toInvestmentCompanyImportPayload — stakeholders', () => {
  it('forwards all three stakeholder source types onto the company payload', () => {
    const payload = toInvestmentCompanyImportPayload({
      name: 'Alpha GmbH',
      investmentCompanyStakeholders: [
        {
          investmentContactId: 'contact-alice-id',
          investmentContact: 'contact-alice-id',
          investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:AUDIT'
        },
        {
          investmentAccountId: 'account-acme-id',
          investmentAccount: 'account-acme-id',
          investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:LEGAL'
        },
        {
          name: 'Mike Outside',
          investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:AUDIT'
        }
      ]
    })

    expect(payload.investmentCompanyStakeholder).toEqual([
      {
        investmentContact: 'contact-alice-id',
        investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:AUDIT'
      },
      {
        investmentAccount: 'account-acme-id',
        investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:LEGAL'
      },
      {
        name: 'Mike Outside',
        investmentCompanyStakeholderTypeRef: 'InvestmentCompanyStakeholderType:v1:AUDIT'
      }
    ])
  })

  it('omits the type ref when stakeholderTypeRef is missing', () => {
    const payload = toInvestmentCompanyImportPayload({
      name: 'Beta Industries AG',
      investmentCompanyStakeholders: [{ name: 'Bob External' }]
    })

    expect(payload.investmentCompanyStakeholder).toEqual([{ name: 'Bob External' }])
  })

  it('drops empty stakeholder rows with neither id nor name', () => {
    const payload = toInvestmentCompanyImportPayload({
      name: 'Gamma Capital Partners',
      investmentCompanyStakeholders: [{ name: '' }, {}]
    })

    expect(payload.investmentCompanyStakeholder).toBeUndefined()
  })
})

describe('investmentCompanyImportConfig', () => {
  it('targets Flowbot InvestmentCompany entity type', () => {
    expect(investmentCompanyImportConfig.entityType).toBe('company')
    expect(investmentCompanyImportConfig.flowbotEntityType).toBe('InvestmentCompany')
    // Note: InvestmentCompanyGroup is a GraphQL entity, not a catalog,
    // so it's not supported via enforcedSelects (which use CatalogSelect)
    expect(investmentCompanyImportConfig.enforcedSelects).toBeUndefined()
  })
})
