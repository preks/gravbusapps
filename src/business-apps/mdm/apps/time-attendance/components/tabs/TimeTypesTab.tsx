import React, { useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  DataTable,
  CardDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from '@newwork/nw-design-system'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeSlashIcon,
  TrashIcon,
  EyeIcon,
  PencilSimpleLineIcon,
  WarningIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { useTimeTypesData } from '../../hooks/useTimeTypesData'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from '../DeleteDialog'
import { TransformedTimeType, TimeTypeEnum } from '../../types/time-types'
import TimeTypeForm from '@/business-apps/mdm/forms/time-attendance/TimeTypeForm'

export interface TimeTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'TimeTypes'

export const TimeTypesTab: React.FC<TimeTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Use real data from GraphQL (already transformed in hook)
  const { timeTypes, systemTimeTypes, loading, error, refetch } = useTimeTypesData({ accessToken })

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedTimeType, setSelectedTimeType] = useState<TransformedTimeType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateSystemTypesDialogOpen, setIsCreateSystemTypesDialogOpen] = useState(false)
  const [isCreatingSystemTypes, setIsCreatingSystemTypes] = useState(false)

  // Filter time types based on search term
  const filteredTimeTypes = useMemo(() => {
    if (!searchTerm.trim()) return timeTypes

    return timeTypes.filter(
      timeType =>
        timeType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        timeType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [timeTypes, searchTerm])

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return timeTypes.map(timeType => timeType.code)
  }, [timeTypes])

  // Check if we should show the create system types button
  // systemTimeTypes from hook already contains only missing system types (filtered)
  const shouldShowCreateSystemTypesButton = useMemo(() => {
    return systemTimeTypes.length > 0
  }, [systemTimeTypes])

  const dataTable = useMemo(() => filteredTimeTypes.map(project => project), [filteredTimeTypes])

  // Helper function to create sortable header
  const createSortableHeader = useCallback((label: string) => {
    return ({ column }: { column: any }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
      >
        {label}
      </Button>
    )
  }, [])

  // Generate headers from configuration
  const getHeader = useCallback(
    (i18nKey: string, fallback: string) => {
      return createSortableHeader(getTranslationFromI18nKeyAndLabel(i18nKey, fallback))
    },
    [createSortableHeader]
  )

  const renderTimeTypesTable = () => {
    const columns: ColumnDef<TransformedTimeType>[] = [
      {
        accessorKey: 'code',
        header: getHeader('master-data:forms.capability.fields.code.label', 'Code'),
        enableSorting: true,
        enableColumnFilter: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return code as string
        }
      },
      {
        accessorKey: 'name',
        header: getHeader('master-data:forms.capability.fields.name.label', 'Name'),
        enableSorting: false,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'type',
        header: getHeader('master-data:forms.department.fields.type.label', 'Type'),
        enableSorting: false,
        cell: ({ getValue }) => {
          const type = getValue() as 'System' | 'Custom' | 'Unknown'
          return <Badge variant={getTypeBadgeVariant(type)}>{type}</Badge>
        }
      },
      {
        accessorKey: 'visible',
        header: getHeader('flow:flow_launcher.visibility', 'Visibility'),
        enableSorting: false,
        cell: ({ getValue }) => {
          const visibility = getValue()
          return visibility ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />
        }
      },
      {
        id: 'actions',
        header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const targetTimeType = timeTypes.find(timeType => timeType.id === row.original.id)

          return (
            <>
              {targetTimeType?.type !== 'System' && (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <TimeTypeForm
                    childAddButton={
                      <Button variant="ghost" onClick={event => event.stopPropagation()}>
                        <PencilSimpleLineIcon />
                      </Button>
                    }
                    refetch={refetch}
                    accessToken={accessToken}
                    prefixDataTestId={prefixDataTestId}
                    timeType={targetTimeType as TransformedTimeType & { description: string }}
                    usedCodes={usedCodes}
                    key={targetTimeType?.id}
                  />

                  <Button
                    variant="ghost"
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedTimeType(targetTimeType ?? null)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              )}
            </>
          )
        }
      }
    ]

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        enableSorting
        enablePagination
        sorting={sorting}
        onSortingChange={setSorting}
      />
    )
  }

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Handle delete time type
  const handleDeleteTimeType = useCallback(
    async (timeType?: TransformedTimeType | null) => {
      if (!timeType) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteTimeType',
          {
            changeMode: 'DELETE',
            timeType: {
              id: timeType.id,
              version: timeType.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting time type:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedTimeType(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  // Handle create system time types
  const handleCreateSystemTimeTypes = useCallback(async () => {
    if (systemTimeTypes.length === 0) return

    setIsCreatingSystemTypes(true)

    try {
      // Create each system time type individually
      for (const systemType of systemTimeTypes) {
        await restClient.post(
          '/employee-time/createTimeType',
          {
            changeMode: 'INSERT',
            timeType: {
              code: systemType.code,
              name: systemType.label,
              type: TimeTypeEnum.TIME_TYPE_SYSTEM,
              visible: systemType.visible
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )
      }

      await refetch()
      setIsCreateSystemTypesDialogOpen(false)
    } catch (error) {
      console.error('Error creating system time types:', error)
    } finally {
      setIsCreatingSystemTypes(false)
    }
  }, [systemTimeTypes, restClient, accessToken, refetch])

  // Get badge variant for type
  const getTypeBadgeVariant = useCallback((type: 'System' | 'Custom' | 'Unknown') => {
    if (type === 'System') {
      return 'default'
    } else {
      return 'secondary'
    }
  }, [])

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.time_types.error_loading_time_types',
            'Error Loading Time Types'
          )}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card data-testid={formatDataTestId(dataTestId, 'table-card')}>
      {!loading && (
        <CardHeader className="gba:space-y-1.5 gba:p-3 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
            <div className="gba:flex gba:flex-col gba:gap-2 gba:h-full">
              <CardTitle className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.time_types.title', 'Time Types')} (
                {timeTypes.length})
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.description',
                  'Configure time categories for duration calculations and reporting.'
                )}
              </CardDescription>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {shouldShowCreateSystemTypesButton && (
                <Button
                  onClick={e => {
                    e.stopPropagation()
                    setIsCreateSystemTypesDialogOpen(true)
                  }}
                  data-testid={formatDataTestId(dataTestId, 'create-system-types-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                  variant="outline"
                >
                  <PlusIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.time_types.actions.create_system_types',
                    'Create System Time Types'
                  )}
                </Button>
              )}
              <TimeTypeForm
                childAddButton={
                  <Button
                    onClick={e => {
                      e.stopPropagation()
                    }}
                    data-testid={formatDataTestId(dataTestId, 'add-button')}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <PlusIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.time_types.actions.add',
                      'Add Time Type'
                    )}
                  </Button>
                }
                refetch={refetch}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                usedCodes={usedCodes}
              />
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
            <div className="gba:flex-1">
              <DebouncedInput
                value={searchTerm}
                onChange={handleSearch}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.actions.search_placeholder',
                  'Search time types...'
                )}
                icon={<MagnifyingGlassIcon size={16} />}
                data-testid={formatDataTestId(dataTestId, 'search-input')}
                className="gba:max-w-md"
              />
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              {`${filteredTimeTypes.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${timeTypes.length} ${getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.time_types.title',
                'time types'
              ).toLowerCase()}`}
            </div>
          </div>
          {renderTimeTypesTable()}
        </div>

        <DeleteDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={() => handleDeleteTimeType(selectedTimeType)}
          isDeleting={isDeleting}
          titleKey={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.time_types.actions.delete_title',
            'Delete Time Type'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.time_types.actions.delete_message',
            'Are you sure you want to delete this time type?'
          )}
        />

        <Dialog open={isCreateSystemTypesDialogOpen} onOpenChange={setIsCreateSystemTypesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <WarningIcon className="gba:text-warning" />
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.actions.create_system_time_types',
                  'Create System Time Types'
                )}
              </DialogTitle>
              <DialogDescription>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.actions.create_system_types_message',
                  `Are you sure you want to create all ${systemTimeTypes.length} missing system time types?`,
                  { systemTimeTypesCount: systemTimeTypes.length }
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isCreatingSystemTypes}>
                  {getTranslationFromI18nKeyAndLabel('master-data:forms.common.buttons.cancel', 'Cancel')}
                </Button>
              </DialogClose>
              <Button variant="default" onClick={handleCreateSystemTimeTypes} disabled={isCreatingSystemTypes}>
                {isCreatingSystemTypes
                  ? getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.time_types.actions.creating_system_types',
                      'Creating...'
                    )
                  : getTranslationFromI18nKeyAndLabel('master-data:forms.common.buttons.create', 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default TimeTypesTab
