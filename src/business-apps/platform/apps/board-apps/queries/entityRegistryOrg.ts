/**
 * Entity registry (organization): Departments, Matrix Teams, Capabilities,
 * Legal Entities, Site Locations, Cost Centers, and Job Positions.
 *
 * Field definitions MUST match exactly what the corresponding query requests.
 */

import type { EntityFieldDef, EntityQueryDef } from './entityQueries'
import { JOB_POSITION_QUERY } from './graphql'
import {
  ORGANIZATIONAL_UNIT_QUERY,
  MATRIX_UNIT_QUERY,
  CAPABILITY_QUERY,
  COMPANY_QUERY,
  SITE_LOCATION_QUERY,
  COST_CENTER_QUERY
} from './graphqlOrg'

type F = EntityFieldDef
const f = (key: string, label: string, type: F['type'], defaultVisible: boolean, path: string): F => ({
  key,
  label,
  type,
  defaultVisible,
  path
})

export const ENTITY_REGISTRY_ORG: Record<string, EntityQueryDef> = {
  OrganizationalUnit: {
    displayName: 'Departments',
    description: 'Organizational units and departments',
    category: 'organization',
    needsStructureFilter: true,
    query: ORGANIZATIONAL_UNIT_QUERY,
    entityKey: 'OrganizationalUnit',
    aggregateKey: 'OrganizationalUnitAggregate',
    boolExpType: 'OrganizationalUnitBoolExp',
    orderByType: 'OrganizationalUnitOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('code', 'Code', 'text', false, 'code'),
      f('type', 'Type', 'text', true, 'type'),
      f('description', 'Description', 'text', false, 'description'),
      f('companyName', 'Company', 'text', true, 'company.name'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  MatrixUnit: {
    displayName: 'Matrix Teams',
    description: 'Cross-functional matrix teams',
    category: 'organization',
    needsStructureFilter: true,
    query: MATRIX_UNIT_QUERY,
    entityKey: 'MatrixUnit',
    aggregateKey: 'MatrixUnitAggregate',
    boolExpType: 'MatrixUnitBoolExp',
    orderByType: 'MatrixUnitOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('description', 'Description', 'text', true, 'description'),
      f('rank', 'Rank', 'number', false, 'rank'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Capability: {
    displayName: 'Capabilities',
    description: 'Organizational capabilities and skills',
    category: 'organization',
    needsStructureFilter: true,
    query: CAPABILITY_QUERY,
    entityKey: 'Capability',
    aggregateKey: 'CapabilityAggregate',
    boolExpType: 'CapabilityBoolExp',
    orderByType: 'CapabilityOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('description', 'Description', 'text', true, 'description'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Company: {
    displayName: 'Legal Entities',
    description: 'Companies and legal entities',
    category: 'organization',
    needsStructureFilter: true,
    query: COMPANY_QUERY,
    entityKey: 'Company',
    aggregateKey: 'CompanyAggregate',
    boolExpType: 'CompanyBoolExp',
    orderByType: 'CompanyOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('code', 'Code', 'text', false, 'code'),
      f('description', 'Description', 'text', false, 'description'),
      f('registrationNumber', 'Registration Number', 'text', false, 'commercialRegistrationNumber'),
      f('director', 'Director', 'text', true, 'director.displayName'),
      f('currency', 'Currency', 'text', false, 'currency.code'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  SiteLocation: {
    displayName: 'Site Locations',
    description: 'Office locations and sites',
    category: 'organization',
    needsStructureFilter: true,
    query: SITE_LOCATION_QUERY,
    entityKey: 'SiteLocation',
    aggregateKey: 'SiteLocationAggregate',
    boolExpType: 'SiteLocationBoolExp',
    orderByType: 'SiteLocationOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('code', 'Code', 'text', false, 'code'),
      f('locality', 'City', 'text', true, 'locality'),
      f('postalCode', 'Postal Code', 'text', false, 'postalCode'),
      f('country', 'Country', 'text', true, 'country.value'),
      f('region', 'Region', 'text', false, 'region.value'),
      f('deskCapacity', 'Desk Capacity', 'number', false, 'deskCapacity'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  CostCenter: {
    displayName: 'Cost Centers',
    description: 'Financial cost centers',
    category: 'organization',
    needsStructureFilter: true,
    query: COST_CENTER_QUERY,
    entityKey: 'CostCenter',
    aggregateKey: 'CostCenterAggregate',
    boolExpType: 'CostCenterBoolExp',
    orderByType: 'CostCenterOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('code', 'Code', 'text', true, 'code'),
      f('description', 'Description', 'text', false, 'description'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  JobPosition: {
    displayName: 'Job Positions',
    description: 'Organizational job positions',
    category: 'organization',
    needsStructureFilter: false,
    query: JOB_POSITION_QUERY,
    entityKey: 'JobPosition',
    aggregateKey: 'JobPositionAggregate',
    boolExpType: 'JobPositionBoolExp',
    orderByType: 'JobPositionOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('profile', 'Profile', 'text', true, 'jobProfile.name'),
      f('function', 'Function', 'text', true, 'jobFunction.name'),
      f('level', 'Level', 'text', true, 'jobLevel.name'),
      f('contractType', 'Contract Type', 'text', false, 'contractType.value'),
      f('employmentType', 'Employment Type', 'text', false, 'employmentType.value')
    ]
  }
}
