import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
// import { env } from '@/common/env/EnvUtils'
// import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
// import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
// import { AvatarWithInitials } from '../shared/AvatarWithInitials'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'
import { getOperationBadge } from './utils/displayUtils'

interface ServiceTicketDisplayProps {
  serviceTicketId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

// interface ServiceTicket {
//   id: string
//   flowId?: string
//   flowName?: string
//   title?: string
//   message?: string
//   status?: string
//   assignee?: string
//   type?: string
//   assignment?: {
//     assignedTo?: string
//     currentStatus?: string
//   }
//   outputData?: Record<string, any>
//   inputData?: Record<string, any>
//   tags?: Record<string, any>
//   dueDate?: string
//   scheduledAt?: string
//   completedAt?: string
//   createdAt?: string
//   updatedAt?: string
// }

// interface AssigneeEmployee {
//   id: string
//   firstName: string
//   lastName: string
//   pictureThumbnail: string | null
// }

export const ServiceTicketDisplay: React.FC<ServiceTicketDisplayProps> = ({
  serviceTicketId,
  accessToken,
  operation,
  textHuman,
  textTitle
}) => {
  // const [ticket, setTicket] = useState<ServiceTicket | null>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const [catalogLabels, setCatalogLabels] = useState<Record<string, string>>({})
  // const [assigneeEmployee, setAssigneeEmployee] = useState<AssigneeEmployee | null>(null)
  // const catalogClient = useCatalogManagerClient(accessToken)
  // const graphqlClient = useGraphQLClient(accessToken)

  // useEffect(() => {
  //   const fetchTicket = async () => {
  //     setIsLoading(true)
  //     setError(null)

  //     try {
  //       const baseUrl = env('NEXT_PUBLIC_BASE_URL') || 'https://newwork-dev.newwork.com'
  //       const url = `${baseUrl}/flow-engine/api/tasks/${serviceTicketId}`

  //       const response = await fetch(url, {
  //         method: 'GET',
  //         headers: {
  //           Authorization: `Bearer ${accessToken}`,
  //           'Content-Type': 'application/json',
  //           accept: 'application/json'
  //         }
  //       })

  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch service ticket: ${response.statusText}`)
  //       }

  //       const taskData = await response.json()

  //       console.log('[ServiceTicket] Fetched task data:', taskData)

  //       if (taskData) {
  //         setTicket(taskData)

  //         // Resolve catalog entries from tags
  //         const catalogIds: string[] = []
  //         const catalogMapping: Record<string, string> = {}

  //         if (taskData.tags) {
  //           Object.entries(taskData.tags).forEach(([key, value]) => {
  //             if (typeof value === 'string' && value.includes(':')) {
  //               catalogIds.push(value)
  //               catalogMapping[value] = key
  //             }
  //           })
  //         }

  //         // Fetch catalog labels
  //         if (catalogIds.length > 0) {
  //           try {
  //             const catalogPromises = catalogIds.map(async catalogId => {
  //               try {
  //                 console.log('[ServiceTicket] Resolving catalog:', catalogId)
  //                 const entry = await catalogClient.getCatalogEntryById(catalogId)

  //                 console.log('[ServiceTicket] Resolved catalog:', catalogId, entry)
  //                 return { id: catalogId, label: entry.label || entry.value || catalogId }
  //               } catch (err) {
  //                 console.warn('[ServiceTicket] Failed to resolve catalog:', catalogId, err)
  //                 return { id: catalogId, label: catalogId }
  //               }
  //             })

  //             const resolvedCatalogs = await Promise.all(catalogPromises)
  //             const labels: Record<string, string> = {}
  //             resolvedCatalogs.forEach(({ id, label }) => {
  //               labels[id] = label
  //             })

  //             console.log('[ServiceTicket] All resolved labels:', labels)
  //             setCatalogLabels(labels)
  //           } catch (err) {
  //             console.warn('Failed to resolve some catalog entries', err)
  //           }
  //         }
  //       } else {
  //         setError('Service ticket not found')
  //       }
  //     } catch (err) {
  //       console.error('Error fetching service ticket:', err)
  //       setError('Failed to load service ticket')
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (serviceTicketId && accessToken) {
  //     fetchTicket()
  //   }
  // }, [serviceTicketId, accessToken, catalogClient])

  // // Fetch assignee employee details
  // useEffect(() => {
  //   const fetchAssignee = async () => {
  //     const assigneeId = ticket?.assignee || ticket?.assignment?.assignedTo
  //     if (!assigneeId || !accessToken) return

  //     try {
  //       const query = `
  //         query GetEmployeeByUserId($userId: String!) {
  //         Employee(where: {userId: {_eq: $userId}}, limit: 1) {
  //             id
  //             firstName
  //             lastName
  //             pictureThumbnail
  //           }
  //         }
  //       `
  //       const result = await graphqlClient.request<{ Employee: AssigneeEmployee[] }>(query, {
  //         userId: assigneeId
  //       })

  //       if (result.Employee && result.Employee.length > 0) {
  //         setAssigneeEmployee(result.Employee[0])
  //       }
  //     } catch (err) {
  //       console.warn('[ServiceTicket] Failed to fetch assignee employee:', err)
  //     }
  //   }

  //   fetchAssignee()
  // }, [ticket, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    </div>
  )

  const handleTitleClick = () => {
    // Force window refresh to ensure updated service ticket content is shown (SPA navigation, not full page reload)
    navigateTo(
      buildPlatformUrl('/platform/sales-demo/service-launcher', {
        view: 'myRequests',
        requestId: serviceTicketId,
        source: 'every-ai'
      }),
      { forceReload: true }
    )
  }

  const content = textHuman || ''
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="service-ticket-display-markdown">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid="service-ticket-title-link"
            >
              {textTitle || 'Service Ticket'}
            </button>
          </CardTitle>
        </div>
        {operationBadge && (
          <Badge variant={operationBadge.variant} className="gba:text-xs" data-testid="service-ticket-operation-badge">
            {operationBadge.text}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="gba:p-5">
        <div className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ul: ({ ...props }) => <ul className="gba:list-disc gba:ml-6" {...props} />,
              ol: ({ ...props }) => <ol className="gba:list-decimal gba:ml-6" {...props} />,
              a: ({ href, children, ...props }) => (
                <EntityLink href={href} accessToken={accessToken} {...props}>
                  {children}
                </EntityLink>
              )
            }}
            urlTransform={markdownUrlTransform}
          >
            {contentWithLineBreaks}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceTicketDisplay
