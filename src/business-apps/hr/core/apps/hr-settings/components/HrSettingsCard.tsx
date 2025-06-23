import { cloneElement, isValidElement, ReactElement } from 'react'
import { RiArrowRightSLine } from '@remixicon/react'
import { Card, Typography, Divider, Badge } from 'antd'

export interface HrSettingsCardEntry {
  label: string
  url: string
  disabled?: boolean
}

export interface HrSettingsCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  entries?: HrSettingsCardEntry[]
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'HrSettingsCard'

export const HrSettingsCard = ({ title, description, icon, entries, prefixDataTestId }: HrSettingsCardProps) => {
  const dataTestId = `${prefixDataTestId}-${DATA_TEST_ID}`

  return (
    <Card
      hoverable
      className="gba:shadow-md"
      style={{ 
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
      data-testid={dataTestId}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {icon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#eff6ff',
                padding: '8px',
                borderRadius: '8px',
                color: '#2563eb'
              }}
              data-testid={`${dataTestId}-Title-Icon`}
            >
              {isValidElement(icon)
                ? cloneElement(icon as ReactElement, {
                    size: 24
                  })
                : icon}
            </div>
          )}
          <span style={{ color: '#1e40af', fontWeight: 600, fontSize: '16px' }}>
            {title}
          </span>
        </div>
      }
    >
      {typeof description === 'string' && description.trim().length > 0 && (
        <Typography.Paragraph 
          style={{ 
            color: '#6b7280', 
            marginBottom: '16px',
            fontSize: '14px'
          }}
        >
          {description}
        </Typography.Paragraph>
      )}

      {entries && entries.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Badge.Ribbon 
            text={`${entries.length} items`} 
            color="blue" 
            style={{ fontSize: '12px' }}
          >
            <div style={{ paddingTop: '8px' }}>
              {entries.map((entry, idx) => (
                <div 
                  key={`${idx}-${entry.label}`}
                  style={{ marginBottom: '8px' }}
                >
                  {entry.disabled ? (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        color: '#9ca3af',
                        cursor: 'not-allowed'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{entry.label}</span>
                      <RiArrowRightSLine style={{ fontSize: '16px', opacity: 0.5 }} />
                    </div>
                  ) : (
                    <div
                      data-testid={`${dataTestId}-Navigation-Item`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                        e.currentTarget.style.color = '#1d4ed8';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.color = '#374151';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      onClick={() => {
                        window.location.href = entry.url
                      }}
                    >
                      <span 
                        data-testid={`${dataTestId}-Navigation-Label`} 
                        style={{ fontWeight: 500 }}
                      >
                        {entry.label}
                      </span>
                      <RiArrowRightSLine
                        data-testid={`${dataTestId}-Navigation-Icon`}
                        style={{ fontSize: '16px', transition: 'transform 0.2s' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Badge.Ribbon>
        </div>
      )}
    </Card>
  )
} 