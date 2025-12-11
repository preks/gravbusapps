import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
// import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'

interface AbsenceDisplayProps {
  absenceId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

// interface Absence {
//   id: string
//   startDate: string
//   endDate: string
//   reason: string | null
//   employee: {
//     firstName: string
//     lastName: string
//   } | null
// }

export const AbsenceDisplay: React.FC<AbsenceDisplayProps> = ({
  absenceId,
  accessToken,
  operation,
  textHuman,
  textTitle
}) => {
  // const [absence, setAbsence] = useState<Absence | null>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const graphqlClient = useGraphQLClient(accessToken)

  // useEffect(() => {
  //   const fetchAbsence = async () => {
  //     setIsLoading(true)
  //     setError(null)

  //     try {
  //       const query = `
  //         query GetAbsence($id: uuid!) {
  //           employeeAbsences_by_pk(id: $id) {
  //             id
  //             startDate
  //             endDate
  //             reason
  //             employee {
  //               firstName
  //               lastName
  //             }
  //           }
  //         }
  //       `

  //       const result = await graphqlClient.request<{ employeeAbsences_by_pk: Absence }>(query, { id: absenceId })

  //       if (result.employeeAbsences_by_pk) {
  //         setAbsence(result.employeeAbsences_by_pk)
  //       } else {
  //         setError('Absence not found')
  //       }
  //     } catch (err) {
  //       console.error('Error fetching absence:', err)
  //       setError('Failed to load absence')
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (absenceId && accessToken) {
  //     fetchAbsence()
  //   }
  // }, [absenceId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )

  const handleTitleClick = () => {
    if (!absenceId) return
    const url = buildPlatformUrl('/platform/hr/absences/manager-absences', {
      absenceId,
      source: 'every-ai'
    })
    navigateTo(url)
  }

  const content = textHuman || ''
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="absence-display-markdown">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid="absence-title-link"
            >
              {textTitle || 'Absence'}
            </button>
          </CardTitle>
        </div>
        {operationBadge && (
          <Badge variant={operationBadge.variant} className="gba:text-xs" data-testid="absence-operation-badge">
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

export default AbsenceDisplay
