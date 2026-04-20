import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Calendar } from 'lucide-react'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildCrmRelatedEntityRecordUrl, buildIrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
import dayjs from 'dayjs'
import { PhoneIcon, EnvelopeIcon, UsersIcon, ListChecksIcon } from '@phosphor-icons/react'
import { ActivityTableReferenceCell } from './ActivityTableReferenceCell'
// Format date helper
const formatDateDisplay = (date: string | Date | undefined): string => {
  if (!date) return '-'
  const d = dayjs(date)
  if (!d.isValid()) return '-'
  return d.format('MMM D, YYYY')
}

// Get activity type icon — no colour classes; inherits black from badge override
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PhoneIcon size={16} />
    case 'Email':
      return <EnvelopeIcon size={16} />
    case 'Meeting':
      return <UsersIcon size={16} />
    case 'Task':
      return <ListChecksIcon size={16} />
    default:
      return <ListChecksIcon size={16} />
  }
}

// Get activity type badge variant
const getActivityTypeVariant = (
  type: string
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' => {
  switch (type) {
    case 'Call':
      return 'success'
    case 'Email':
      return 'outline'
    case 'Meeting':
      return 'warning'
    case 'Task':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Handle entity reference click (CRM vs IRM URLs)
const handleEntityReferenceClick = (activity: Activity) => {
  const inv = activity as Activity & { investmentId?: string | null; investment?: { id?: string } | null }
  // IRM activities include `investmentId` in the payload (possibly null); CRM customer activities omit it.
  const useIrmUrls =
    (activity as { investmentId?: unknown }).investmentId !== undefined ||
    (activity as { investment?: unknown }).investment !== undefined
  const build = useIrmUrls ? buildIrmRelatedEntityRecordUrl : buildCrmRelatedEntityRecordUrl

  const go = (kind: Parameters<typeof buildCrmRelatedEntityRecordUrl>[0], id: string | undefined | null) => {
    if (!id) return false
    const url = build(kind, id)
    if (url.length > 0) {
      navigateTo(url)
      return true
    }
    return false
  }

  if (go('account', activity.accountId)) return
  if (go('contact', activity.contactId)) return
  if (useIrmUrls && go('investment', inv.investmentId ?? inv.investment?.id ?? null)) return
  if (go('lead', activity.leadId)) return
  if (go('opportunity', activity.opportunityId)) return
}

// Safe string helper
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

export interface ActivityColumnsConfig {
  showOwnerEmployee?: boolean
  onReferenceClick?: (activity: Activity) => void
}

export const createActivityColumns = (config: ActivityColumnsConfig = {}): ColumnDef<Activity>[] => {
  const { showOwnerEmployee = false, onReferenceClick = handleEntityReferenceClick } = config

  const columns: ColumnDef<Activity>[] = []

  // Owner Employee Column (optional)
  if (showOwnerEmployee) {
    columns.push({
      id: 'ownerEmployee.displayName',
      accessorKey: 'ownerEmployee.displayName',
      header: 'Owner',
      size: 200,
      cell: ({ row }) => {
        const activity = row.original
        const displayName = activity.ownerEmployee?.displayName || 'Unknown'
        const employeeId = activity.ownerEmployeeId

        const handleClick = (e: React.MouseEvent) => {
          if (employeeId) {
            e.stopPropagation()
            const url = buildPlatformUrl('/platform/employee-record', { employeeId })
            navigateTo(url)
          }
        }

        if (employeeId) {
          return (
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:w-full"
              onClick={handleClick}
            >
              <Avatar size="sm">
                {activity.ownerEmployee?.pictureThumbnail && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${activity.ownerEmployee.pictureThumbnail}`}
                    alt={displayName}
                  />
                )}
                <AvatarFallback>
                  <User className="gba:h-4 gba:w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col">
                <span
                  className={`gba:text-sm gba:font-medium ${employeeId ? 'gba:text-primary hover:gba:underline' : ''}`}
                >
                  {displayName}
                </span>
              </div>
            </button>
          )
        }

        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar size="sm">
              {activity.ownerEmployee?.pictureThumbnail && (
                <AvatarImage
                  src={`data:image/jpeg;base64,${activity.ownerEmployee.pictureThumbnail}`}
                  alt={displayName}
                />
              )}
              <AvatarFallback>
                <User className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium" title={displayName}>
                {displayName}
              </span>
            </div>
          </div>
        )
      }
    })
  }

  // Title, Type, and Reference Columns
  columns.push(
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      size: 250,
      cell: ({ row }) => {
        const title = safeString(row.original.title)
        return (
          <div className="gba:flex gba:flex-col gba:gap-1 gba:overflow-hidden gba:max-w-[250px]">
            <span className="gba:text-sm gba:font-medium gba:truncate" title={title}>
              {title || '-'}
            </span>
            {row.original.description && (
              <span className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1" title={row.original.description}>
                {row.original.description}
              </span>
            )}
          </div>
        )
      }
    },
    {
      id: 'activityType.value',
      accessorKey: 'activityType.value',
      header: 'Type',
      size: 150,
      cell: ({ row }) => {
        const type = row.original.activityType?.value || 'Other'
        return (
          <Badge variant={getActivityTypeVariant(type)} className="gba:gap-1.5 gba:!text-black">
            {getActivityTypeIcon(type)}
            <span>{type}</span>
          </Badge>
        )
      }
    },
    {
      id: 'reference',
      header: 'Reference',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <ActivityTableReferenceCell
          activity={row.original}
          onReferenceClick={onReferenceClick}
          emptyVariant="general"
        />
      )
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created',
      size: 150,
      cell: ({ row }) => {
        const date = formatDateDisplay(row.original.createdAt)
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{date}</span>
          </div>
        )
      }
    },
    {
      id: 'occurredAt',
      accessorKey: 'occurredAt',
      header: 'Occurred',
      size: 150,
      cell: ({ row }) => {
        const date = formatDateDisplay(row.original.occurredAt)
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{date}</span>
          </div>
        )
      }
    }
  )

  return columns
}

// Sortable columns configuration
export const activitySortableColumns = [
  { id: 'ownerEmployee.displayName', label: 'Owner' },
  { id: 'title', label: 'Title' },
  { id: 'activityType.value', label: 'Type' },
  { id: 'createdAt', label: 'Created' },
  { id: 'occurredAt', label: 'Occurred' }
]

// Available columns configuration (for column visibility)
export const activityAvailableColumns = [
  { id: 'ownerEmployee.displayName', label: 'Owner' },
  { id: 'title', label: 'Title' },
  { id: 'activityType.value', label: 'Type' },
  { id: 'reference', label: 'Reference' },
  { id: 'createdAt', label: 'Created' },
  { id: 'occurredAt', label: 'Occurred' }
]
