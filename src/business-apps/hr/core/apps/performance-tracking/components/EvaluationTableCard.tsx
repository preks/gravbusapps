import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

interface EvaluationTableCardProps {
  readonly testId: string
  readonly title: string
  readonly description: string
  readonly firstColumnHeader: string
  readonly emptyMessage: string
  readonly loading: boolean
  readonly error?: string | null
  readonly isEmpty: boolean
  readonly children: React.ReactNode
}

export const EvaluationTableCard: React.FC<EvaluationTableCardProps> = ({
  testId,
  title,
  description,
  firstColumnHeader,
  emptyMessage,
  loading,
  error,
  isEmpty,
  children
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:text-lg">{title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm">
            {error}
          </div>
        )}
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{firstColumnHeader}</TableHead>
                <TableHead>{t('table-reviewers')}</TableHead>
                <TableHead>{t('table-status')}</TableHead>
                <TableHead>{t('table-started')}</TableHead>
                <TableHead>{t('table-completed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:py-8 gba:text-center">
                    <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                  </TableCell>
                </TableRow>
              ) : isEmpty ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                children
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
