import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import GenericInvestmentsList, { InvestmentListConfig } from '../shared/GenericInvestmentsList'
import { AcquisitionDateCell } from '../shared/cellRenderers'

/**
 * Real Estate-specific extra columns
 */
const extraColumns: ColumnDef<Investment>[] = [
  {
    id: 'acquisitionDate',
    header: 'Acquisition Date',
    accessorKey: 'acquisitionDate',
    size: 150,
    minSize: 130,
    maxSize: 180,
    enableResizing: false,
    meta: {
      type: 'date' as const
    },
    cell: AcquisitionDateCell
  }
]

/**
 * Configuration for Real Estate investments list
 */
const config: InvestmentListConfig = {
  investmentGroup: 'REAL_ESTATE',
  dataTestIdPrefix: 'real-estate-investment',
  defaultTypeLabel: 'Unknown',
  fromSubView: 'real-estate',
  extraColumns,
  emptyMessage: 'No real estate investments found'
}

/**
 * Props for RealEstateInvestmentsList
 */
export interface RealEstateInvestmentsListProps extends BusinessAppContextProps {
  data: Investment[]
  loading?: boolean
  error?: string | null
  totalCount: number
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  visibleColumns?: string[]
}

/**
 * Real Estate investments list component
 * Thin wrapper around GenericInvestmentsList with Real Estate specific configuration
 */
const RealEstateInvestmentsList: React.FC<RealEstateInvestmentsListProps> = props => {
  return <GenericInvestmentsList {...props} config={config} />
}

export default RealEstateInvestmentsList
