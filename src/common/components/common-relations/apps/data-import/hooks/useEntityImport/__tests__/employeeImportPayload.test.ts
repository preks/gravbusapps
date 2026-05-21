/**
 * Smoke tests for the HR (employee) import submission strategy and config.
 *
 * Covers:
 *  - The strategy POSTs the canonical `{ employees, createUser }` body to the
 *    BE endpoint constant and threads the `Authorization` header through.
 *  - The strategy maps `employeeCodesAndIds` from the BE response into the
 *    universal `ImportResult.createdIds` shape consumed by the core hook.
 *  - The strategy normalizes a "not-found" / not-yet-deployed BE endpoint
 *    error into a user-friendly message.
 *  - `employeeImportConfig` exposes the full target-field surface expected by
 *    Flowbot's HR Employee profile so the LLM mapping step has stable
 *    targets to bind to.
 */

import { createHrImportStrategy, HR_EMPLOYEE_IMPORT_ENDPOINT } from '../hr/submitHrImport'
import { employeeImportConfig } from '@/common/data/hr/types/employeeImportConfig'
import type { ImportSubmissionContext } from '../types'

function makeCtx(post: jest.Mock): ImportSubmissionContext {
  return {
    restClient: { post } as unknown as ImportSubmissionContext['restClient'],
    graphQLClient: {} as unknown as ImportSubmissionContext['graphQLClient'],
    accessToken: 'token-123',
    ownerEmployeeId: undefined,
    config: employeeImportConfig
  }
}

describe('createHrImportStrategy.submit', () => {
  it('posts the canonical employees payload to the BE endpoint constant', async () => {
    const post = jest.fn().mockResolvedValue({
      employeeCodesAndIds: { 'E-001': 'uuid-1' }
    })
    const strategy = createHrImportStrategy(employeeImportConfig)
    const employees = [
      {
        employee: {
          code: 'E-001',
          firstName: 'Alice',
          lastName: 'Anderson',
          communication: [
            {
              purpose: 'INTERNAL',
              channelRef: 'CommunicationChannel:v1:e-mail',
              value: 'alice@example.com'
            }
          ]
        },
        assignment: {
          organizationalUnitName: 'Engineering',
          organizationalUnitId: 'ou-1'
        }
      }
    ]

    const result = await strategy.submit!(employees, makeCtx(post))

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      HR_EMPLOYEE_IMPORT_ENDPOINT,
      { employees, createUser: true },
      { headers: { Authorization: 'Bearer token-123' } }
    )
    expect(result.success).toBe(true)
    expect(result.successCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(result.createdIds).toEqual(['uuid-1'])
  })

  it('strips CRM/IRM ownership keys (ownerEmployee, salesCampaign) from each employee', async () => {
    const post = jest.fn().mockResolvedValue({ employeeCodesAndIds: {} })
    const strategy = createHrImportStrategy(employeeImportConfig)
    const employees = [
      {
        employee: { code: 'E-001', firstName: 'Alice' },
        assignment: { organizationalUnitName: 'Engineering' },
        ownerEmployee: 'owner-123',
        ownerEmployeeId: 'owner-id-456',
        salesCampaign: 'campaign-789'
      }
    ]

    await strategy.submit!(employees, makeCtx(post))

    const [, body] = post.mock.calls[0]
    expect(body.employees[0]).toEqual({
      employee: { code: 'E-001', firstName: 'Alice' },
      assignment: { organizationalUnitName: 'Engineering' }
    })
    expect(body.employees[0]).not.toHaveProperty('ownerEmployee')
    expect(body.employees[0]).not.toHaveProperty('ownerEmployeeId')
    expect(body.employees[0]).not.toHaveProperty('salesCampaign')
  })

  it('extracts errors from validationResponse when the BE rejects rows', async () => {
    const post = jest.fn().mockResolvedValue({
      validationResponse: {
        errors: [{ code: 'ASSIGNMENT_NOT_FOUND', detail: 'OU does not exist' }]
      }
    })
    const strategy = createHrImportStrategy(employeeImportConfig)

    const result = await strategy.submit!([{ employee: { code: 'E-001' }, assignment: {} }], makeCtx(post))

    expect(result.success).toBe(false)
    expect(result.errorCount).toBe(1)
    expect(result.errors?.[0].error).toContain('ASSIGNMENT_NOT_FOUND')
  })
})

describe('createHrImportStrategy.normalizeError', () => {
  it('surfaces a clearer message when the BE endpoint is not yet deployed', () => {
    const strategy = createHrImportStrategy(employeeImportConfig)
    const normalized = strategy.normalizeError?.(new Error('Endpoint not found'))
    expect(normalized).toMatch(/backend HR import endpoint is not yet available/i)
    expect(normalized).toContain(HR_EMPLOYEE_IMPORT_ENDPOINT)
  })

  it('falls back to undefined for unrelated errors', () => {
    const strategy = createHrImportStrategy(employeeImportConfig)
    expect(strategy.normalizeError?.(new Error('Unexpected'))).toBeUndefined()
  })
})

describe('employeeImportConfig', () => {
  const targetValues = employeeImportConfig.targetFields.map(field => field.value)

  it('declares the HR domain and Flowbot Employee entity type', () => {
    expect(employeeImportConfig.domain).toBe('hr')
    expect(employeeImportConfig.entityType).toBe('employee')
    expect(employeeImportConfig.flowbotEntityType).toBe('Employee')
  })

  it.each([
    'employee.code',
    'employee.firstName',
    'employee.lastName',
    'employee.workEmail',
    'employee.hireDate',
    'employee.contractTypeRef',
    'employee.employmentTypeRef',
    'employee.salutationRef',
    'assignment.organizationalUnitName',
    'assignment.jobPositionName',
    'assignment.managerCode',
    'assignment.managerName',
    'assignment.siteLocationName',
    'assignment.companyName',
    'assignment.role'
  ])('exposes target field %s', target => {
    expect(targetValues).toContain(target)
  })

  it('marks catalog fields with the correct catalog identifier', () => {
    const byValue = Object.fromEntries(employeeImportConfig.targetFields.map(field => [field.value, field]))
    expect(byValue['employee.salutationRef']).toMatchObject({ type: 'catalog', catalog: 'Salutation' })
    expect(byValue['employee.contractTypeRef']).toMatchObject({ type: 'catalog', catalog: 'ContractType' })
    expect(byValue['employee.employmentTypeRef']).toMatchObject({
      type: 'catalog',
      catalog: 'EmploymentType'
    })
  })

  it('marks the minimum required fields per the target catalogue', () => {
    const required = new Set(
      employeeImportConfig.targetFields.filter(field => field.required).map(field => field.value)
    )
    expect(required.has('employee.code')).toBe(true)
    expect(required.has('employee.firstName')).toBe(true)
    expect(required.has('employee.lastName')).toBe(true)
    expect(required.has('employee.workEmail')).toBe(true)
    expect(required.has('assignment.organizationalUnitName')).toBe(true)
  })
})
