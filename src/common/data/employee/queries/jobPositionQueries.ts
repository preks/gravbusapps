import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { JobPositionFields } from '../types/jobPositionTypes'

export interface JobPositionQueryVariables extends BaseQueryVariables {
  structureId?: string
  vacant?: boolean
  jobFunctionId?: string
  jobProfileId?: string
  organizationalUnitId?: string
}

export const JOB_POSITION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['id', 'name'],
  list: ['id', 'name', 'jobFunction', 'jobProfile', 'jobLevel', 'contractType', 'employmentType'],
  record: [
    'id',
    'name',
    'activeTo',
    'jobFunction',
    'jobProfile',
    'jobLevel',
    'contractType',
    'employmentType',
    'employeePositions',
    'organizationalUnitEmployees'
  ]
}

const buildScalarFields = (fieldSet: Set<string>): string => {
  const scalarFields: string[] = []
  const scalarFieldNames = ['id', 'name', 'activeTo']

  scalarFieldNames.forEach(field => {
    if (fieldSet.has(field)) {
      scalarFields.push(field)
    }
  })

  return scalarFields.join('\n    ')
}

const buildEntityField = (
  fieldSet: Set<string>,
  field: string,
  fieldName: keyof typeof JobPositionFields,
  innerFields: string
): string => {
  return fieldSet.has(field)
    ? `
    ${fieldName} {
      ${innerFields}
    }`
    : ''
}

export const buildJobPositionFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityField(
      fieldSet,
      'jobFunction',
      JobPositionFields.jobFunction,
      `
      id
      name
      jobFamily {
        id
        code
        value
        catalogId
      }
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'jobLevel',
      JobPositionFields.jobLevel,
      `
      id
      name
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'jobProfile',
      JobPositionFields.jobProfile,
      `
      id
      name
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'contractType',
      JobPositionFields.contractType,
      `
      id
      code
      value
      catalogId
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'employmentType',
      JobPositionFields.employmentType,
      `
      id
      code
      value
      catalogId
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'employeePositions',
      JobPositionFields.employeePositions,
      `
      employeeId
      firstName
      lastName
      employee {
        pictureThumbnail
      }
    `
    )}
    
    ${buildEntityField(
      fieldSet,
      'organizationalUnitEmployees',
      JobPositionFields.organizationalUnitEmployees,
      `
      organizationalUnit {
        id
        name
      }
    `
    )}
  `
}
