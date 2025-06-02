import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Table, Spin, Input, Select } from 'antd'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: {
      localeCode: string
      value: string
    }[]
    id: string
    value: string
    parentEntryId: string
  }
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
}

const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($page: Int!, $limit: Int!) {
    EmployeeAbsence(
      offset: $page
      limit: $limit
    ) {
      id
      startDate
      endDate
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
      }
      calendarDays
      effectiveDays
      status
    }
    total: EmployeeAbsence {
      id
    }
  }
`

const formatDateRange = (startDate: Date, endDate: Date): string => {
  if (startDate.getTime() === endDate.getTime()) {
    return format(startDate, "MMM d, yyyy")
  }
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
}

export const AbsenceList: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { Option } = Select;
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
  const graphQLClient = useGraphqlClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<{ [key: string]: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const itemsPerPage = 10
  const [loadingPage, setLoadingPage] = useState(false)

  const fetchAbsences = async () => {
    try {
      setLoadingPage(true)
      const catalogData = await catalogClient.getCatalogEntriesList({ catalogIdentifier: 'AbsenceGroup', version: 'v1' })
      const typesMap: { [key: string]: string } = {}
      catalogData.data.forEach((entry: any) => {
        typesMap[entry.id] = entry.value
      })
      setAbsenceTypes(typesMap)

      const result = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[], totalAbsences: EmployeeAbsence[], total: EmployeeAbsence[] }>(
        GET_EMPLOYEE_ABSENCES,
        { page: (currentPage - 1) * itemsPerPage, limit: itemsPerPage }
      )
      setAbsences(result.EmployeeAbsence)
      setTotal(result.total.length)
    } catch (err) {
      setError('Failed to fetch absences')
      console.error('Error fetching absences:', err)
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    fetchAbsences()
  }, [graphQLClient, catalogClient, currentPage])

  if (loadingPage) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

 
  const allStatuses = Array.from(new Set(absences.map(a => a.status?.toLowerCase()).filter(Boolean))).sort();
  const allGroups = Array.from(new Set(absences.map(a => {
    const parentId = a.type.parentEntryId;
    return absenceTypes[parentId] || a.type.value;
  }).filter(Boolean))).sort();

 
  const filteredAbsences = absences.filter(a => {

    const requester = (a.employee.firstName + ' ' + a.employee.lastName).toLowerCase();
    const matchesSearch = !searchText || requester.includes(searchText.toLowerCase());
    const matchesStatus = !selectedStatus || a.status?.toLowerCase() === selectedStatus;
    const groupName = absenceTypes[a.type.parentEntryId] || a.type.value;
    const matchesGroup = !selectedGroup || groupName === selectedGroup;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  return (
    <div className="p-4 max-w-full overflow-x-auto">

      <div className="flex flex-col md:flex-row gap-2 mb-4 items-start md:items-end">
        <Input.Search
          placeholder="Search by requester"
          allowClear
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full md:w-64"
        />
        <Select
          placeholder="Filter by status"
          allowClear
          className="w-full md:w-48"
          value={selectedStatus}
          onChange={value => setSelectedStatus(value)}
        >
          <Option value={undefined}>All Statuses</Option>
          {allStatuses.map(status => (
            <Option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</Option>
          ))}
        </Select>
        <Select
          placeholder="Filter by group"
          allowClear
          className="w-full md:w-48"
          value={selectedGroup}
          onChange={value => setSelectedGroup(value)}
        >
          <Option value={undefined}>All Groups</Option>
          {allGroups.map(group => (
            <Option key={group} value={group}>{group}</Option>
          ))}
        </Select>
      </div>
      <Table
        dataSource={filteredAbsences}
        columns={[
          {
            title: 'Group',
            dataIndex: 'group',
            key: 'group',
            render: (_: any, record: EmployeeAbsence) => {
              const parentId = record.type.parentEntryId;
              const groupName = absenceTypes[parentId] || record.type.value;

              const classMap: { [key: string]: string } = {
                'Sick Leave': 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal bg-pink-100 text-pink-800 hover:bg-pink-200',
                'Vacation': 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
                'Special Leave': 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal bg-violet-100 text-violet-800 hover:bg-violet-200',
                'Work Leave': 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal bg-amber-100 text-amber-800 hover:bg-amber-200',
              };
              const tagClass = classMap[groupName] || 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal bg-gray-100 text-gray-800';
              return <span className={tagClass}>{groupName}</span>;
            },
          },
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (_: any, record: EmployeeAbsence) => {
              return record.type.value
            },
          },
          {
            title: 'Dates',
            dataIndex: 'startDate',
            key: 'dates',
            render: (_: any, record: EmployeeAbsence) => (
              <div className="text-sm">
                {formatDateRange(new Date(record.startDate), new Date(record.endDate))}
              </div>
            ),
          },
          {
            title: 'Days',
            dataIndex: 'calendarDays',
            key: 'days',
          },
          {
            title: 'Requester',
            dataIndex: 'requester',
            render: (_: any, record: EmployeeAbsence) => (
              <div className="flex items-start">
                <div className="flex flex-col">
                  <span className="font-medium">{record.employee.firstName} {record.employee.lastName}</span>
                  <span className="text-xs text-gray-500">
                    {record.employee.employeePosition?.organizationalUnit?.name || 'No Department'}
                  </span>
                </div>
              </div>
            ),
            key: 'requester',
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (_: any, record: EmployeeAbsence) => {
              if (!record.status) return '';
              const status = record.status.toLowerCase();
              const statusClassMap: { [key: string]: string } = {
                approved: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal capitalize bg-green-100 text-green-800 hover:bg-green-200',
                pending: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal capitalize bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
                rejected: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal capitalize bg-red-100 text-red-800 hover:bg-red-200',
              };
              const tagClass = statusClassMap[status] || 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent font-normal capitalize bg-gray-100 text-gray-800';
              return <span className={tagClass}>{status}</span>;
            },
            key: 'status',
          }
        ]}
        rowKey="id"
        pagination={{
          pageSize: itemsPerPage,
          current: currentPage,
          onChange: (page: number) => {
            setCurrentPage(page)
            fetchAbsences()
          },
          showSizeChanger: false,
          total: total
        }}
        bordered
      />
    </div>
  )
}