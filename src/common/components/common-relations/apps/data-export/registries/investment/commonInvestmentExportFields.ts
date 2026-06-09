import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportBoolean,
  formatExportCatalog,
  formatExportDateValue,
  formatExportNumber,
  formatExportText,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import { formatInvestmentLinkedAccount } from './investmentExportFormatters'
import {
  buildCodeExportField,
  buildOwnerEmployeeIdExportField,
  buildRecordIdExportField
} from '../../utils/exportExternalIdFieldBuilders'

/** Core investment export fields aligned with list view and savable form fields. */
export function buildCommonInvestmentExportFields(): ExportFieldDefinition<Investment>[] {
  return [
    {
      key: 'name',
      label: 'Investment',
      formKeys: ['name'],
      defaultSelected: true,
      format: investment => formatExportText(investment.name)
    },
    {
      key: 'investmentGroup',
      label: 'Investment Group',
      formKeys: ['investmentGroupRef'],
      defaultSelected: true,
      format: investment => formatExportCatalog(investment.investmentGroup)
    },
    {
      key: 'investmentType',
      label: 'Investment Type',
      formKeys: ['investmentTypeRef'],
      defaultSelected: true,
      format: investment => formatExportCatalog(investment.investmentType)
    },
    {
      key: 'totalInvestmentAmount',
      label: 'Total Investment',
      formKeys: ['totalInvestmentAmount'],
      defaultSelected: true,
      format: investment => formatExportNumber(investment.totalInvestmentAmount)
    },
    {
      key: 'initialInvestmentAmount',
      label: 'Initial Investment Amount',
      formKeys: ['initialInvestmentAmount'],
      defaultSelected: false,
      format: investment => formatExportNumber(investment.initialInvestmentAmount)
    },
    {
      key: 'investmentMarketValue',
      label: 'Market Value',
      formKeys: ['investmentMarketValue'],
      defaultSelected: false,
      format: investment => formatExportNumber(investment.investmentMarketValue)
    },
    {
      key: 'currency',
      label: 'Currency',
      formKeys: ['currencyRef'],
      defaultSelected: true,
      format: investment => formatExportCatalog(investment.currency)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: investment => formatOwnerEmployee(investment.ownerEmployee)
    },
    {
      key: 'linkedAccount',
      label: 'Account',
      formKeys: ['investmentAccounts'],
      defaultSelected: true,
      format: investment => formatInvestmentLinkedAccount(investment)
    },
    {
      key: 'investmentStatus',
      label: 'Status',
      formKeys: ['investmentStatusRef'],
      defaultSelected: true,
      format: investment => formatExportCatalog(investment.investmentStatus)
    },
    {
      key: 'planedExit',
      label: 'Planned Exit',
      formKeys: ['planedExit'],
      defaultSelected: false,
      format: investment => formatExportBoolean(investment.planedExit)
    },
    {
      key: 'plannedExitDate',
      label: 'Planned Exit Date',
      formKeys: ['plannedExitDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: investment => formatExportDateValue(investment.plannedExitDate)
    },
    {
      key: 'acquisitionDate',
      label: 'Acquisition Date',
      formKeys: ['acquisitionDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: investment => formatExportDateValue(investment.acquisitionDate)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: investment => formatExportDateValue(investment.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: investment => formatExportDateValue(investment.updatedAt)
    },
    buildRecordIdExportField<Investment>('Investment ID'),
    buildCodeExportField<Investment>(),
    buildOwnerEmployeeIdExportField<Investment>()
  ]
}
