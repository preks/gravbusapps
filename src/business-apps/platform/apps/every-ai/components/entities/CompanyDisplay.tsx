import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
// import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'

interface CompanyDisplayProps {
  companyId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

// interface Company {
//   id: string
//   name: string
//   industry?: { id: string; value: string }
//   website?: string
//   email?: string
// }

export const CompanyDisplay: React.FC<CompanyDisplayProps> = ({
  textHuman,
  textTitle,
  accessToken,
  companyId,
  operation
}) => {
  // const [company, setCompany] = useState<Company | null>(null)
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

  //   const fetchCompany = async () => {
  //     setIsLoading(true)
  //     setError(null)

  //     try {
  //       const query = `
  //         query GetCompany($id: uuid!) {
  //           Account(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
  //             id
  //             name
  //             industry {
  //               id
  //               value
  //             }
  //             website
  //             email
  //           }
  //         }
  //       `

  //       const result = await graphqlClient.request<{ Account: Company[] }>(query, { id: companyId })

  //       if (result.Account && result.Account.length > 0) {
  //         setCompany(result.Account[0])
  //       } else {
  //         setError('Company not found')
  //       }
  //     } catch (err) {
  //       console.error('Error fetching company:', err)
  //       setError('Failed to load company')
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (companyId && accessToken) {
  //     fetchCompany()
  //   }
  // }, [companyId, accessToken, graphqlClient, operation])

  // const operationBadge = getOperationBadge(operation)

  // const handleClick = () => {
  //   if (companyId) {
  //     const url = buildPlatformUrl('/platform/crm/account-record', {
  //       accountId: companyId,
  //       source: 'every-ai'
  //     })
  //     navigateTo(url)
  //   }
  // }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    </div>
  )

  const handleTitleClick = () => {
    if (!companyId) return
    const url = buildPlatformUrl('/platform/crm/account-record', {
      accountId: companyId,
      source: 'every-ai'
    })
    navigateTo(url)
  }

  const content = textHuman || ''
  // Convert single newlines to hard line breaks in markdown
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="company-display-markdown">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid="company-title-link"
            >
              {textTitle || 'Company'}
            </button>
          </CardTitle>
        </div>
        {getOperationBadge(operation) && (
          <Badge
            variant={getOperationBadge(operation)!.variant}
            className="gba:text-xs"
            data-testid="company-operation-badge"
          >
            {getOperationBadge(operation)!.text}
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

export default CompanyDisplay
