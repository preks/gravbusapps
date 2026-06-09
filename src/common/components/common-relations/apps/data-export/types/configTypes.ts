import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { ExportEntitySelectorItem } from '../components/ExportEntitySelectorPage'
import type { ExportFieldDefinition } from './exportFieldTypes'
import type { BuildLeadQueryVariablesOptions } from '@/common/components/common-relations/view-layouts/lead-layout/utils/buildLeadQueryVariables'

export interface ExportQueryParams {
  selectedFilters: Record<string, unknown>
  searchTerm?: string
  limit?: number
  offset?: number
}

export interface EntityExportDefinition<TEntity, TQueryVars> {
  entityType: string
  entityLabel: string
  sheetName: string
  filenamePrefix: string
  graphqlEntityName: string
  descriptors: Descriptor[]
  /** Descriptors for filter dropdown queries only; defaults to {@link descriptors}. */
  filterDescriptors?: Descriptor[]
  baseFilterConfig: FilterConfiguration
  exportFields: ExportFieldDefinition<TEntity>[]
  buildQueryVariables: (params: ExportQueryParams) => TQueryVars
  fetchPage: (vars: TQueryVars) => Promise<{ items: TEntity[]; total: number }>
  queryVariableOptions?: BuildLeadQueryVariablesOptions
}

export interface DataExportConfig {
  headerLabel: string
  headerDescription: string
  searchPlaceholder: string
  prefixDataTestId: string
  entityItems: ExportEntitySelectorItem[]
  entityViews: Record<string, React.ComponentType<BusinessAppContextProps & { onBack?: () => void }>>
  validEntityTypes: Set<string>
}
