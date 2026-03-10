import React from 'react'
import { Alert } from '@newwork/nw-design-system'

interface BackofficeTabHeaderAlertProps {
  wrapperTestId: string
  alertTestId: string
  title: string
  description: string
}

const BackofficeTabHeaderAlert: React.FC<BackofficeTabHeaderAlertProps> = ({
  wrapperTestId,
  alertTestId,
  title,
  description
}) => (
  <div className="gba:mb-4" data-testid={wrapperTestId}>
    <Alert variant="default" data-testid={alertTestId}>
      <div>
        <h4 className="gba:font-semibold">{title}</h4>
        <p className="gba:text-sm gba:mt-1">{description}</p>
      </div>
    </Alert>
  </div>
)

export default BackofficeTabHeaderAlert
