import React, { useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Badge,
  Spinner,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent
} from '@newwork/nw-design-system'
import { ChevronLeft, Cake, Trophy, Users, MailOpen } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamBirthday } from '../hooks/useTeamBirthdays'
import { TeamAnniversary } from '../hooks/useTeamAnniversaries'
import { OpenJobPosition, JobPosition } from '../hooks/useOpenJobPositions'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'

type InsightsTab = 'birthdays' | 'anniversaries' | 'open-positions'

export interface TeamInsightsViewProps {
  upcomingBirthdays: TeamBirthday[]
  upcomingAnniversaries: TeamAnniversary[]
  openPositions: OpenJobPosition[]
  fullPositions: JobPosition[]
  loadingBirthdays: boolean
  loadingAnniversaries: boolean
  loadingOpenPositions: boolean
  activeInsightsTab: InsightsTab
  setActiveInsightsTab: (tab: InsightsTab) => void
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const TeamInsightsView: React.FC<TeamInsightsViewProps> = ({
  upcomingBirthdays,
  upcomingAnniversaries,
  openPositions,
  fullPositions,
  loadingBirthdays,
  loadingAnniversaries,
  loadingOpenPositions,
  activeInsightsTab,
  setActiveInsightsTab,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [isPositionSheetOpen, setIsPositionSheetOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null)

  const handleOpenPositionSheet = (positionId: string) => {
    const position = fullPositions.find(p => p.id === positionId)
    if (position) {
      setSelectedPosition(position)
      setIsPositionSheetOpen(true)
    }
  }

  return (
    <>
      <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
        {/* Header section */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="gba:mr-4"
              data-testid="manager-dashboard-insights-back-button"
            >
              <ChevronLeft size={16} className="gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_insights', 'Team Insights')}
            </h1>
          </div>
        </div>

        {/* Tabs for Insights */}
        <Card className="gba:flex-1 gba:flex gba:flex-col">
          <CardContent className="gba:flex-1 gba:p-0">
            <Tabs
              value={activeInsightsTab}
              onValueChange={value => setActiveInsightsTab(value as InsightsTab)}
              className="gba:flex-1 gba:flex gba:flex-col gba:h-full"
            >
              <TabsList className="gba:inline-flex gba:m-4">
                <TabsTrigger value="birthdays">
                  <div className="gba:flex gba:flex-row gba:items-center gba:gap-2">
                    <Cake size={16} />
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthdays')}</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="anniversaries">
                  <div className="gba:flex gba:flex-row gba:items-center gba:gap-2">
                    <Trophy size={16} />
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversaries')}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="open-positions">
                  <div className="gba:flex gba:flex-row gba:items-center gba:gap-2">
                    <Users size={16} />
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.open_positions',
                        'Open Positions'
                      )}
                    </span>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* Birthdays Tab */}
              <TabsContent value="birthdays" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                {loadingBirthdays ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                    <Spinner size="lg" />
                  </div>
                ) : upcomingBirthdays.length === 0 ? (
                  <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.no_upcoming_birthdays',
                        'No upcoming birthdays in the next 30 days'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:forms.capability.fields.name.label',
                              'Name'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthday')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingBirthdays.map(person => (
                          <TableRow
                            key={person.id}
                            className="gba:cursor-pointer hover:gba:bg-gray-50"
                            onClick={() => onNavigateToEmployee(person.id)}
                          >
                            <TableCell>
                              <div className="gba:flex gba:items-center gba:space-x-3">
                                <Avatar size="sm" className="gba:h-8 gba:w-8">
                                  <AvatarImage
                                    src={
                                      person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                                        ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                                        : undefined
                                    }
                                    alt={person.fullName}
                                  />
                                  <AvatarFallback>
                                    {`${person.firstName[0]}${person.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="gba:font-medium">{person.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="gba:text-sm gba:text-neutral-600">
                                {person.birthDate ? dayjs(person.birthDate).format('MMMM D') : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!person.email}
                                onClick={e => {
                                  e.stopPropagation()
                                  if (person.email) {
                                    const subject = encodeURIComponent(
                                      getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.birthday_email_subject',
                                        `Happy Birthday, ${person.firstName}!`
                                      )
                                    )
                                    const body = encodeURIComponent(
                                      getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.birthday_email_body',
                                        `Dear ${person.firstName},\n\nWishing you a wonderful birthday!\n\nBest regards`
                                      )
                                    )
                                    globalThis.location.href = `mailto:${person.email}?subject=${subject}&body=${body}`
                                  }
                                }}
                                title={
                                  person.email
                                    ? ''
                                    : getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.no_email',
                                        'No email available'
                                      )
                                }
                              >
                                <MailOpen size={16} className="gba:mr-1" />
                                {getTranslationFromI18nKeyAndLabel(
                                  'master-data:hr.manager_dashboard.send_message',
                                  'Send Message'
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Anniversaries Tab */}
              <TabsContent value="anniversaries" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                {loadingAnniversaries ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                    <Spinner size="lg" />
                  </div>
                ) : upcomingAnniversaries.length === 0 ? (
                  <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.no_upcoming_anniversaries',
                        'No upcoming work anniversaries in the next 30 days'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:forms.capability.fields.name.label',
                              'Name'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.years', 'Years')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingAnniversaries.map(person => (
                          <TableRow
                            key={person.id}
                            className="gba:cursor-pointer hover:gba:bg-gray-50"
                            onClick={() => onNavigateToEmployee(person.id)}
                          >
                            <TableCell>
                              <div className="gba:flex gba:items-center gba:space-x-3">
                                <Avatar size="sm" className="gba:h-8 gba:w-8">
                                  <AvatarImage
                                    src={
                                      person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                                        ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                                        : undefined
                                    }
                                    alt={person.fullName}
                                  />
                                  <AvatarFallback>
                                    {`${person.firstName[0]}${person.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="gba:font-medium">{person.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="gba:text-sm gba:text-neutral-600">
                                {person.hireDate ? dayjs(person.hireDate).format('MMMM D') : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="info" size="sm">
                                {person.yearsOfService} {person.yearsOfService === 1 ? 'year' : 'years'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!person.email}
                                onClick={e => {
                                  e.stopPropagation()
                                  if (person.email) {
                                    const subject = encodeURIComponent(
                                      getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.anniversary_email_subject',
                                        `Congratulations on your ${person.yearsOfService}-year anniversary!`
                                      )
                                    )
                                    const body = encodeURIComponent(
                                      getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.anniversary_email_body',
                                        `Dear ${person.firstName},\n\nCongratulations on your ${person.yearsOfService}-year work anniversary! Thank you for your dedication and contributions.\n\nBest regards`
                                      )
                                    )
                                    globalThis.location.href = `mailto:${person.email}?subject=${subject}&body=${body}`
                                  }
                                }}
                                title={
                                  person.email
                                    ? ''
                                    : getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.no_email',
                                        'No email available'
                                      )
                                }
                              >
                                <MailOpen size={16} className="gba:mr-1" />
                                {getTranslationFromI18nKeyAndLabel(
                                  'master-data:hr.manager_dashboard.send_message',
                                  'Send Message'
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Open Positions Tab */}
              <TabsContent value="open-positions" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                {loadingOpenPositions ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                    <Spinner size="lg" />
                  </div>
                ) : openPositions.length === 0 ? (
                  <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.no_open_positions',
                        'No open positions in your team'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_positions_section.position',
                              'Position'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_function',
                              'Job Function'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.employee_table.status_column',
                              'Status'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openPositions.map(position => (
                          <TableRow
                            key={position.id}
                            className="gba:cursor-pointer hover:gba:bg-gray-50"
                            onClick={() => handleOpenPositionSheet(position.id)}
                          >
                            <TableCell>
                              <div className="gba:flex gba:flex-col">
                                <span className="gba:font-medium">{position.name}</span>
                                {position.jobLevelName && (
                                  <span className="gba:text-sm gba:text-muted-foreground">{position.jobLevelName}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="gba:text-sm gba:text-neutral-600">
                                {position.organizationalUnitName || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="gba:text-sm gba:text-neutral-600">{position.jobFunctionName || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="warning" size="sm">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:human_resources_page.job_positions_section.vacant',
                                  'Vacant'
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleOpenPositionSheet(position.id)
                                }}
                              >
                                {getTranslationFromI18nKeyAndLabel(
                                  'master-data:hr.manager_dashboard.view_details',
                                  'View Details'
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Job Position Detail Sheet - Reusing JobPositionDetails from human-resources */}
      <Sheet open={isPositionSheetOpen} onOpenChange={setIsPositionSheetOpen} title="">
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0">
          {/* Top spacing to avoid close button overlap */}
          <div className="gba:h-10 gba:flex-shrink-0" />
          {/* Scrollable content area */}
          <div className="gba:flex-1 gba:overflow-y-auto">
            {selectedPosition && accessToken && (
              <JobPositionDetails jobPosition={selectedPosition} accessToken={accessToken} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
