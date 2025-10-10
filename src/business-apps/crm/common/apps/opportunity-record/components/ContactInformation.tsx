import React, { useState, useEffect } from 'react'
import { Card } from 'antd'
import { Spinner, Alert } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetOpportunityContact } from '../../../queries/OpportunityContactQueries'

interface ContactInformationProps {
  opportunityData?: any
  opportunityId?: string
  context?: BusinessAppContextProps
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ opportunityData, opportunityId, context }) => {
  const [opportunityContact, setOpportunityContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use OpportunityContact GraphQL query hook if context is provided
  const { fetchOpportunityContact } = context ? useGetOpportunityContact(context) : { fetchOpportunityContact: null }

  useEffect(() => {
    // Fetch OpportunityContact data if we have the necessary props
    if (opportunityId && fetchOpportunityContact) {
      const loadOpportunityContactData = async () => {
        setLoading(true)
        setError(null)
        try {
          const result = await fetchOpportunityContact({
            opportunityId,
            contactType: 'PRIMARY_CONTACT'
          })
          // Get the first primary contact if available
          const primaryContact = result.OpportunityContact?.[0] || null
          setOpportunityContact(primaryContact)
        } catch (err) {
          console.error('ContactInformation: Error loading opportunity contact data:', err)
          // Don't set error state - just fall back to opportunity data
          setOpportunityContact(null)
        } finally {
          setLoading(false)
        }
      }

      loadOpportunityContactData()
    } else {
      // If we don't have the fetch function, just show the component without loading
      setLoading(false)
    }
  }, [opportunityId]) // Removed fetchOpportunityContact from dependency array to prevent infinite loop

  const getContactField = (field: string): string => {
    if (!opportunityContact?.contact) {
      // Fallback to provided opportunity data if no OpportunityContact data
      const contact = opportunityData?.contact
      if (contact) {
        switch (field) {
          case 'email':
            return contact?.email || '-'
          case 'phone':
          case 'phoneNumber':
            return contact?.phone || contact?.phoneNumber || '-'
          case 'firstName':
            return contact?.firstName || '-'
          case 'lastName':
            return contact?.lastName || '-'
          case 'position':
          case 'jobTitle':
            return contact?.jobTitle || contact?.position || '-'
          default:
            return '-'
        }
      }
      return '-'
    }

    const contact = opportunityContact.contact
    return contact[field] || '-'
  }

  const getCreatedAt = (): string => {
    const createdAt = opportunityContact?.createdAt || opportunityData?.contact?.createdAt || opportunityData?.createdAt
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
        title="Contact"
        style={{ width: '100%', height: '100%' }}
        data-testid="opportunity-contact-information-loading"
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
        title="Contact"
        style={{ width: '100%', height: '100%' }}
        data-testid="opportunity-contact-information-error"
      >
        <Alert variant="destructive">
          <div className="gba:font-medium">Error Loading Contact Information</div>
          <div className="gba:text-sm gba:mt-1">{error}</div>
        </Alert>
      </Card>
    )
  }

  return (
    <Card title="Contact" style={{ width: '100%', height: '100%' }} data-testid="opportunity-contact-information-card">
      <div>
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-first-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('firstName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-last-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('lastName')}</div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-email">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email')
              if (email === '-') return '-'

              return (
                <a
                  href={`mailto:${email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="opportunity-contact-email-link"
                >
                  {email}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-phone">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber')
              if (phone === '-') return '-'

              return (
                <a
                  href={`tel:${phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="opportunity-contact-phone-link"
                >
                  {phone}
                </a>
              )
            })()}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-job-title">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getContactField('jobTitle') || getContactField('position')}
          </div>
        </div>

        <div data-testid="opportunity-contact-created-at">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getCreatedAt()}</div>
        </div>
      </div>
    </Card>
  )
}
