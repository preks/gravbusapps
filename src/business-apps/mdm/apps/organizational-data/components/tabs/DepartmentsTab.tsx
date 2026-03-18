import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  EyeIcon,
  FolderIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  InfoIcon,
  BankIcon,
  UsersIcon,
  CrownSimpleIcon,
  TreeStructureIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDepartments } from '../../hooks'
import {
  Spinner,
  Card,
  Alert,
  AlertTitle,
  AlertDescription,
  CardContent,
  Badge,
  TreeView,
  TreeNode,
  TreeViewAction,
  Button,
  Icon
} from '@newwork/nw-design-system'
import CardTabHeaderComponent from '../../../generic-components/card'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import DepartmentForm from '@/business-apps/mdm/forms/department-form'
import { Department } from '../../types'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface DepartmentsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'DepartmentsTab'

const DepartmentsTab: React.FC<DepartmentsTabProps> = context => {
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(context.accessToken)

  const { rootDepartments, allDepartments, isLoading, error, refetch, totalDepartments, structureId } =
    useDepartments(context)

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false)
  const [isEditDepartmentOpen, setIsEditDepartmentOpen] = useState(false)
  const [isRemoveDepartmentOpen, setIsRemoveDepartmentOpen] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedDepartment) {
      const updatedSelectedDepartment = allDepartments.find(department => department.id === selectedDepartment.id)

      if (updatedSelectedDepartment) {
        setSelectedDepartment(updatedSelectedDepartment)
      }
    }
  }, [allDepartments])

  const handleViewDepartment = (nodeId: string) => {
    const department = allDepartments.find(department => department.id === nodeId)

    if (department) {
      setSelectedDepartment(department)
      setDrawerVisible(true)
    }
  }

  // Find parent node IDs for a given department ID
  const findParentNodeIds = useCallback((departmentId: string, departments: Department[]): string[] => {
    const parentIds: string[] = []

    const findParents = (departmentList: Department[], targetId: string, currentPath: string[] = []): boolean => {
      for (const department of departmentList) {
        const newPath = [...currentPath, department.id]

        if (department.id === targetId) {
          parentIds.push(...currentPath)
          return true
        }

        if (department.children.length > 0) {
          if (findParents(department.children, targetId, newPath)) {
            return true
          }
        }
      }
      return false
    }

    findParents(departments, departmentId)
    return parentIds
  }, [])

  // Find matching departments based on search term
  const findMatchingDepartments = useCallback((searchTerm: string, departments: Department[]): Department[] => {
    const matches: Department[] = []
    const searchLower = searchTerm.toLowerCase()

    const searchInDepartments = (departmentList: Department[]) => {
      for (const department of departmentList) {
        const matchesSearch =
          department.name.toLowerCase().includes(searchLower) ||
          (department.code && department.code.toLowerCase().includes(searchLower)) ||
          (department.description && department.description.toLowerCase().includes(searchLower)) ||
          (department.supervisorName && department.supervisorName.toLowerCase().includes(searchLower)) ||
          (department.companyName && department.companyName.toLowerCase().includes(searchLower)) ||
          (department.costCenterName && department.costCenterName.toLowerCase().includes(searchLower))

        if (matchesSearch) {
          matches.push(department)
        }

        if (department.children.length > 0) {
          searchInDepartments(department.children)
        }
      }
    }

    searchInDepartments(departments)
    return matches
  }, [])

  // Handle search with auto-expansion
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        const matchingDepartments = findMatchingDepartments(query, rootDepartments)
        const newExpandedKeys = new Set<string>()

        // For each matching department, expand all its parent nodes
        matchingDepartments.forEach(department => {
          const parentIds = findParentNodeIds(department.id, rootDepartments)
          parentIds.forEach(id => newExpandedKeys.add(id))
        })

        setExpandedKeys(newExpandedKeys)
      } else {
        setExpandedKeys(new Set())
      }
    },
    [rootDepartments, findMatchingDepartments, findParentNodeIds]
  )

  // Handle expand/collapse
  const handleExpand = useCallback((expandedIds: string[]) => {
    setExpandedKeys(new Set(expandedIds))
  }, [])

  const formatDepartmentNodes = useCallback((departments: Department[]): TreeNode[] => {
    return departments.map(department => ({
      id: department.id,
      values: {
        code: <Badge variant="info">{department.code ?? '-'}</Badge>,
        numberOfAssignedEmployees: department.numberOfAssignedEmployees ?? '-',
        numberOfOpenJobPositions: department.numberOfOpenJobPositions ?? '-',
        supervisorName: <h1 className="gba:font-semibold">{department.supervisorName ?? '-'}</h1>,
        name: department.name ?? '-',
        type: (
          <Badge variant={department.type === 'DEPARTMENT' ? 'info' : 'ext7'}>
            {department.type ? department.type.charAt(0).toUpperCase() + department.type.slice(1).toLowerCase() : '-'}
          </Badge>
        ),
        companyName: department.companyName ?? '-',
        costCenterName: department.costCenterName ?? '-'
      },
      icon: FolderIcon,
      children: department.children.length > 0 ? formatDepartmentNodes(department.children) : []
    }))
  }, [])

  const childRank = useMemo(() => {
    if (selectedDepartment?.children.length === 0) {
      return 0
    }
    const positiveRank = selectedDepartment?.children.filter(child => child.rank >= 0)?.length
    return positiveRank
  }, [selectedDepartment])

  const nodes = useMemo(() => formatDepartmentNodes(rootDepartments), [rootDepartments, formatDepartmentNodes])

  const treeColumns = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, align: 'left' as const },
      { key: 'type', header: 'Type', sortable: true, align: 'center' as const },
      {
        key: 'numberOfAssignedEmployees',
        header: 'Employees',
        sortable: true,
        align: 'center' as const
      },
      {
        key: 'numberOfOpenJobPositions',
        header: 'Open Positions',
        sortable: true,
        align: 'center' as const
      },
      {
        key: 'supervisorName',
        header: 'Supervisor',
        sortable: true,
        align: 'center' as const
      },
      { key: 'companyName', header: 'Company', sortable: true, align: 'center' as const },
      { key: 'costCenterName', header: 'Cost Center', sortable: true, align: 'center' as const }
    ],

    []
  )

  const handleDeleteDepartment = async (department: Department) => {
    await orgchartClient.deleteOrganizationalUnit(department.id, {
      headers: { Authorization: `Bearer ${context.accessToken}` }
    })

    refetch()
    setIsRemoveDepartmentOpen(false)
    setSelectedDepartment(null)
  }

  const treeActions: TreeViewAction[] = [
    {
      id: 'view-department',
      label: 'View Department',
      icon: EyeIcon,
      onClick: node => {
        handleViewDepartment(node?.id ?? '')
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'add-sub-department',
      label: 'Add Sub-Department',
      icon: PlusIcon,
      onClick: node => {
        const department = allDepartments.find(department => department.id === node?.id)
        if (!department) return

        setSelectedDepartment(department)
        setIsAddDepartmentOpen(true)
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'edit-department',
      label: 'Edit Department',
      icon: PencilSimpleLineIcon,
      onClick: node => {
        const department = allDepartments.find(department => department.id === node?.id)

        if (!department) return

        setSelectedDepartment(department)
        setIsEditDepartmentOpen(true)
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    },
    {
      id: 'delete-department',
      label: 'Delete Department',
      icon: TrashIcon,
      onClick: node => {
        const department = allDepartments.find(department => department.id === node?.id)
        if (!department) return

        setSelectedDepartment(department)
        setIsRemoveDepartmentOpen(true)
      },
      variant: 'ghost' as const,
      size: 'sm' as const
    }
  ]

  const drawerItems = useMemo(() => {
    if (!selectedDepartment) return []

    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: [
          {
            label: 'Name',
            value: selectedDepartment.name ?? '-'
          },
          {
            label: 'Type',
            value: selectedDepartment.type
              ? selectedDepartment.type.charAt(0).toUpperCase() + selectedDepartment.type.slice(1).toLowerCase()
              : '-'
          },
          {
            label: 'Description',
            value: selectedDepartment.description ?? '-'
          }
        ]
      },
      {
        icon: <TreeStructureIcon />,
        title: 'Parent Department',
        items: [
          {
            label: 'Name',
            value: selectedDepartment.parentDepartmentName ?? '-'
          }
        ]
      },
      {
        icon: <BankIcon />,
        title: 'Company & Cost Center',
        verticalTable: true,
        items: [
          {
            label: 'Company Name',
            value: selectedDepartment.companyName ?? '-'
          },
          {
            label: 'Cost Center Name',
            value: selectedDepartment.costCenterName ?? '-'
          }
        ]
      },
      {
        icon: <CrownSimpleIcon />,
        title: 'Supervisor',
        verticalTable: true,
        items: [
          {
            label: 'Supervisor Name',
            value: selectedDepartment.supervisorName ?? '-'
          },
          {
            label: 'Supervisor Job Position',
            value: selectedDepartment.supervisorJobPosition ?? '-'
          }
        ]
      },
      {
        icon: <ChartBarIcon />,
        title: 'Statistics',
        items: [
          {
            label: 'Assigned Job Positions',
            value: selectedDepartment.numberOfAssignedJobPositions ?? '-'
          },
          {
            label: 'Open Job Positions',
            value: selectedDepartment.numberOfOpenJobPositions ?? '-'
          },
          {
            label: 'Total Job Positions',
            value: selectedDepartment.numberOfTotalJobPositions ?? '-'
          },
          {
            label: 'Child Units',
            value: selectedDepartment.numberOfChildUnits ?? '-'
          },
          {
            label: 'Assigned Employees',
            value: selectedDepartment.numberOfAssignedEmployees ?? '-'
          },
          {
            label: 'Rank',
            value: selectedDepartment.rank ?? '-'
          }
        ]
      }
    ]

    return items
  }, [selectedDepartment])

  if (isLoading && allDepartments.length === 0) {
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
            Error Loading Departments
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
    <Card data-testid={`${prefixDataTestId || ''}-DepartmentsTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          cardTitle={`Departments & Teams (${totalDepartments})`}
          cardDescription="Manage departments and teams in a hierarchical structure.."
        />
      )}

      <CardContent>
        {rootDepartments.length > 0 ? (
          <TreeView
            data={nodes}
            columns={treeColumns}
            className="gba:px-6"
            searchPlaceholder="Search departments"
            showSelectColumn={false}
            actions={treeActions}
            multipleSelection={false}
            expandedNodes={Array.from(expandedKeys)}
            onExpandItem={handleExpand}
            onSearch={handleSearch}
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4">
            <h1 className="gba:text-base gba:text-gray-500">No departments found</h1>

            <DepartmentForm
              onCancel={() => setIsEditDepartmentOpen(false)}
              refetch={refetch}
              structureId={structureId}
              accessToken={context.accessToken}
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-DepartmentsTab-AddButton`}
                >
                  <PlusIcon /> Add First Department
                </Button>
              }
            />
          </div>
        )}

        {selectedDepartment && isEditDepartmentOpen && (
          <DepartmentForm
            refetch={refetch}
            structureId={structureId}
            accessToken={context.accessToken}
            parentNodeId={selectedDepartment.parentNodeId}
            department={selectedDepartment}
            open={isEditDepartmentOpen}
            setOpen={setIsEditDepartmentOpen}
            rank={selectedDepartment.rank}
            isEditDepartment={true}
            onCancel={() => setSelectedDepartment(null)}
          />
        )}

        {selectedDepartment && isAddDepartmentOpen && (
          <DepartmentForm
            refetch={refetch}
            structureId={structureId}
            accessToken={context.accessToken}
            parentNodeId={selectedDepartment.nodeId}
            open={isAddDepartmentOpen}
            setOpen={setIsAddDepartmentOpen}
            rank={childRank}
            onCancel={() => setSelectedDepartment(null)}
          />
        )}

        {selectedDepartment && isRemoveDepartmentOpen && (
          <DeleteButton
            onDelete={() => handleDeleteDepartment(selectedDepartment)}
            itemName={selectedDepartment?.name}
            itemTitle="Department"
            open={isRemoveDepartmentOpen}
            setOpen={setIsRemoveDepartmentOpen}
            showCancelButton={false}
          />
        )}

        {selectedDepartment && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedDepartment(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Department Details"
            titleIcon={selectedDepartment?.type === 'DEPARTMENT' ? TreeStructureIcon : UsersIcon}
            drawerItems={drawerItems}
            footerButtons={[
              <DepartmentForm
                childAddButton={
                  <Button variant="default" data-testid={`${prefixDataTestId || ''}-DepartmentsTab-EditButton`}>
                    <Icon icon={PencilSimpleLineIcon} /> Edit
                  </Button>
                }
                refetch={refetch}
                structureId={structureId}
                accessToken={context.accessToken}
                parentNodeId={selectedDepartment.parentNodeId}
                department={selectedDepartment}
                open={isEditDepartmentOpen}
                setOpen={setIsEditDepartmentOpen}
                rank={selectedDepartment.rank}
                isEditDepartment={true}
                isDrawerActive={true}
                onCancel={() => setSelectedDepartment(null)}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default DepartmentsTab
export { DepartmentsTab }
