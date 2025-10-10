import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetAccountContact } from '../../../queries/AccountContactQueries'

interface ContactInformationProps {
  accountData?: any
  accountId?: string
  context?: BusinessAppContextProps
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  accountData: providedAccountData,
  accountId,
  context
}) => {
  const [accountContact, setAccountContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use AccountContact GraphQL query hook if context is provided
  const { fetchAccountContact } = context ? useGetAccountContact(context) : { fetchAccountContact: null }

  useEffect(() => {
    // Fetch AccountContact data if we have the necessary props
    if (accountId && fetchAccountContact) {
      const loadAccountContactData = async () => {
        setLoading(true)
        setError(null)
        try {
          const result = await fetchAccountContact({
            accountId,
            contactType: 'PRIMARY_CONTACT'
          })
          // Get the first primary contact if available
          const primaryContact = result.AccountContact?.[0] || null
          setAccountContact(primaryContact)
        } catch (err) {
          console.error('ContactInformation: Error loading contact data:', err)
          // Don't set error state - just fall back to account data
          setAccountContact(null)
        } finally {
          setLoading(false)
        }
      }

      loadAccountContactData()
    } else {
      // If we don't have the fetch function, just show the component without loading
      setLoading(false)
    }
  }, [accountId]) // Removed fetchAccountContact from dependency array to prevent infinite loop

  const getContactField = (field: string): string => {
    if (!accountContact?.contact) {
      // Fallback to provided account data if no AccountContact data
      if (providedAccountData) {
        switch (field) {
          case 'email':
            return providedAccountData?.email || '-'
          case 'phone':
          case 'phoneNumber':
            return providedAccountData?.phone || providedAccountData?.phoneNumber || '-'
          case 'firstName':
            return providedAccountData?.firstName || '-'
          case 'lastName':
            return providedAccountData?.lastName || '-'
          case 'position':
          case 'jobTitle':
            return providedAccountData?.position || providedAccountData?.jobTitle || '-'
          default:
            return '-'
        }
      }
      return '-'
    }

    const contact = accountContact.contact
    return contact[field] || '-'
  }

  const getCreatedAt = (): string => {
    const createdAt = accountContact?.createdAt || providedAccountData?.createdAt || providedAccountData?.dateCreated
    if (!createdAt) return '-'

    try {
      return dayjs(createdAt).format('MMM D, YYYY, h:mm A')
    } catch {
      return '-'
    }
  }

  if (loading) {
    return (
      <Card className="gba:w-full gba:h-full" data-testid="contact-information-loading">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-10">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:h-full" data-testid="contact-information-error">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <div className="gba:font-medium">Error Loading Contact Information</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full gba:h-full" data-testid="contact-information-card">
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: '16px' }} data-testid="contact-first-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('firstName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="contact-last-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('lastName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="contact-email">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email')
              if (email === '-') return '-'

              return (
                <a
                  href={`mailto:${email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="contact-email-link"
                >
                  {email}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="contact-phone">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber')
              if (phone === '-') return '-'

              return (
                <a
                  href={`tel:${phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="contact-phone-link"
                >
                  {phone}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="contact-job-title">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('jobTitle')}</div>
        </div>

        <div data-testid="contact-created-at">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getCreatedAt()}</div>
        </div>
      </CardContent>
    </Card>
  )
}
