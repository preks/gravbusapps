import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  JobLevelVisualization as EnhancedJobLevel,
  JobLevelGroupVisualization as EnhancedJobLevelGroup,
  PayGradeVisualization as EnhancedPayGrade
} from '../../types'
import { useCompensationDataIntegration } from '../../hooks/useCompensationDataIntegration'
import {
  Card,
  CardContent,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { CardTabHeaderComponent } from '../../../generic-components/card/CardTabHeaderComponent'
import PayGradeForm from '@/business-apps/mdm/forms/pay-grade-form'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import JobLevelForm from '@/business-apps/mdm/forms/job-level-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { XCircleIcon, PlusIcon, PencilSimpleLineIcon } from '@phosphor-icons/react'

// Re-export types from integration hook for consistency
export type PayGrade = EnhancedPayGrade
export type JobLevelGroup = EnhancedJobLevelGroup
export type JobLevel = EnhancedJobLevel

export interface PayGradesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'PayGradesTab'

// Mock data removed - now using real data from useCompensationDataIntegration

const PayGradesTab: React.FC<PayGradesTabProps> = context => {
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use real data integration
  const { payGrades, jobLevelGroups, jobLevels, isLoading, error, refetch } = useCompensationDataIntegration(context)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const formatCurrency = (amount: number, currency?: { id: string; value: string } | string) => {
    let currencyCode = typeof currency === 'string' ? currency : currency?.id || 'EUR'

    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(':')) {
      const parts = currencyCode.split(':')
      currencyCode = parts[parts.length - 1] // Get the last part
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Memoize job levels lookup to prevent unnecessary recalculations
  const jobLevelsByPayGradeAndGroup = useMemo(() => {
    const lookup = new Map<string, EnhancedJobLevel[]>()

    jobLevels.forEach(jobLevel => {
      const key = `${jobLevel.payGradeId}-${jobLevel.jobLevelGroupId}`
      if (!lookup.has(key)) {
        lookup.set(key, [])
      }
      lookup.get(key)!.push(jobLevel)
    })

    return lookup
  }, [jobLevels])

  const getJobLevelsByPayGradeAndGroup = (payGradeId: string, groupId: string) => {
    const key = `${payGradeId}-${groupId}`
    return jobLevelsByPayGradeAndGroup.get(key) || []
  }

  const handleDeletePayGrade = async (payGrade: PayGrade) => {
    await restClient.post(
      '/employee/saveCompensationBand',
      {
        changeMode: 'DELETE',
        compensationBand: {
          id: payGrade.id,
          version: payGrade.version
        }
      },
      {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      }
    )

    await refetch()
  }

  // Memoize sorted data to prevent unnecessary re-renders
  const sortedPayGrades = useMemo(() => [...payGrades].sort((a, b) => a.minSalary - b.minSalary), [payGrades]) // Lowest grades first, will be at bottom with flex-reverse

  const sortedJobLevelGroups = useMemo(() => [...jobLevelGroups].sort((a, b) => a.order - b.order), [jobLevelGroups])

  if (sortedPayGrades.length === 0 && isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-PayGradesTab`}
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-PayGradesTab`} className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Data
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-PayGradesTab`}>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        <CardTabHeaderComponent
          addButton={
            <PayGradeForm
              prefixDataTestId={prefixDataTestId}
              accessToken={context.accessToken}
              refetch={refetch}
              childAddButton={
                <Button className="gba:flex gba:justify-center gba:items-center">
                  <PlusIcon /> Add Compensation Band
                </Button>
              }
              payGradeLevel={sortedPayGrades.length + 1}
            />
          }
          cardTitle="Pay Grade Overview"
          cardDescription="Pay grade distribution across career bands. Each row represents a
            pay grade level, showing which groups are assigned to each grade."
        />

        <CardContent className="gba:relative">
          {/* Matrix Rows */}
          <div className="gba:flex gba:flex-col-reverse gba:gap-1">
            {sortedPayGrades.map(payGrade => (
              <div
                key={payGrade.id}
                className="gba:flex gba:items-center gba:h-10 gba:px-4 gba:bg-white gba:border gba:border-gray-200 gba:rounded gba:group hover:gba:bg-gray-50"
              >
                {/* Pay Grade Label */}
                <div className="gba:w-40 gba:flex gba:items-center gba:justify-start gba:pr-4">
                  <div className="gba:text-sm gba:font-medium gba:text-gray-700 gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-1">
                    <span className="gba:truncate gba:flex-1" title={payGrade.name}>
                      {payGrade.name}
                    </span>
                    <div className="gba:flex gba:gap-1 gba:flex-shrink-0">
                      <PayGradeForm
                        prefixDataTestId={prefixDataTestId}
                        accessToken={context.accessToken}
                        refetch={refetch}
                        childAddButton={
                          <Button size="sm" variant="ghost" className="gba:!p-0 gba:h-6 gba:w-6">
                            <PencilSimpleLineIcon />
                          </Button>
                        }
                        payGradeLevel={payGrade.payGrade}
                        payGrade={payGrade}
                      />
                      <DeleteButton
                        onDelete={() => handleDeletePayGrade(payGrade)}
                        itemName={payGrade.name}
                        itemTitle="Pay Grade"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Level Group Cells */}
                <div className="gba:flex-1 gba:flex gba:justify-around gba:gap-2">
                  {sortedJobLevelGroups.map(group => {
                    const jobLevelsInCell = getJobLevelsByPayGradeAndGroup(payGrade.id, group.id)
                    const hasJobLevels = jobLevelsInCell.length > 0

                    return (
                      <div key={`${payGrade.id}-${group.id}`} className="gba:flex-1 gba:h-8 gba:flex gba:items-center">
                        {hasJobLevels ? (
                          <div className="gba:flex gba:gap-1 gba:w-full gba:h-full">
                            {jobLevelsInCell.map((jobLevel: EnhancedJobLevel) => (
                              <Tooltip key={jobLevel.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`${group.color} gba:rounded gba:flex-1 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-medium gba:transition-colors hover:gba:opacity-80`}
                                  >
                                    <span className="gba:text-center gba:leading-tight gba:drop-shadow-sm">
                                      {jobLevel.name}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <div className="gba:flex gba:flex-col gba:gap-0.5 gba:text-sm">
                                    <div className="gba:font-bold">{jobLevel.name}</div>
                                    <div>Pay Grade: {payGrade.name}</div>
                                    <div>Min: {formatCurrency(payGrade.minSalary, payGrade.currency)}</div>
                                    <div className="gba:font-bold">
                                      Std: {formatCurrency(payGrade.standardSalary, payGrade.currency)}
                                    </div>
                                    <div>Max: {formatCurrency(payGrade.maxSalary, payGrade.currency)}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <JobLevelForm
                            childAddButton={
                              <button
                                className="gba:w-full gba:h-full gba:bg-gray-200 gba:rounded gba:opacity-40 hover:gba:bg-gray-300 gba:transition-colors"
                                onClick={event => {
                                  event.stopPropagation()
                                }}
                                data-testid={`${dataTestId}-add-job-level-${payGrade.id}-${group.id}`}
                                title={`Add job level for ${group.name} in ${payGrade.name}`}
                              ></button>
                            }
                            refetch={refetch}
                            groupId={group.id}
                            accessToken={context.accessToken}
                            prefixDataTestId={dataTestId}
                            compensationBands={payGrades}
                            defaultValues={{
                              compensationBandId: payGrade.id
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Salary Range */}
                <div className="gba:w-48 gba:flex gba:items-center gba:justify-center gba:pl-4">
                  <div className="gba:text-xs gba:text-gray-600 gba:text-center">
                    <div className="gba:font-medium">
                      {formatCurrency(payGrade.minSalary, payGrade.currency)} -{' '}
                      {formatCurrency(payGrade.maxSalary, payGrade.currency)}
                    </div>
                    <div className="gba:text-gray-500">
                      Std: {formatCurrency(payGrade.standardSalary, payGrade.currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Labels */}
          <div className="gba:flex gba:items-center gba:mt-4 gba:px-4">
            <div className="gba:w-40"></div> {/* Empty space for pay grade column */}
            <div className="gba:flex-1 gba:flex gba:justify-around gba:gap-2">
              {sortedJobLevelGroups.map(group => (
                <div
                  key={group.id}
                  className="gba:flex-1 gba:text-center gba:text-sm gba:font-medium gba:text-gray-600"
                >
                  {group.name}
                </div>
              ))}
            </div>
            <div className="gba:w-48"></div> {/* Empty space for salary range column */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { PayGradesTab }
