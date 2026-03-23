import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Card
} from '@newwork/nw-design-system'
import { CalendarIcon, TrendUpIcon, ClockIcon } from '@phosphor-icons/react'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatCurrency, formatPercent } from '../../../utils/budgetCalculations'
import { CompaRatioBar } from './CompaRatioBar'
import { PerformanceBadge } from './PerformanceBadge'

interface TeamAllocationGridProps {
  members: TeamMemberCompensationData[]
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return 'This month'
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  const remaining = months % 12
  return remaining > 0 ? `${years}y ${remaining}mo ago` : `${years}y ago`
}

function tenure(hireDate: string | null): string {
  if (!hireDate) return '-'
  const diff = Date.now() - new Date(hireDate).getTime()
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30))
  if (years === 0) return `${months}mo`
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

export const TeamAllocationGrid: React.FC<TeamAllocationGridProps> = ({ members }) => {
  if (members.length === 0) {
    return (
      <Card>
        <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
          No team members found for the selected filters.
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="gba:overflow-hidden">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:min-w-[220px]">Employee</TableHead>
                <TableHead className="gba:w-[60px]">Level</TableHead>
                <TableHead className="gba:w-[80px]">Tenure</TableHead>
                <TableHead className="gba:w-[120px]">Current Salary</TableHead>
                <TableHead className="gba:w-[150px]">Band Position</TableHead>
                <TableHead className="gba:w-[170px]">Performance</TableHead>
                <TableHead className="gba:w-[120px]">Last Raise</TableHead>
                <TableHead className="gba:w-[100px] gba:text-right">Bonuses YTD</TableHead>
                <TableHead className="gba:w-[100px] gba:text-right">Benefits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.employeeId}>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:h-8 gba:w-8">
                        {member.pictureThumbnail ? (
                          <AvatarImage src={member.pictureThumbnail} alt={member.displayName} />
                        ) : null}
                        <AvatarFallback className="gba:text-xs">
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:min-w-0">
                        <div className="gba:font-medium gba:text-sm gba:truncate">{member.displayName}</div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                          {member.jobPosition ?? '-'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">
                      {member.jobLevel ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                          <ClockIcon size={12} />
                          {tenure(member.hireDate)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{member.hireDate ? `Hired: ${member.hireDate}` : 'Unknown'}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="gba:font-medium gba:text-sm">
                        {formatCurrency(member.currentAnnualSalary, member.currency)}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {formatCurrency(member.currentMonthlySalary, member.currency)}/mo
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CompaRatioBar
                      compaRatio={member.compaRatio}
                      band={member.compensationBand}
                      currentSalary={member.currentAnnualSalary}
                    />
                  </TableCell>
                  <TableCell>
                    <PerformanceBadge
                      rating={member.performanceRating}
                      numericRating={member.performanceRatingNumeric}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                        <CalendarIcon size={12} />
                        {daysSince(member.lastRaiseDate)}
                      </div>
                      {member.lastRaiseAmount != null && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                          <TrendUpIcon size={12} />
                          {formatCurrency(member.lastRaiseAmount, member.currency)} (
                          {formatPercent(member.lastRaisePercent)})
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:text-sm">{formatCurrency(member.currentBonusTotal, member.currency)}</span>
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:text-sm">{formatCurrency(member.currentBenefitsTotal, member.currency)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </TooltipProvider>
  )
}
