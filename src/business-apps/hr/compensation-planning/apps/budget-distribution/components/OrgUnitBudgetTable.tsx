import React from 'react'
import { Card, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, Spinner } from '@newwork/nw-design-system'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'

interface OrgUnitBudgetTableProps {
  accessToken: string
  companyId: string
}

export const OrgUnitBudgetTable: React.FC<OrgUnitBudgetTableProps> = ({ accessToken, companyId }) => {
  const { units, loading } = useCompanyOrganizationalUnits(accessToken, companyId, 100)

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="gba:overflow-hidden">
      <div className="gba:overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Org Unit</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="gba:text-right">Salary Budget</TableHead>
              <TableHead className="gba:text-right">Bonus Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  No organizational units found for this company.
                </TableCell>
              </TableRow>
            ) : (
              units.map(unit => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <span className="gba:font-medium">{unit.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="gba:text-sm gba:text-muted-foreground">{unit.code ?? '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="gba:text-sm gba:text-muted-foreground">{unit.type ?? '-'}</span>
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:text-sm gba:text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:text-sm gba:text-muted-foreground">-</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
