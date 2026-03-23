import React from 'react'
import { Card, CardContent, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'

interface BudgetSetupViewProps {
  accessToken: string
  companyId: string
}

export const BudgetSetupView: React.FC<BudgetSetupViewProps> = () => {
  return (
    <div className="gba:space-y-4">
      <Alert>
        <AlertTitle>Not Available Yet</AlertTitle>
        <AlertDescription>
          Budget setup requires the compensation planning cycle backend tables to be configured. Once available, you
          will be able to define salary, bonus, and benefits budgets per company as either absolute amounts or a
          percentage of current salary cost.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="gba:p-6">
          <h3 className="gba:text-sm gba:font-semibold gba:mb-4">Planned Features</h3>
          <ul className="gba:space-y-2 gba:text-sm gba:text-muted-foreground">
            <li className="gba:flex gba:items-start gba:gap-2">
              <span className="gba:text-muted-foreground">•</span>
              Set salary increase budget per company (absolute or % of salary cost)
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <span className="gba:text-muted-foreground">•</span>
              Set bonus budget per company (absolute or % of salary cost)
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <span className="gba:text-muted-foreground">•</span>
              Set benefits budget per company (absolute or % of benefits cost)
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <span className="gba:text-muted-foreground">•</span>
              View total budget across all companies
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
