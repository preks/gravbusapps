import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
// import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'

interface LeadDisplayProps {
  leadId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

// interface Lead {
//   id: string
//   firstName: string
//   lastName: string
//   company?: string
//   leadStatus?: { value: string }
//   email?: string
// }

export const LeadDisplay: React.FC<LeadDisplayProps> = ({ textHuman, textTitle, accessToken, leadId, operation }) => {
  // NOTE: Previous GraphQL-based implementation retained for reference
  // const [lead, setLead] = useState<Lead | null>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const graphqlClient = useGraphQLClient(accessToken)

  // useEffect(() => {
  //   // For delete operations, skip GraphQL query since entity is already deleted
  //   if (operation === 'delete') {
  //     setIsLoading(false)
  //     setError(null)
  //     return
  //   }

  //   const fetchLead = async () => {
  //     setIsLoading(true)
  //     setError(null)

  //     try {
  //       const query = `
  //         query GetLead($id: uuid!) {
  //           customerLeads_by_pk(id: $id) {
  //             id
  //             firstName
  //             lastName
  //             company
  //             email
  //             leadStatus {
  //               value
  //             }
  //           }
  //         }
  //       `

  //       const result = await graphqlClient.request<{ customerLeads_by_pk: Lead }>(query, { id: leadId })

  //       if (result.customerLeads_by_pk) {
  //         setLead(result.customerLeads_by_pk)
  //       } else {
  //         setError('Lead not found')
  //       }
  //     } catch (err) {
  //       console.error('Error fetching lead:', err)
  //       setError('Failed to load lead')
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (leadId && accessToken) {
  //     fetchLead()
  //   }
  // }, [leadId, accessToken, graphqlClient, operation])

  // const operationBadge = getOperationBadge(operation)

  // const handleClick = () => {
  //   if (leadId) {
  //     const url = buildPlatformUrl('/platform/crm/lead-record', {
  //       leadId: leadId,
  //       source: 'every-ai'
  //     })
  //     navigateTo(url)
  //   }
  // }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )

  const handleTitleClick = () => {
    if (!leadId) return
    const url = buildPlatformUrl('/platform/crm/lead-record', {
      leadId,
      source: 'every-ai'
    })
    navigateTo(url)
  }

  const content = textHuman || ''
  // Convert single newlines to hard line breaks in markdown
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  const operationBadge = getOperationBadge(operation)

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="lead-display-markdown">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid="lead-title-link"
            >
              {textTitle || 'Lead'}
            </button>
          </CardTitle>
        </div>
        {operationBadge && (
          <Badge variant={operationBadge.variant} className="gba:text-xs" data-testid="lead-operation-badge">
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

export default LeadDisplay
