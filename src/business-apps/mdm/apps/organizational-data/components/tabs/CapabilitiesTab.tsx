import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCapabilities } from '../../hooks/useCapabilities'
import {
  Card,
  CardContent,
  DataTable,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Icon,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import CardTabHeaderComponent from '../../../generic-components/card'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  ArrowsDownUpIcon,
  FileCodeIcon,
  InfoIcon,
  PencilSimpleLineIcon,
  EyeIcon,
  XCircleIcon,
  PlusIcon,
  UserIcon,
  TrendUpIcon,
  FilesIcon,
  ChartLineIcon
} from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import CapabilityForm from '@/business-apps/mdm/forms/capability-form'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface CapabilityExtended {
  id: string
  structureId: string
  name: string
  description?: string
  rankInLayer?: number
  layer: string
  rankInGroup?: number
  groupId?: string
}

export interface Capability {
  id: string
  name: string
  category: string
  description?: string
  structureId: string
  layerId: string
  groupId?: string
  groupName?: string
}

export interface CapabilityLayer {
  capabilities: Capability[]
  capabilityGroup: Capability[]
  createdAt: string
  description: string
  id: string
  name: string
  rank: number
  structureId: string
  updatedAt: string
}

export interface CapabilitiesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'CapabilitiesTab'

const CapabilitiesTab: React.FC<CapabilitiesTabProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(context.accessToken)

  const { capabilities, layers, isLoading, error, refetch, totalCount, structureId } = useCapabilities(context)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const filteredCapabilities = capabilities.filter(
    capability =>
      capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      capability.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (selectedCapability) {
      const updatedSelectedCapability = capabilities.find(capability => capability.id === selectedCapability.id)

      if (updatedSelectedCapability) {
        setSelectedCapability(updatedSelectedCapability)
      }
    }
  }, [capabilities, selectedCapability])

  const handleDelete = async (capability: Capability | undefined) => {
    if (!capability) return

    await orgchartClient.deleteCapability(capability.id, {
      headers: { Authorization: `Bearer ${context.accessToken}` }
    })

    refetch()
  }

  const handleView = (record: Capability | undefined) => {
    if (!record) return
    setSelectedCapability(record)
    setDrawerVisible(true)
  }

  const dataTable = useMemo(() => {
    return filteredCapabilities.map(capability => ({
      ...capability
    }))
  }, [filteredCapabilities])

  const renderCapabilitiesTable = () => {
    const columns: ColumnDef<Capability>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center gba:min-w-[300px]">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },

      {
        accessorKey: 'category',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Layer
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const layer = getValue()
          return layer ?? '-'
        }
      },

      {
        accessorKey: 'groupName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Capability Group
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const groupName = getValue()
          return groupName ?? '-'
        }
      },

      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Description
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = getValue()
          return description ?? '-'
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const targetCapability = capabilities.find(capability => capability.id === row.original.id)

          return (
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(targetCapability)}
                data-testid={`${dataTestId}-view-function-${row.original.id}`}
              >
                <EyeIcon className="gba:h-4 gba:w-4" />
              </Button>

              <CapabilityForm
                childAddButton={
                  <Button
                    variant="ghost"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId || ''}-CapabilitiesTab-EditButton`}
                  >
                    <PencilSimpleLineIcon />
                  </Button>
                }
                structureId={structureId}
                refetch={refetch}
                accessToken={context.accessToken}
                layers={layers}
                capability={targetCapability}
                isDrawerActive={true}
              />
              <DeleteButton
                onDelete={() => handleDelete(targetCapability)}
                itemName={targetCapability?.name ?? ''}
                itemTitle={'Capability'}
              />
            </div>
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

  const drawerItems = useMemo(() => {
    if (!selectedCapability) return []

    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedCapability.name ?? '-'
          },
          {
            label: 'Description',
            value: selectedCapability.description ?? '-'
          },
          {
            label: 'Layer',
            value: selectedCapability.category ?? '-'
          },
          {
            label: 'Capability Group',
            value: selectedCapability.groupName ?? '-'
          }
        ]
      }
    ]

    return items
  }, [selectedCapability])

  const navigationItems = useMemo(() => {
    if (!selectedCapability) return []

    const items = [
      {
        title: 'View Job Profiles',
        redirectLink: `/job-profiles?capabilityId=${selectedCapability.id}`,
        icon: UserIcon,
        color: 'blue',
        description: 'View job profiles with this capability'
      },
      {
        title: 'View Related Skills',
        redirectLink: `/skills?capabilityId=${selectedCapability.id}`,
        icon: TrendUpIcon,
        color: 'green',
        description: 'View skills associated with this capability'
      },
      {
        title: 'View Assessments',
        redirectLink: `/assessments?capabilityId=${selectedCapability.id}`,
        icon: FilesIcon,
        color: 'purple',
        description: 'View assessments related to this capability'
      },
      {
        title: 'Capability Trends',
        redirectLink: `/analytics/capability-trends?id=${selectedCapability.id}`,
        icon: ChartLineIcon,
        color: 'cyan',
        description: 'View capability adoption trends and metrics'
      }
    ]

    return items
  }, [selectedCapability])

  if (isLoading && capabilities.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Icon icon={XCircleIcon} />
            Error Loading Capabilities
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
    <Card data-testid={`${prefixDataTestId || ''}-CapabilitiesTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <CapabilityForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-add-capability`}
                >
                  <PlusIcon /> Add Capability
                </Button>
              }
              structureId={structureId}
              refetch={refetch}
              accessToken={context.accessToken}
              layers={layers}
            />
          }
          cardTitle={`${t('hr.capabilities', 'Capabilities')} (${totalCount})`}
          cardDescription="Manage capabilities and their details"
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search capabilities..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {renderCapabilitiesTable()}

        {selectedCapability && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedCapability(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Capability Details"
            titleIcon={FileCodeIcon}
            drawerItems={drawerItems}
            navigationItems={navigationItems}
            footerButtons={[
              <CapabilityForm
                childAddButton={
                  <Button data-testid={`${prefixDataTestId || ''}-CapabilitiesTab-EditButton`}>
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                structureId={structureId}
                refetch={refetch}
                accessToken={context.accessToken}
                layers={layers}
                capability={selectedCapability}
                isDrawerActive={true}
                key={selectedCapability.id}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CapabilitiesTab
export { CapabilitiesTab }
