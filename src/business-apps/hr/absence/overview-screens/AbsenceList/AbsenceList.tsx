import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Table, Spin } from 'antd'
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

  return (
    <div className="p-4">
      <Table
        dataSource={absences}
        columns={[
          {
            title: 'Group',
            dataIndex: 'group',
            key: 'group',
            render: (_: any, record: EmployeeAbsence) => {
              const parentId = record.type.parentEntryId
              return absenceTypes[parentId] || record.type.value
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
            render: (_: any, record: EmployeeAbsence) => {
              return record.employee.firstName + ' ' + record.employee.lastName
            },
            key: 'requester',
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (_: any, record: EmployeeAbsence) => {
              if (!record.status) return '';
              return record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase();
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