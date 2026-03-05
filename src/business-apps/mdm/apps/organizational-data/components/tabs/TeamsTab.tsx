import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsDownUpIcon,
  EyeIcon,
  XCircleIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  UsersIcon,
  UserIcon,
  CrownSimpleIcon,
  CalendarBlankIcon,
  GaugeIcon,
  ListDashesIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeams } from '../../hooks'
import { Team } from '../../types'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Icon,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  ToggleGroup,
  ToggleGroupItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DataTable,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Alert,
  AlertTitle,
  AlertDescription,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import CardTabHeaderComponent from '../../../generic-components/card'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { InfoIcon } from 'lucide-react'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import TeamForm from '@/business-apps/mdm/forms/team-form'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface TeamsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'TeamsTab'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

const TeamsTab: React.FC<TeamsTabProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)

  const { teams, structureId, isLoading, error, refetch, searchTeams, getSortedTeams, totalTeams } = useTeams(context)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'rank' | 'created' | 'leader'>('rank')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    if (selectedTeam) {
      const updatedSelectedTeam = teams.find(team => team.id === selectedTeam.id)

      if (updatedSelectedTeam) {
        setSelectedTeam(updatedSelectedTeam)
      }
    }
  }, [teams, selectedTeam])

  // Get filtered and sorted teams
  const getDisplayTeams = (): Team[] => {
    let filteredTeams = teams

    // Apply search filter
    if (searchQuery.trim()) {
      filteredTeams = searchTeams(searchQuery)
    }

    // Apply sorting
    return getSortedTeams(sortBy, filteredTeams)
  }

  const handleView = (team: Team | undefined) => {
    if (!team) return
    setSelectedTeam(team)
    setDrawerVisible(true)
  }

  const handleDeleteTeam = async (team: Team | undefined) => {
    if (!team) return

    await restClient.delete(`/matrix-units/${team.id}`, {
      headers: { Authorization: `Bearer ${context.accessToken}` }
    })

    refetch()
  }

  const parseImageUrl = (pictureUrl: string): string | null => {
    try {
      if (!pictureUrl) return null
      const parsed = JSON.parse(pictureUrl)
      return parsed.path || null
    } catch {
      return pictureUrl || null
    }
  }

  const drawerItems = useMemo(() => {
    if (!selectedTeam) return []

    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedTeam.name ?? '-'
          },
          {
            label: 'Description',
            value: selectedTeam.description ?? '-'
          }
        ]
      }
    ]

    if (selectedTeam.hasLeader) {
      items.push({
        icon: <CrownSimpleIcon />,
        title: 'Team Leader',
        verticalTable: true,
        items: [
          { label: 'Leader Name', value: selectedTeam.leaderName ?? '-' },
          {
            label: 'Role',
            value: selectedTeam.leaderRole ?? '-'
          },
          {
            label: 'Job Position',
            value: selectedTeam.leaderJobPosition ?? '-'
          },
          {
            label: 'Matrix Unit',
            value: selectedTeam.leaderMatrixUnitName ?? '-'
          }
        ]
      })
    }

    return items
  }, [selectedTeam])

  const renderTeamsTable = () => {
    const columns: ColumnDef<Team>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'leaderName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Leader
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const leaderName = row.original.leaderName
          const leaderJobPosition = row.original.leaderJobPosition

          return leaderName ? (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <p className="gba:font-semibold">{(leaderName as string) ?? '-'}</p>
              <p className="gba:text-sm gba:text-gray-500">{leaderJobPosition ?? '-'}</p>
            </div>
          ) : (
            '-'
          )
        }
      },
      {
        accessorKey: 'rank',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Rank
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => getValue() ?? '-'
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Created
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const age = row.original.age
          const createAt = new Date(row.original.createdAt).toLocaleDateString()
          return (
            <div className="gba:flex gba:items-center">
              <Tooltip>
                <TooltipTrigger className="gba:flex gba:items-center gba:gap-1">
                  <Icon icon={CalendarBlankIcon} /> {age}
                </TooltipTrigger>
                <TooltipContent>{createAt}</TooltipContent>
              </Tooltip>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const team = teams.find(team => team.id === row.original.id)

          return (
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(team)}
                data-testid={`${dataTestId}-view-function-${row.original.id}`}
              >
                <EyeIcon className="gba:h-4 gba:w-4" />
              </Button>

              <TeamForm
                childAddButton={
                  <Button
                    variant="ghost"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId}-edit-team-${team?.id}`}
                  >
                    <PencilSimpleLineIcon />
                  </Button>
                }
                structureId={structureId}
                teamsCount={totalTeams}
                accessToken={context.accessToken}
                refetch={refetch}
                team={team}
                isDrawerActive={true}
              />

              <DeleteButton onDelete={() => handleDeleteTeam(team)} itemName={team?.name ?? ''} itemTitle={'Team'} />
            </div>
          )
        }
      }
    ]

    const dataTable = displayTeams.map(team => ({ ...team }))

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        enableSorting
        enablePagination
        sorting={sorting}
        onSortingChange={setSorting}
      />
    )
  }

  const renderTeamCard = (team: Team) => {
    const imageUrl = parseImageUrl(team.leaderPictureUrl || '') ?? ''

    return (
      <Card className="gba:h-full gba:w-full gba:!p-6 gba:!gap-0 gba:cursor-pointer">
        <CardHeader
          className="gba:!flex gba:items-center gba:justify-between gba:gap-2 gba:w-full gba:h-full gba:!p-0 gba:!pb-4"
          onClick={() => handleView(team)}
        >
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-grow gba:h-full">
            <div>
              <UsersIcon className="gba:text-2xl gba:text-blue-500" />
            </div>
            <div className="gba:flex gba:flex-col gba:gap-2 gba:flex-grow">
              <h1 className="gba:text-md gba:font-semibold">{team.name}</h1>
              <Badge variant="info">Rank {team.rank}</Badge>
            </div>
          </div>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:h-full">
            <h1 className="gba:text-gray-500 gba:text-xs gba:flex gba:items-center gba:gap-1">
              <Icon icon={CalendarBlankIcon} />
              {team.age}
            </h1>
          </div>
        </CardHeader>
        <CardContent
          className="gba:flex gba:items-center gba:gap-2 gba:h-full gba:border-t gba:border-gray-200 gba:!p-0 gba:!py-4"
          onClick={() => handleView(team)}
        >
          {team.hasLeader ? (
            <>
              <Avatar size="default">
                <AvatarImage src={`data:image/jpeg;base64,${imageUrl}`} />
              </Avatar>
              <div>
                <div className="gba:flex gba:items-center gba:gap-1">
                  <Icon icon={CrownSimpleIcon} />
                  <h1 className="gba:text-sm gba:font-semibold">{team.leaderName}</h1>
                </div>
                <div className="gba:text-sm gba:text-gray-500">{team.leaderJobPosition}</div>
                <div></div>
              </div>
            </>
          ) : (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:gap-1">
              <Icon icon={UserIcon} className="gba:mr-1" />
              No leader assigned
            </div>
          )}
        </CardContent>
        <CardFooter className="gba:flex gba:items-center gba:gap-2 gba:h-6 gba:border-t gba:border-gray-200 gba:!pt-6">
          <TeamForm
            childAddButton={
              <Button
                variant="link"
                className="gba:w-1/2 gba:h-full gba:flex gba:items-center gba:justify-center"
                onClick={event => event.stopPropagation()}
              >
                <Icon icon={PencilSimpleLineIcon} />
              </Button>
            }
            structureId={structureId}
            teamsCount={totalTeams}
            accessToken={context.accessToken}
            refetch={refetch}
            team={team}
            isDrawerActive={true}
          />

          <DeleteButton onDelete={() => handleDeleteTeam(team)} itemName={team.name} itemTitle={'Team'} />
        </CardFooter>
      </Card>
    )
  }

  if (isLoading && teams.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Icon icon={XCircleIcon} />
            Error Loading Teams
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const displayTeams = getDisplayTeams()

  return (
    <Card data-testid={`${prefixDataTestId || ''}-TeamsTab`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <TeamForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-TeamsTab-AddButton`}
                >
                  <PlusIcon /> Add Team
                </Button>
              }
              structureId={structureId}
              teamsCount={totalTeams}
              accessToken={context.accessToken}
              refetch={refetch}
            />
          }
          cardTitle={`Matrix Teams (${totalTeams})`}
          cardDescription="Manage teams and their details"
        />
      )}

      <CardContent>
        {/* Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '16px'
          }}
        >
          <div className="gba:flex gba:gap-4 gba:items-center">
            <Input
              placeholder={t('mdm.search_teams', 'Search teams...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />

            {viewMode === 'cards' && (
              <Select
                defaultValue={sortBy}
                onValueChange={value => setSortBy(value as 'name' | 'rank' | 'created' | 'leader')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">By Rank</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="created">By Created Date</SelectItem>
                  <SelectItem value="leader">By Leader</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <ToggleGroup defaultValue="cards" size="default" variant="default" type="single">
              <ToggleGroupItem
                value="cards"
                onClick={() => setViewMode('cards')}
                data-testid={`${prefixDataTestId || ''}-TeamsTab-CardsView`}
              >
                <Icon icon={GaugeIcon} />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="table"
                onClick={() => setViewMode('table')}
                data-testid={`${prefixDataTestId || ''}-TeamsTab-TableView`}
              >
                <Icon icon={ListDashesIcon} />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Content */}
        {displayTeams.length > 0 ? (
          <>
            {viewMode === 'cards' ? (
              <div
                className="gba:grid gba:gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 350px))'
                }}
              >
                {displayTeams.map(team => renderTeamCard(team))}
              </div>
            ) : (
              <>{renderTeamsTable()}</>
            )}
          </>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4">
            <h1 className="gba:text-base gba:text-gray-500">No teams found</h1>
            <TeamForm
              childAddButton={
                <Button variant="default" onClick={event => event.stopPropagation()}>
                  <PlusIcon /> Add First Team
                </Button>
              }
              structureId={structureId}
              teamsCount={totalTeams}
              accessToken={context.accessToken}
              refetch={refetch}
            />
          </div>
        )}

        {selectedTeam && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedTeam(null)
              }
              setDrawerVisible(openStatus)
            }}
            title="Team Details"
            titleIcon={UsersIcon}
            drawerItems={drawerItems}
            footerButtons={[
              <TeamForm
                childAddButton={
                  <Button
                    variant="default"
                    onClick={event => event.stopPropagation()}
                    data-testid={`${prefixDataTestId || ''}-TeamsTab-EditButton`}
                  >
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                structureId={structureId}
                teamsCount={totalTeams}
                accessToken={context.accessToken}
                refetch={refetch}
                team={selectedTeam}
                isDrawerActive={true}
                key={selectedTeam.id}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default TeamsTab
export { TeamsTab }
