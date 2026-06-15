import { cloneElement, isValidElement, ReactElement } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
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
      className="gba:shadow-md gba:rounded-xl gba:overflow-hidden gba:border gba:border-border"
      data-testid={dataTestId}
    >
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-3">
          {icon && (
            <div
              className="gba:flex gba:items-center gba:justify-center gba:p-2 gba:rounded-lg gba:bg-decorative-secondary gba:text-info"
              data-testid={`${dataTestId}-Title-Icon`}
            >
              {isValidElement(icon)
                ? cloneElement(icon as ReactElement, {
                    size: 24,
                    className: 'gba:text-info'
                  })
                : icon}
            </div>
          )}
          <CardTitle className="gba:text-base gba:text-info">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {typeof description === 'string' && description.trim().length > 0 && (
          <p className="gba:mb-4 gba:text-sm gba:text-muted-foreground">{description}</p>
        )}

        {entries && entries.length > 0 && (
          <div className="gba:relative gba:text-xs">
            {entries.map(entry => (
              <div key={`${entry.url}-${entry.label}`} className="gba:mb-2">
                {entry.disabled ? (
                  <div className="gba:flex gba:cursor-not-allowed gba:items-center gba:justify-between gba:rounded-lg gba:bg-muted gba:px-4 gba:py-3 gba:text-muted-foreground gba:opacity-60">
                    <span className="gba:font-medium">{entry.label}</span>
                    <CaretRightIcon size={16} className="gba:text-base gba:opacity-50" />
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid={`${dataTestId}-Navigation-Item`}
                    className="gba:flex gba:w-full gba:items-center gba:justify-between gba:rounded-lg gba:border gba:border-transparent gba:bg-muted gba:px-4 gba:py-3 gba:text-left gba:text-foreground gba:transition-colors hover:gba:border-info-secondary hover:gba:bg-decorative-secondary hover:gba:text-info"
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
                      className="gba:text-base gba:transition-transform"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
