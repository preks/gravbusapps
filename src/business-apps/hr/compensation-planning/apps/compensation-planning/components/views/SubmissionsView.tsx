import React from 'react'
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'

interface SubmissionsViewProps {
  accessToken: string
  companyId: string
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({ accessToken, companyId }) => {
  const { units, loading } = useCompanyOrganizationalUnits(accessToken, companyId, 100)

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      <Alert>
        <AlertTitle>Not Available Yet</AlertTitle>
        <AlertDescription>
          Manager submissions require the compensation proposal backend tables to be configured. Below is the list of
          organizational units that will participate in compensation planning.
        </AlertDescription>
      </Alert>

      <Card className="gba:overflow-hidden">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Org Unit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:py-8 gba:text-muted-foreground">
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
                    <TableCell>
                      <Badge variant="secondary">Not started</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
