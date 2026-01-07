import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  ArrowsDownUpIcon,
  EyeIcon,
  InfoIcon,
  PencilSimpleLineIcon,
  XCircleIcon,
  PlusIcon,
  BankIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCostCenters } from '../../hooks'
import { CostCenter, CostCenterEmployeeTable, CostCenterOrganizationalUnitTable } from '../../types'
import { ColumnDef } from '@tanstack/react-table'
import {
  Accordion,
  Badge,
  Spinner,
  Card,
  CardContent,
  Input,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Icon,
  DataTable,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import CardTabHeaderComponent from '../../../generic-components/card'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { VerticalTableProps } from '../../../generic-components/table/VerticalTable'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import CostCenterForm from '@/business-apps/mdm/forms/cost-center-form'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface CostCentersTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'CostCentersTab'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

const CostCentersTab: React.FC<CostCentersTabProps> = context => {
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)

  const {
    costCenters,
    costCenterNodes,
    isLoading,
    error,
    refetch,
    totalCostCenters,
    structureId,
    getEmployees,
    getOrgUnits
  } = useCostCenters(context)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])
  const [costCenterData, setCostCenterData] = useState<
    Record<string, { employees: unknown[]; orgUnits: unknown[]; isLoading: boolean; error: string | null }>
  >({})

  const filteredCostCenters = costCenters.filter(
    costCenter =>
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (costCenter.siteLocationName && costCenter.siteLocationName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    if (selectedCostCenter) {
      const updatedSelectedCostCenter = costCenters.find(costCenter => costCenter.id === selectedCostCenter.id)

      if (updatedSelectedCostCenter) {
        setSelectedCostCenter(updatedSelectedCostCenter)
      }
    }
  }, [costCenters, selectedCostCenter])

  const loadCostCenterData = useCallback(
    async (costCenterId: string) => {
      // Check if data is already loaded or loading
      if (costCenterData[costCenterId]?.isLoading || costCenterData[costCenterId]?.employees.length > 0) {
        return
      }

      // Set loading state
      setCostCenterData(prev => ({
        ...prev,
        [costCenterId]: {
          employees: [],
          orgUnits: [],
          isLoading: true,
          error: null
        }
      }))

      try {
        // Load both employees and org units in parallel
        const [employeesResponse, orgUnitsResponse] = await Promise.all([
          getEmployees(costCenterId),
          getOrgUnits(costCenterId)
        ])

        setCostCenterData(prev => ({
          ...prev,
          [costCenterId]: {
            employees: Array.isArray(employeesResponse) ? employeesResponse : [],
            orgUnits: Array.isArray(orgUnitsResponse) ? orgUnitsResponse : [],
            isLoading: false,
            error: null
          }
        }))
      } catch (error) {
        setCostCenterData(prev => ({
          ...prev,
          [costCenterId]: {
            employees: [],
            orgUnits: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load data'
          }
        }))
      }
    },
    [getEmployees, getOrgUnits, costCenterData]
  )

  const handleRowClick = useCallback(
    (record: CostCenter) => {
      setSelectedCostCenter(record)
      setDrawerVisible(true)
      // Load data when opening drawer
      loadCostCenterData(record.id)
    },
    [loadCostCenterData]
  )

  const handleAccordionChange = useCallback(
    (value: string | string[]) => {
      setAccordionValue(value)

      // Load data for expanded cost centers
      const expandedIds = Array.isArray(value) ? value : [value]
      expandedIds.forEach(costCenterId => {
        if (costCenterId) {
          loadCostCenterData(costCenterId)
        }
      })
    },
    [loadCostCenterData]
  )

  const employeeDataTable = useCallback(
    (employees: CostCenterEmployeeTable[]) =>
      employees.map(employee => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        name: `${employee.firstName} ${employee.lastName}`,
        jobPosition: employee.jobPosition?.jobPositionName,
        organizationalUnit: employee.organizationalUnit?.organizationalUnitName
      })),
    []
  )

  const organizationalUnitDataTable = useCallback(
    (organizationalUnits: CostCenterOrganizationalUnitTable[]) =>
      organizationalUnits.map(organizationalUnit => ({
        id: organizationalUnit.id,
        name: organizationalUnit.name,
        type: organizationalUnit.type,
        description: organizationalUnit.description
      })),
    []
  )

  const handleDelete = useCallback(
    async (costCenter: CostCenter) => {
      if (!costCenter) return

      await restClient.delete(`/cost-centers/${costCenter.id}`, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      refetch()
    },
    [restClient, context.accessToken, refetch]
  )

  const renderCostCenterTable = useCallback(
    (costCenter: CostCenter) => {
      const costCenterDataForId = costCenterData[costCenter.id]
      const isLoading = costCenterDataForId?.isLoading || false
      const error = costCenterDataForId?.error

      // Use API data if available, otherwise fallback to cost center data
      const employeeData =
        costCenterDataForId?.employees?.length > 0
          ? employeeDataTable(costCenterDataForId.employees as CostCenterEmployeeTable[])
          : []

      const organizationalUnitData =
        costCenterDataForId?.orgUnits?.length > 0
          ? organizationalUnitDataTable(costCenterDataForId.orgUnits as CostCenterOrganizationalUnitTable[])
          : []

      // Employee columns
      const employeeColumns: ColumnDef<{
        id: string
        firstName: string
        lastName: string
        name: string
        jobPosition: string | undefined
        organizationalUnit: string | undefined
      }>[] = [
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
              <div className="gba:flex gba:items-center">
                <div className="gba:font-semibold">{name as string}</div>
              </div>
            )
          }
        },
        {
          accessorKey: 'jobPosition',
          header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
            >
              Job Position
              <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
            </Button>
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const jobPosition = row.original?.jobPosition
            return jobPosition ?? 'N/A'
          }
        },
        {
          accessorKey: 'organizationalUnit',
          header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
            >
              Organizational Unit
              <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
            </Button>
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const organizationalUnit = row.original?.organizationalUnit
            return organizationalUnit ?? 'N/A'
          }
        }
      ]

      // Organizational Unit columns
      const orgUnitColumns: ColumnDef<{
        id: string
        name: string
        type?: string
        description?: string
      }>[] = [
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
              <div className="gba:flex gba:items-center">
                <div className="gba:font-semibold">{name as string}</div>
              </div>
            )
          }
        },
        {
          accessorKey: 'type',
          header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
            >
              Type
              <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
            </Button>
          ),
          enableSorting: true,
          cell: ({ getValue }) => getValue() ?? 'N/A'
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
          cell: ({ row }) => {
            const description = row.original?.description
            return (
              <div className="gba:flex gba:items-center">
                <div className="gba:font-semibold">{description ?? 'N/A'}</div>
              </div>
            )
          }
        }
      ]

      if (isLoading) {
        return (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        )
      }

      if (error) {
        return (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Alert variant="destructive">
              <AlertTitle>Error loading data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )
      }

      return (
        <Tabs defaultValue="employees" className="gba:w-full">
          <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
            <TabsTrigger value="employees" data-testid={`${dataTestId}-employees-tab`}>
              Employees ({costCenterDataForId?.employees?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="org-units" data-testid={`${dataTestId}-org-units-tab`}>
              Organizational Units ({costCenterDataForId?.orgUnits?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="gba:mt-4">
            <DataTable
              data={employeeData}
              columns={employeeColumns}
              enableSorting
              enablePagination
              data-testid={`${dataTestId}-employees-table`}
            />
          </TabsContent>

          <TabsContent value="org-units" className="gba:mt-4">
            <DataTable
              data={organizationalUnitData}
              columns={orgUnitColumns}
              enableSorting
              enablePagination
              data-testid={`${dataTestId}-org-units-table`}
            />
          </TabsContent>
        </Tabs>
      )
    },
    [costCenterData, employeeDataTable, organizationalUnitDataTable]
  )

  const groupItems = useMemo(
    () =>
      filteredCostCenters.map(costCenter => ({
        id: costCenter.id,
        title: costCenter.name,
        description: `Code: ${costCenter.code || 'N/A'}`,
        buttons: [
          {
            icon: () => (
              <Button
                variant="ghost"
                onClick={() => handleRowClick(costCenter)}
                data-testid={`${prefixDataTestId}-edit-${costCenter.id}`}
              >
                <EyeIcon />
              </Button>
            ),
            onClick: () => {}
          },
          {
            icon: () => (
              <CostCenterForm
                childAddButton={
                  <Button
                    variant="ghost"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId}-edit-${costCenter.id}`}
                  >
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                structureId={structureId}
                onCancel={() => {}}
                accessToken={context.accessToken}
                costCenters={costCenters}
                isFirstNode={true}
                costCenterNodes={costCenterNodes}
                costCenter={costCenter}
              />
            ),
            onClick: () => {}
          },
          {
            icon: () => (
              <DeleteButton
                onDelete={() => handleDelete(costCenter)}
                itemName={costCenter?.name ?? ''}
                itemTitle={'Cost Center'}
              />
            ),
            onClick: () => {}
          }
        ],
        content: (
          <div className="gba:space-y-4">
            <div className="gba:space-y-1">
              {costCenter.description && (
                <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                  <h1 className="gba:text-sm gba:font-semibold">Description:</h1>
                  {costCenter.description}
                </div>
              )}
              {costCenter.siteLocationName ? (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h1 className="gba:text-sm gba:font-semibold">Location:</h1>
                  <Badge variant="info">{costCenter.siteLocationName}</Badge>
                </div>
              ) : (
                <h1 className="gba:text-sm gba:text-gray-500 gba:italic">No location assigned</h1>
              )}
            </div>
            <div className="gba:w-full">{renderCostCenterTable(costCenter)}</div>
          </div>
        )
      })),
    [
      filteredCostCenters,
      handleRowClick,
      handleDelete,
      renderCostCenterTable,
      prefixDataTestId,
      refetch,
      structureId,
      context.accessToken,
      costCenters,
      costCenterNodes
    ]
  )

  const drawerItems = useMemo(() => {
    if (!selectedCostCenter) return []
    const costCenterDataForId = costCenterData[selectedCostCenter.id]

    const items: VerticalTableProps[] = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: [
          {
            label: 'Name',
            value: selectedCostCenter.name ?? '-'
          },
          {
            label: 'Code',
            value: selectedCostCenter.code ?? '-'
          },
          {
            label: 'Description',
            value: selectedCostCenter.description ?? '-'
          }
        ]
      }
    ]

    items.push({
      icon: <InfoIcon />,
      title: 'Statistics',
      items: [
        {
          label: 'Employees',
          value: costCenterDataForId?.employees?.length ?? '-'
        },
        {
          label: 'Organizational Units',
          value: costCenterDataForId?.orgUnits?.length ?? '-'
        }
      ]
    })

    return items
  }, [selectedCostCenter, costCenterData])

  if (isLoading && costCenters.length === 0) {
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
            Error Loading Cost Centers
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
    <Card data-testid={`${prefixDataTestId || ''}-CostCentersTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <CostCenterForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-CostCentersTab-AddButton`}
                >
                  <PlusIcon /> Add Cost Center
                </Button>
              }
              refetch={refetch}
              structureId={structureId}
              onCancel={() => {}}
              accessToken={context.accessToken}
              costCenters={costCenters}
              isFirstNode={costCenters.length === 0}
              costCenterNodes={costCenterNodes}
            />
          }
          cardTitle={`Cost Centers (${totalCostCenters})`}
          cardDescription="Manage cost centers and their details"
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search cost centers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        <Accordion
          className="gba:w-full"
          value={accordionValue}
          onValueChange={handleAccordionChange}
          items={groupItems}
        />

        {selectedCostCenter && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedCostCenter(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Cost Center Details"
            titleIcon={BankIcon}
            drawerItems={drawerItems}
            footerButtons={[
              <CostCenterForm
                childAddButton={
                  <Button variant="default" data-testid={`${prefixDataTestId || ''}-CostCentersTab-EditButton`}>
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                refetch={refetch}
                structureId={structureId}
                onCancel={() => {}}
                accessToken={context.accessToken}
                costCenters={costCenters}
                isFirstNode={true}
                costCenterNodes={costCenterNodes}
                costCenter={selectedCostCenter}
                isDrawerActive={true}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CostCentersTab
export { CostCentersTab }
