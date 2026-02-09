import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, DataDisplay, DataTable, Badge, Spinner, Alert } from '@newwork/nw-design-system'
import { Users, Download } from '@phosphor-icons/react'
import { useGetTeamMembers, TeamMember } from './queries/TeamMembersQueries'

const TeamMembersReport: React.FC<BusinessAppContextProps> = context => {
  const [data, setData] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState([{ id: 'lastName', desc: false }])
  const [visibleColumns, setVisibleColumns] = useState([
    'name',
    'code',
    'position',
    'department',
    'supervisor',
    'email',
    'status'
  ])

  const { fetchData } = useGetTeamMembers(context)

  useEffect(() => {
    loadData()
  }, [search])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchData({ search, limit: 200 })
      setData(result.employees)
    } catch (err: any) {
      setError(err.message || 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  // Sort data on the client side
  const sortedData = useMemo(() => {
    if (!data.length) return []

    const sorted = [...data]

    if (sorting.length > 0) {
      const { id, desc } = sorting[0]

      sorted.sort((a, b) => {
        let aVal: any = ''
        let bVal: any = ''

        switch (id) {
          case 'lastName':
            aVal = a.lastName || ''
            bVal = b.lastName || ''
            break
          case 'firstName':
            aVal = a.firstName || ''
            bVal = b.firstName || ''
            break
          case 'code':
            aVal = a.code || ''
            bVal = b.code || ''
            break
          case 'position':
            aVal = a.employeePosition?.jobPosition?.name || ''
            bVal = b.employeePosition?.jobPosition?.name || ''
            break
          case 'department':
            aVal = a.employeePosition?.organizationalUnit?.name || ''
            bVal = b.employeePosition?.organizationalUnit?.name || ''
            break
          default:
            return 0
        }

        if (aVal < bVal) return desc ? 1 : -1
        if (aVal > bVal) return desc ? -1 : 1
        return 0
      })
    }

    return sorted
  }, [data, sorting])

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedData.slice(start, end)
  }, [sortedData, pagination])

  const getEmail = (member: TeamMember) => {
    const emailComm = member.communication?.find(c => c.value && c.value.includes('@'))
    return emailComm?.value || '-'
  }

  const getStatus = (member: TeamMember) => {
    if (member.activeTo) {
      const exitDate = new Date(member.activeTo)
      if (exitDate < new Date()) {
        return 'Inactive'
      }
    }
    return 'Active'
  }

  const columns = [
    {
      id: 'name',
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        const name = member.displayName || member.fullName || `${member.firstName} ${member.lastName}`
        return (
          <div className="gba:font-medium">
            {name}
            {member.title && <span className="gba:text-sm gba:text-muted-foreground gba:ml-1">({member.title})</span>}
          </div>
        )
      }
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Employee Code',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        return member.code || '-'
      }
    },
    {
      id: 'position',
      accessorKey: 'employeePosition.jobPosition.name',
      header: 'Position',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        return member.employeePosition?.jobPosition?.name || '-'
      }
    },
    {
      id: 'department',
      accessorKey: 'employeePosition.organizationalUnit.name',
      header: 'Department',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        return member.employeePosition?.organizationalUnit?.name || '-'
      }
    },
    {
      id: 'supervisor',
      accessorKey: 'employeePosition.supervisor.displayName',
      header: 'Supervisor',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        return member.employeePosition?.supervisor?.displayName || '-'
      }
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        return getEmail(member)
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const member = row.original as TeamMember
        const status = getStatus(member)
        return <Badge variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>
      }
    }
  ]

  const sortableColumns = columns.map(col => ({
    id: col.id,
    label: col.header
  }))

  const handleExport = () => {
    const headers = visibleColumns
      .map(colId => {
        const col = columns.find(c => c.id === colId)
        return col?.header || colId
      })
      .join(',')

    const rows = sortedData.map(member => {
      const row: string[] = []
      visibleColumns.forEach(colId => {
        let value = ''
        switch (colId) {
          case 'name':
            value = member.displayName || member.fullName || `${member.firstName} ${member.lastName}`
            break
          case 'code':
            value = member.code || ''
            break
          case 'position':
            value = member.employeePosition?.jobPosition?.name || ''
            break
          case 'department':
            value = member.employeePosition?.organizationalUnit?.name || ''
            break
          case 'supervisor':
            value = member.employeePosition?.supervisor?.displayName || ''
            break
          case 'email':
            value = getEmail(member)
            break
          case 'status':
            value = getStatus(member)
            break
        }
        row.push(`"${value.replace(/"/g, '""')}"`)
      })
      return row.join(',')
    })

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-members-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && !data.length) {
    return (
      <PageLayout headerIcon={Users} headerLabel="Team Members Report">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Spinner />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      headerIcon={Users}
      headerLabel="Team Members Report"
      headerDescription={`${sortedData.length} team member${sortedData.length !== 1 ? 's' : ''} • Sorted by last name`}
    >
      <DataDisplay
        searchValue={search}
        searchPlaceholder="Search by name, code..."
        onSearchChange={setSearch}
        sorting={sorting}
        onSortingChange={setSorting}
        sortableColumns={sortableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        bulkActions={[
          {
            id: 'export',
            label: 'Export to CSV',
            icon: Download,
            onClick: handleExport
          }
        ]}
      >
        {error && (
          <Alert variant="destructive" className="gba:mb-4">
            {error}
          </Alert>
        )}
        <DataTable
          data={paginatedData}
          columns={columns.filter(col => visibleColumns.includes(col.id))}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={setSorting}
          enablePagination
          enableSorting
          totalCount={sortedData.length}
        />
      </DataDisplay>
    </PageLayout>
  )
}

export default TeamMembersReport
export { TeamMembersReport }
