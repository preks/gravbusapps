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

export const AbsenceList: React.FC<BusinessAppContextProps> = ({ accessToken}) => {
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
      setLoadingPage(true);
      
      const catalogData = await catalogClient.getCatalogEntriesList({ catalogIdentifier: 'AbsenceGroup', version: 'v1' });
      const typesMap: { [key: string]: string } = {};
      catalogData.data.forEach((entry: any) => {
        typesMap[entry.id] = entry.value;
      });
      setAbsenceTypes(typesMap);

      const result = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[], totalAbsences: EmployeeAbsence[], total: EmployeeAbsence[] }>(
        GET_EMPLOYEE_ABSENCES,
        { 
          page: (currentPage - 1) * itemsPerPage, 
          limit: itemsPerPage
        }
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
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <div className="gba:text-red-500">{error}</div>
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
    <div className="gba:p-4 gba:max-w-full gba:overflow-x-auto">

      <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-2 gba:mb-4 gba:items-start gba:md:items-end">
        <Input.Search
          placeholder="Search by requester"
          allowClear
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="gba:w-full gba:md:w-64"
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
                'Sick Leave': 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:bg-pink-100 gba:text-pink-800 gba:hover:bg-pink-200',
                'Vacation': 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:bg-emerald-100 gba:text-emerald-800 gba:hover:bg-emerald-200',
                'Special Leave': 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:bg-violet-100 gba:text-violet-800 gba:hover:bg-violet-200',
                'Work Leave': 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:bg-amber-100 gba:text-amber-800 gba:hover:bg-amber-200',
              };
              const tagClass = classMap[groupName] || 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:bg-gray-100 gba:text-gray-800';
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
              <div className="gba:text-sm">
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
              <div className="gba:flex gba:items-start">
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium">{record.employee.firstName} {record.employee.lastName}</span>
                  <span className="gba:text-xs gba:text-gray-500">
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
                approved: 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:capitalize gba:bg-green-100 gba:text-green-800 gba:hover:bg-green-200',
                pending: 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:capitalize gba:bg-yellow-100 gba:text-yellow-800 gba:hover:bg-yellow-200',
                rejected: 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:capitalize gba:bg-red-100 gba:text-red-800 gba:hover:bg-red-200',
              };
              const tagClass = statusClassMap[status] || 'gba:inline-flex gba:items-center gba:rounded-md gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:border-transparent gba:font-normal gba:capitalize gba:bg-gray-100 gba:text-gray-800';
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