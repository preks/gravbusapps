import React from 'react'
import { Building2, FileCheck, MapPin, UserCircle, Users } from 'lucide-react'
import type { AssignmentTarget } from '@/common/network/flows/FlowTemplateClient'

export type TargetField = keyof AssignmentTarget

export interface ResourceType {
  key: string
  field: TargetField
  label: string
  placeholder: string
  dataKey: string
  icon: React.ReactNode
}

export const RESOURCE_TYPES: ResourceType[] = [
  {
    key: 'people',
    field: 'users',
    label: 'People',
    placeholder: 'Search people...',
    dataKey: 'users',
    icon: <UserCircle className="gba:w-4 gba:h-4" />
  },
  {
    key: 'departments',
    field: 'organizationalUnits',
    label: 'Departments',
    placeholder: 'Search departments...',
    dataKey: 'organizationalUnits',
    icon: <Users className="gba:w-4 gba:h-4" />
  },
  {
    key: 'teams',
    field: 'matrixTeams',
    label: 'Teams',
    placeholder: 'Search teams...',
    dataKey: 'matrixTeams',
    icon: <Users className="gba:w-4 gba:h-4" />
  },
  {
    key: 'companies',
    field: 'companies',
    label: 'Companies',
    placeholder: 'Search companies...',
    dataKey: 'companies',
    icon: <Building2 className="gba:w-4 gba:h-4" />
  },
  {
    key: 'costCenters',
    field: 'costCenters',
    label: 'Cost Centers',
    placeholder: 'Search cost centers...',
    dataKey: 'costCenters',
    icon: <Building2 className="gba:w-4 gba:h-4" />
  },
  {
    key: 'locations',
    field: 'siteLocations',
    label: 'Locations',
    placeholder: 'Search locations...',
    dataKey: 'siteLocations',
    icon: <MapPin className="gba:w-4 gba:h-4" />
  },
  {
    key: 'capabilities',
    field: 'capabilities',
    label: 'Capabilities',
    placeholder: 'Search capabilities...',
    dataKey: 'capabilities',
    icon: <FileCheck className="gba:w-4 gba:h-4" />
  }
]

export type ResourceTypeKey =
  | 'people'
  | 'departments'
  | 'teams'
  | 'companies'
  | 'costCenters'
  | 'locations'
  | 'capabilities'
