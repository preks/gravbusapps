import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
// import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '../links/EntityLink'

interface ContactDisplayProps {
  contactId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

// interface Contact {
//   id: string
//   firstName: string
//   lastName: string
//   email?: string
//   phone?: string
//   jobTitle?: string
//   account?: { name: string }
// }

export const ContactDisplay: React.FC<ContactDisplayProps> = ({
  textHuman,
  textTitle,
  accessToken,
  contactId,
  operation
}) => {
  // const [contact, setContact] = useState<Contact | null>(null)
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

  //   const fetchContact = async () => {
  //     setIsLoading(true)
  //     setError(null)

  //     try {
  //       const query = `
  //         query GetContact($id: uuid!) {
  //           customerContacts_by_pk(id: $id) {
  //             id
  //             firstName
  //             lastName
  //             email
  //             phone
  //             jobTitle
  //             account {
  //               name
  //             }
  //           }
  //         }
  //       `

  //       const result = await graphqlClient.request<{ customerContacts_by_pk: Contact }>(query, { id: contactId })

  //       if (result.customerContacts_by_pk) {
  //         setContact(result.customerContacts_by_pk)
  //       } else {
  //         setError('Contact not found')
  //       }
  //     } catch (err) {
  //       console.error('Error fetching contact:', err)
  //       setError('Failed to load contact')
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (contactId && accessToken) {
  //     fetchContact()
  //   }
  // }, [contactId, accessToken, graphqlClient, operation])

  // const operationBadge = getOperationBadge(operation)

  // const handleClick = () => {
  //   if (contactId) {
  //     const url = buildPlatformUrl('/platform/crm/contact-record', {
  //       contactId: contactId,
  //       source: 'every-ai'
  //     })
  //     navigateTo(url)
  //   }
  // }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-success-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  )

  const handleTitleClick = () => {
    if (!contactId) return
    const url = buildPlatformUrl('/platform/crm/contact-record', {
      contactId,
      source: 'every-ai'
    })
    navigateTo(url)
  }

  const content = textHuman || ''
  // Convert single newlines to hard line breaks in markdown
  const contentWithLineBreaks = content.replace(/\n/g, '  \n')

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="contact-display-markdown">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon}
          <CardTitle className="gba:text-base gba:font-bold gba:text-foreground">
            <button
              type="button"
              className="gba:underline hover:gba:text-primary"
              onClick={handleTitleClick}
              data-testid="contact-title-link"
            >
              {textTitle || 'Contact'}
            </button>
          </CardTitle>
        </div>
        {getOperationBadge(operation) && (
          <Badge
            variant={getOperationBadge(operation)!.variant}
            className="gba:text-xs"
            data-testid="contact-operation-badge"
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

export default ContactDisplay
