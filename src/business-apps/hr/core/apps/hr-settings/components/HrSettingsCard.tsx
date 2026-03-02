import { cloneElement, isValidElement, ReactElement } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { Card, Typography } from 'antd'
import { navigateTo } from '@/common/utils/navigationUtils'

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
      className="gba:shadow-md gba:rounded-xl gba:overflow-hidden gba:border gba:border-border"
      data-testid={dataTestId}
      title={
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon && (
            <div
              className="gba:flex gba:items-center gba:justify-center gba:p-2 gba:rounded-lg gba:bg-decorative-secondary gba:text-info"
              data-testid={`${dataTestId}-Title-Icon`}
            >
              {isValidElement(icon)
                ? cloneElement(icon as ReactElement, {
                    size: 24
                  })
                : icon}
            </div>
          )}
          <span className="gba:font-semibold gba:text-base gba:text-info">{title}</span>
        </div>
      }
    >
      {typeof description === 'string' && description.trim().length > 0 && (
        <Typography.Paragraph className="gba:mb-4 gba:text-sm gba:text-muted-foreground">
          {description}
        </Typography.Paragraph>
      )}

      {entries && entries.length > 0 && (
        <div className="gba:relative">
          <div className="gba:text-xs">
            <div className="gba:pt-2">
              {entries.map((entry, idx) => (
                <div key={`${idx}-${entry.label}`} className="gba:mb-2">
                  {entry.disabled ? (
                    <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:cursor-not-allowed gba:bg-muted gba:text-muted-foreground gba:opacity-60">
                      <span className="gba:font-medium">{entry.label}</span>
                      <CaretRightIcon size={16} className="gba:text-base gba:opacity-50" />
                    </div>
                  ) : (
                    <div
                      data-testid={`${dataTestId}-Navigation-Item`}
                      className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:duration-200 gba:border gba:border-transparent gba:bg-muted gba:text-foreground"
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--nw-decorative-secondary)'
                        e.currentTarget.style.color = 'var(--nw-info)'
                        e.currentTarget.style.borderColor = 'var(--nw-info-secondary)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'var(--nw-muted)'
                        e.currentTarget.style.color = 'var(--nw-foreground)'
                        e.currentTarget.style.borderColor = 'transparent'
                      }}
                      onClick={() => {
                        navigateTo(entry.url)
                      }}
                    >
                      <span data-testid={`${dataTestId}-Navigation-Label`} className="gba:font-medium">
                        {entry.label}
                      </span>
                      <CaretRightIcon
                        size={16}
                        data-testid={`${dataTestId}-Navigation-Icon`}
                        className="gba:text-base gba:transition-transform gba:duration-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
