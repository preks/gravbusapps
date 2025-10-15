import React from 'react'
import { Card } from 'antd'
import { ContactData } from '../queries/ContactQueries'

interface CompanyInformationProps {
  contact: ContactData
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ contact }) => {
  return (
    <Card title="Company Information" style={{ width: '100%', height: '100%' }}>
      <div>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Company Name</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.account?.name || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Contact Type</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.contactType || '-'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Academic Title</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.academicTitle?.value || '-'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>LinkedIn</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.linkedinUrl ? (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      View Profile
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>XING</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.xingUrl ? (
                    <a
                      href={contact.xingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      View Profile
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Owner</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {contact?.ownerEmployee
                    ? `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio section */}
        {contact?.bio && (
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Bio</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', lineHeight: '1.5' }}>
              {contact.bio}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
