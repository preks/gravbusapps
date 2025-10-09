import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Progress,
  DataTable,
  Skeleton,
  Icon,
  IconAvatar,
  SectionKpiCards
} from '@newwork/nw-design-system'
import { Star, User, CheckCircle, Clock, TrendUp } from '@phosphor-icons/react'
import ComponentShowcase from './ComponentShowcase'

/**
 * Comprehensive showcase of all data display components
 */
export function DataDisplayShowcase() {
  // Sample data for table examples
  const sampleTableData = [
    {
      id: 1,
      name: 'John Doe',
      role: 'Developer',
      status: 'Active',
      salary: 75000
    },
    {
      id: 2,
      name: 'Jane Smith',
      role: 'Designer',
      status: 'Active',
      salary: 65000
    },
    {
      id: 3,
      name: 'Bob Johnson',
      role: 'Manager',
      status: 'Away',
      salary: 85000
    },
    {
      id: 4,
      name: 'Alice Brown',
      role: 'Analyst',
      status: 'Inactive',
      salary: 55000
    }
  ]

  // Sample data for DataTable
  const dataTableSets = [
    {
      id: 'employees',
      label: 'Employees',
      data: sampleTableData,
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name' },
        { id: 'role', accessorKey: 'role', header: 'Role' },
        { id: 'status', accessorKey: 'status', header: 'Status' },
        { id: 'salary', accessorKey: 'salary', header: 'Salary' }
      ]
    }
  ]

  // Columns typed for demo advanced table
  const advancedColumns = dataTableSets[0].columns as {
    id: string
    accessorKey: string
    header: string
  }[]

  // Sample KPI data
  const kpiData = [
    {
      id: 'total-users',
      title: 'Total Users',
      value: 1234,
      icon: 'users',
      iconColor: 'var(--nw-color-info)',
      trend: {
        value: '+12%',
        positive: true,
        description: 'from last month'
      }
    },
    {
      id: 'revenue',
      title: 'Revenue',
      value: 125000,
      prefix: '$',
      decimalPlaces: 0,
      iconColor: 'var(--nw-color-success)',
      trend: {
        value: '+8.5%',
        positive: true,
        description: 'vs last month'
      }
    },
    {
      id: 'conversion',
      title: 'Conversion Rate',
      value: 4.2,
      suffix: '%',
      decimalPlaces: 1,
      iconColor: 'var(--nw-color-ext-7)',
      trend: {
        value: '-0.3%',
        positive: false,
        description: 'vs last month'
      }
    }
  ]

  return (
    <div className="gba:space-y-8" data-testid="data-display-showcase">
      {/* Badges */}
      <ComponentShowcase title="Badge Components" description="Status indicators and labels with different variants">
        <div className="gba:space-y-4">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Badge Variants</h4>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Badge data-testid="badge-default">Default</Badge>
              <Badge variant="secondary" data-testid="badge-secondary">
                Secondary
              </Badge>
              <Badge variant="outline" data-testid="badge-outline">
                Outline
              </Badge>
              <Badge variant="destructive" data-testid="badge-destructive">
                Destructive
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Status Badges</h4>
            <div className="gba:flex gba:flex-wrap" style={{ gap: 'var(--nw-spacing-2)' }}>
              <Badge
                style={{
                  backgroundColor: 'var(--nw-color-success-secondary)',
                  color: 'var(--nw-color-success-secondary-foreground)'
                }}
              >
                <CheckCircle className="gba:w-3 gba:h-3" style={{ marginRight: 'var(--nw-spacing-1)' }} />
                Active
              </Badge>
              <Badge
                style={{
                  backgroundColor: 'var(--nw-color-warning-secondary)',
                  color: 'var(--nw-color-warning-secondary-foreground)'
                }}
              >
                <Clock className="gba:w-3 gba:h-3" style={{ marginRight: 'var(--nw-spacing-1)' }} />
                Pending
              </Badge>
              <Badge
                style={{
                  backgroundColor: 'var(--nw-color-destructive-secondary)',
                  color: 'var(--nw-color-destructive-secondary-foreground)'
                }}
              >
                Inactive
              </Badge>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Avatars */}
      <ComponentShowcase title="Avatar Components" description="User avatars with images, fallbacks, and icon variants">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Avatars</h4>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <Avatar data-testid="avatar-with-image">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar data-testid="avatar-fallback">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Avatar data-testid="avatar-fallback-2">
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Icon Avatars</h4>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <IconAvatar icon={User} variant="default" size="md" data-testid="icon-avatar-user" />
              <IconAvatar icon={Star} variant="success" size="md" data-testid="icon-avatar-star" />
              <IconAvatar icon={CheckCircle} variant="warning" size="md" data-testid="icon-avatar-check" />
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Different Sizes</h4>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <IconAvatar icon={User} size="sm" />
              <IconAvatar icon={User} size="md" />
              <IconAvatar icon={User} size="lg" />
              <IconAvatar icon={User} size="xl" />
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Progress */}
      <ComponentShowcase title="Progress Indicators" description="Progress bars for showing completion status">
        <div className="gba:space-y-4 gba:max-w-md">
          <div>
            <div className="gba:flex gba:justify-between gba:text-sm gba:mb-2">
              <span>Loading...</span>
              <span>33%</span>
            </div>
            <Progress value={33} data-testid="progress-33" />
          </div>
          <div>
            <div className="gba:flex gba:justify-between gba:text-sm gba:mb-2">
              <span>Processing...</span>
              <span>66%</span>
            </div>
            <Progress value={66} data-testid="progress-66" />
          </div>
          <div>
            <div className="gba:flex gba:justify-between gba:text-sm gba:mb-2">
              <span>Complete</span>
              <span>100%</span>
            </div>
            <Progress value={100} data-testid="progress-100" />
          </div>
        </div>
      </ComponentShowcase>

      {/* Basic Table */}
      <ComponentShowcase title="Basic Table" description="Simple table component for displaying tabular data">
        <Table data-testid="basic-table">
          <TableCaption>A list of employees and their information</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="gba:text-right">Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleTableData.map(row => (
              <TableRow key={row.id}>
                <TableCell className="gba:font-medium">{row.name}</TableCell>
                <TableCell>{row.role}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.status === 'Active' ? 'default' : 'secondary'}
                    className={row.status === 'Active' ? 'gba:bg-green-100 gba:text-green-800' : ''}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="gba:text-right">${row.salary.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ComponentShowcase>

      {/* Advanced DataTable */}
      <ComponentShowcase
        title="Advanced Data Table"
        description="Enhanced table with sorting, filtering, and pagination"
      >
        <DataTable data={dataTableSets[0].data} columns={advancedColumns} data-testid="advanced-data-table" />
      </ComponentShowcase>

      {/* KPI Cards */}
      <ComponentShowcase title="KPI Cards" description="Key Performance Indicator cards with metrics and trends">
        <SectionKpiCards cards={kpiData} data-testid="kpi-cards" />
      </ComponentShowcase>

      {/* Skeleton Loading */}
      <ComponentShowcase title="Skeleton Loading" description="Placeholder components for loading states">
        <div className="gba:space-y-4">
          <div className="gba:flex gba:items-center gba:space-x-4">
            <Skeleton className="gba:h-12 gba:w-12 gba:rounded-full" data-testid="skeleton-avatar" />
            <div className="gba:space-y-2">
              <Skeleton className="gba:h-4 gba:w-40" data-testid="skeleton-line-1" />
              <Skeleton className="gba:h-4 gba:w-24" data-testid="skeleton-line-2" />
            </div>
          </div>
          <Skeleton className="gba:h-8 gba:w-full" data-testid="skeleton-full" />
          <Skeleton className="gba:h-8 gba:w-3/4" data-testid="skeleton-3-4" />
        </div>
      </ComponentShowcase>

      {/* Icons */}
      <ComponentShowcase title="Icon Components" description="Phosphor icons with different sizes and variants">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Icon Sizes</h4>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <Icon icon={Star} size="xs" decorative data-testid="icon-xs" />
              <Icon icon={Star} size="sm" decorative data-testid="icon-sm" />
              <Icon icon={Star} size="md" decorative data-testid="icon-md" />
              <Icon icon={Star} size="lg" decorative data-testid="icon-lg" />
              <Icon icon={Star} size="xl" decorative data-testid="icon-xl" />
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Icon Variants</h4>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <Icon icon={Star} variant="thin" decorative />
              <Icon icon={Star} variant="light" decorative />
              <Icon icon={Star} variant="regular" decorative />
              <Icon icon={Star} variant="bold" decorative />
              <Icon icon={Star} variant="fill" decorative />
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Colored Icons</h4>
            <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-4)' }}>
              <Icon icon={Star} size="lg" variant="fill" decorative style={{ color: 'var(--nw-color-warning)' }} />
              <Icon
                icon={CheckCircle}
                size="lg"
                variant="fill"
                decorative
                style={{ color: 'var(--nw-color-success)' }}
              />
              <Icon icon={TrendUp} size="lg" variant="fill" decorative style={{ color: 'var(--nw-color-info)' }} />
            </div>
          </div>
        </div>
      </ComponentShowcase>
    </div>
  )
}

export default DataDisplayShowcase
