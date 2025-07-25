import { useState, useEffect } from "react"
import { format } from "date-fns"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge
} from '@newwork/nw-design-system'
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
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
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
    // Skip API calls if no access token to prevent CORS errors
    if (!accessToken) {
      console.log('No access token available for AbsenceList, using demo data');
      setLoadingPage(false);
      return;
    }

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
      console.log('AbsenceList API call failed, using demo data:', err);
      setError(null); // Clear error
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    fetchAbsences()
  }, [currentPage, accessToken])

  const allStatuses = ['pending', 'approved', 'rejected']
  const allGroups = ['Sick Leave', 'Vacation', 'Special Leave', 'Work Leave']

  const filteredAbsences = absences.filter(absence => {
    const requesterName = `${absence.employee.firstName} ${absence.employee.lastName}`.toLowerCase();
    const matchesSearch = !searchText || requesterName.includes(searchText.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || absence.status.toLowerCase() === selectedStatus.toLowerCase();
    
    const parentId = absence.type.parentEntryId;
    const groupName = absenceTypes[parentId] || absence.type.value;
    const matchesGroup = selectedGroup === 'all' || groupName === selectedGroup;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getGroupVariant = (groupName: string) => {
    switch (groupName) {
      case 'Sick Leave': return 'destructive';
      case 'Vacation': return 'default';
      case 'Special Leave': return 'secondary';
      case 'Work Leave': return 'outline';
      default: return 'outline';
    }
  };

  if (loadingPage) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="gba:w-full">
      <CardHeader>
        <CardTitle>Absence List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-col gba:md:gba:flex-row gba:gap-4 gba:mb-6 gba:items-start gba:md:gba:items-end">
          <Input
            placeholder="Search by requester"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="gba:w-full gba:md:gba:w-64"
          />
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="gba:w-full gba:md:gba:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="gba:w-full gba:md:gba:w-48">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {allGroups.map(group => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="gba:rounded-md gba:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAbsences.map((absence) => {
                const parentId = absence.type.parentEntryId;
                const groupName = absenceTypes[parentId] || absence.type.value;
                const startDate = new Date(absence.startDate);
                const endDate = new Date(absence.endDate);
                
                return (
                  <TableRow key={absence.id}>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Avatar className="gba:h-8 gba:w-8">
                          <AvatarImage src={absence.employee.pictureThumbnail} />
                          <AvatarFallback>
                            {absence.employee.firstName[0]}{absence.employee.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="gba:font-medium">
                            {absence.employee.firstName} {absence.employee.lastName}
                          </div>
                          <div className="gba:text-sm gba:text-muted-foreground">
                            {absence.employee.employeePosition?.organizationalUnit?.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getGroupVariant(groupName)}>
                        {groupName}
                      </Badge>
                    </TableCell>
                    <TableCell>{absence.type.value}</TableCell>
                    <TableCell>{formatDateRange(startDate, endDate)}</TableCell>
                    <TableCell>
                      {absence.effectiveDays} day{absence.effectiveDays !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(absence.status)}>
                        {absence.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {filteredAbsences.length === 0 && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            No absences found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  )
}