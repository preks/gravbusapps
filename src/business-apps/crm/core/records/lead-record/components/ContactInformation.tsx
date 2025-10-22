import React, { useState, useEffect } from 'react'
import { Card } from 'antd'
import { Spinner, Alert } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetLeadContact } from '@/business-apps/crm/common/queries/LeadContactQueries'

interface ContactInformationProps {
  leadData?: any
  leadId?: string
  context?: BusinessAppContextProps
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ leadData, leadId, context }) => {
  const [leadContact, setLeadContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use LeadContact GraphQL query hook if context is provided
  const { fetchLeadContact } = context ? useGetLeadContact(context) : { fetchLeadContact: null }

  useEffect(() => {
    // Fetch LeadContact data if we have the necessary props
    if (leadId && fetchLeadContact) {
      const loadLeadContactData = async () => {
        setLoading(true)
        setError(null)
        try {
          const result = await fetchLeadContact({
            leadId,
            contactType: 'PRIMARY_CONTACT'
          })
          // Get the first primary contact if available
          const primaryContact = result.LeadContact?.[0] || null
          setLeadContact(primaryContact)
        } catch (err) {
          console.error('ContactInformation: Error loading lead contact data:', err)
          // Don't set error state - just fall back to lead data
          setLeadContact(null)
        } finally {
          setLoading(false)
        }
      }

      loadLeadContactData()
    } else {
      // If we don't have the fetch function, just show the component without loading
      setLoading(false)
    }
  }, [leadId]) // Removed fetchLeadContact from dependency array to prevent infinite loop

  const getContactField = (field: string): string => {
    if (!leadContact?.contact) {
      // Fallback to provided lead data if no LeadContact data
      if (leadData) {
        switch (field) {
          case 'email':
            return leadData?.email || '-'
          case 'phone':
          case 'phoneNumber':
            return leadData?.phone || leadData?.phoneNumber || '-'
          case 'firstName':
            return leadData?.firstName || '-'
          case 'lastName':
            // Handle special case for lastName that might contain unwanted text
            return leadData?.lastName &&
              typeof leadData.lastName === 'string' &&
              !leadData.lastName.includes('AcademicTitle')
              ? leadData.lastName
              : '-'
          case 'position':
          case 'jobTitle':
            return leadData?.position || leadData?.jobTitle || '-'
          default:
            return '-'
        }
      }
      return '-'
    }

    const contact = leadContact.contact
    return contact[field] || '-'
  }

  const getCreatedAt = (): string => {
    const createdAt = leadContact?.createdAt || leadData?.createdAt || leadData?.dateCreated
    if (!createdAt) return '-'

    try {
      return dayjs(createdAt).format('MMM D, YYYY, h:mm A')
    } catch {
      return '-'
    }
  }

  if (loading) {
    return (
      <Card
        title="Contact Information"
        style={{ width: '100%', height: '100%' }}
        data-testid="lead-contact-information-loading"
      >
        <div className="gba:text-center gba:py-10">
          <Spinner size="lg" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card
        title="Contact Information"
        style={{ width: '100%', height: '100%' }}
        data-testid="lead-contact-information-error"
      >
        <Alert variant="destructive">
          <div className="gba:font-medium">Error Loading Contact Information</div>
          <div className="gba:text-sm gba:mt-1">{error}</div>
        </Alert>
      </Card>
    )
  }

  return (
    <Card
      title="Contact Information"
      style={{ width: '100%', height: '100%' }}
      data-testid="lead-contact-information-card"
    >
      <div>
        <div style={{ marginBottom: '16px' }} data-testid="lead-contact-first-name">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            First Name
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('firstName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="lead-contact-last-name">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            Last Name
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('lastName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="lead-contact-email">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            Email
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email')
              if (email === '-') return '-'

              return (
                <a
                  href={`mailto:${email}`}
                  className="gba:text-primary gba:no-underline"
                  data-testid="lead-contact-email-link"
                >
                  {email}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="lead-contact-phone">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            Phone Number
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber')
              if (phone === '-') return '-'

              return (
                <a
                  href={`tel:${phone}`}
                  className="gba:text-primary gba:no-underline"
                  data-testid="lead-contact-phone-link"
                >
                  {phone}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="lead-contact-job-title">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            Position
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getContactField('jobTitle') || getContactField('position')}
          </div>
        </div>

        <div data-testid="lead-contact-created-at">
          <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
            Created At
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getCreatedAt()}</div>
        </div>
      </div>
    </Card>
  )
}
