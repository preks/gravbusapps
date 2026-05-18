/**
 * Employee Import Configuration (HR)
 *
 * Declares the full target-field surface for HR Employee imports. The
 * dotted target paths mirror Flowbot's `Employee` synthetic-field surface
 * (`employee.*` / `assignment.*`) — see
 * `flowbot/src/api/routes/information_extraction.py::_EMPLOYEE_SYNTHETIC_IMPORT_FIELDS`.
 *
 * Catalog target fields (`employee.salutationRef`,
 * `employee.contractTypeRef`, `employee.employmentTypeRef`) are typed
 * `'catalog'` with the catalog identifiers consumed by Flowbot's enforced
 * policy. The remaining fields are plain `'direct'` — Flowbot's HR row
 * enricher handles name → UUID resolution for org-unit / site / company /
 * manager during extraction; the FE never sees those UUIDs separately.
 *
 * `enforcedSelects` is intentionally omitted from the MVP: HR admins set
 * Contract Type / Employment Type / Salutation per row via the file or via
 * later inline editing. We can add them later if a tenant needs forced
 * defaults at upload time.
 */

import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export const employeeImportConfig: ImportConfig = {
  entityType: 'employee',
  flowbotEntityType: 'Employee',
  domain: 'hr',
  targetFields: [
    // Identity
    { value: 'employee.code', label: 'Employee Code', type: 'direct', required: true },
    { value: 'employee.firstName', label: 'First Name', type: 'direct', required: true },
    { value: 'employee.lastName', label: 'Last Name', type: 'direct', required: true },
    { value: 'employee.preferredName', label: 'Preferred Name', type: 'direct' },
    { value: 'employee.salutationRef', label: 'Salutation', type: 'catalog', catalog: 'Salutation' },
    {
      value: 'employee.academicTitleRef',
      label: 'Academic Title',
      type: 'catalog',
      catalog: 'AcademicTitle'
    },

    // Communication
    { value: 'employee.workEmail', label: 'Work Email', type: 'direct', required: true },
    { value: 'employee.workPhone', label: 'Work Phone', type: 'direct' },
    { value: 'employee.workMobile', label: 'Work Mobile', type: 'direct' },

    // Working condition
    { value: 'employee.hireDate', label: 'Hire Date', type: 'direct' },
    { value: 'employee.exitDate', label: 'Exit Date', type: 'direct' },
    {
      value: 'employee.contractTypeRef',
      label: 'Contract Type',
      type: 'catalog',
      catalog: 'ContractType'
    },
    {
      value: 'employee.employmentTypeRef',
      label: 'Employment Type',
      type: 'catalog',
      catalog: 'EmploymentType'
    },

    // Assignment (orgchart). Names are forwarded to BE; Flowbot resolves
    // organizational unit / site location / company / manager to UUIDs
    // server-side.
    {
      value: 'assignment.organizationalUnitName',
      label: 'Organizational Unit',
      type: 'direct',
      required: true
    },
    { value: 'assignment.jobPositionName', label: 'Job Position', type: 'direct' },
    { value: 'assignment.managerCode', label: 'Manager Code', type: 'direct' },
    { value: 'assignment.managerName', label: 'Manager Name', type: 'direct' },
    { value: 'assignment.siteLocationName', label: 'Site Location', type: 'direct' },
    { value: 'assignment.companyName', label: 'Company', type: 'direct' },
    { value: 'assignment.role', label: 'Role', type: 'direct' }
  ]
}
