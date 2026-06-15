import React from 'react'
import {
  Badge,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PaymentFrequency } from '../types/salaryTypes'

interface SalaryTableColumn {
  id: string
  label?: React.ReactNode
  className?: string
}

interface SalaryTableShellProps {
  children: React.ReactNode
  columns: SalaryTableColumn[]
  containerTestId: string
  emptyMessage: string
  isEmpty: boolean
  loading: boolean
  prefix: string
  tableTestId: string
}

interface SalaryActionCellProps {
  accessToken: string
  actionName: string
  prefix: string
  recordId: string
}

interface SalaryDateCellProps {
  date: string
  locale: string
}

interface SalaryStatusCellProps {
  activeLabelKey: string
  inactiveLabelKey: string
  isActive: boolean
}

export const SalaryTableShell: React.FC<SalaryTableShellProps> = ({
  children,
  columns,
  containerTestId,
  emptyMessage,
  isEmpty,
  loading,
  prefix,
  tableTestId
}) => (
  <Card data-testid={containerTestId}>
    <CardContent className="gba:p-0">
      {loading && (
        <div className="gba:flex gba:justify-center gba:p-4" data-testid={`${prefix}-loading`}>
          <Spinner />
        </div>
      )}
      <div className="gba:overflow-x-auto">
        <Table data-testid={tableTestId}>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column.id} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
      {isEmpty && !loading && (
        <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground" data-testid={`${prefix}-empty`}>
          {emptyMessage}
        </div>
      )}
    </CardContent>
  </Card>
)

export const SalaryActionCell: React.FC<SalaryActionCellProps> = ({ accessToken, actionName, prefix, recordId }) => (
  <TableCell>
    <AppActionButton
      data-testid={`${prefix}-update-${actionName}-button-${recordId}`}
      variant="secondary"
      contextsArray={[FlowContextName.entityContext]}
      externalContextData={{ entityId: recordId }}
      prefixDataTestId={`${prefix}-update-${actionName}`}
      accessToken={accessToken}
      emptyStateBehavior="disable"
      deferMainContextRequestsUntilClick
      onClick={event => event.stopPropagation()}
    />
  </TableCell>
)

export const SalaryFrequencyCell: React.FC<{ paymentFrequency: PaymentFrequency; prefix: string }> = ({
  paymentFrequency,
  prefix
}) => (
  <TableCell>
    <Badge variant="secondary" data-testid={`${prefix}-frequency-${paymentFrequency}`}>
      {paymentFrequency.replace('_', ' ')}
    </Badge>
  </TableCell>
)

export const SalaryDateCell: React.FC<SalaryDateCellProps> = ({ date, locale }) => (
  <TableCell>{new Date(date).toLocaleDateString(locale)}</TableCell>
)

export const SalaryStatusCell: React.FC<SalaryStatusCellProps> = ({ activeLabelKey, inactiveLabelKey, isActive }) => (
  <TableCell>
    <Badge variant={isActive ? 'success' : 'secondary'}>
      {isActive
        ? getTranslationFromI18nKeyAndLabel(activeLabelKey, 'Active')
        : getTranslationFromI18nKeyAndLabel(inactiveLabelKey, 'Inactive')}
    </Badge>
  </TableCell>
)
