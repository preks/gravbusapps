import React, { type ComponentType } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import {
  UsersIcon,
  FileTextIcon,
  UserIcon,
  IdentificationCardIcon,
  type IconProps
} from '@phosphor-icons/react'

interface DashboardItem {
  title: string
  value?: string
  Icon: ComponentType<IconProps>
  iconClassName: string
  iconBackgroundClassName?: string
}

const HrDashboard: React.FC = () => {
  const stats: DashboardItem[] = [
    {
      title: 'Total Employees',
      value: '124',
      Icon: UsersIcon,
      iconClassName: 'gba:text-info',
      iconBackgroundClassName: 'gba:bg-info-secondary'
    },
    {
      title: 'Active Documents',
      value: '856',
      Icon: FileTextIcon,
      iconClassName: 'gba:text-success',
      iconBackgroundClassName: 'gba:bg-success-secondary'
    },
    {
      title: 'Open Positions',
      value: '12',
      Icon: IdentificationCardIcon,
      iconClassName: 'gba:text-warning',
      iconBackgroundClassName: 'gba:bg-warning-secondary'
    },
    {
      title: 'On Leave',
      value: '8',
      Icon: UserIcon,
      iconClassName: 'gba:text-destructive',
      iconBackgroundClassName: 'gba:bg-destructive-secondary'
    }
  ]

  const quickActions: DashboardItem[] = [
    { title: 'Manage Documents', Icon: FileTextIcon, iconClassName: 'gba:text-info' },
    { title: 'Add Employee', Icon: UserIcon, iconClassName: 'gba:text-success' },
    { title: 'Post Job', Icon: IdentificationCardIcon, iconClassName: 'gba:text-warning' },
    { title: 'Team Overview', Icon: UsersIcon, iconClassName: 'gba:text-info' }
  ]

  return (
    <div className="gba:p-6">
      <h2 className="gba:mb-6 gba:text-2xl gba:font-semibold">
        HR Dashboard
      </h2>

      <div className="gba:mb-8 gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2 lg:gba:grid-cols-4">
        {stats.map(stat => {
          const { Icon } = stat

          return (
            <Card key={stat.title} className="gba:h-full">
              <CardContent className="gba:flex gba:items-center gba:p-6">
                <div
                  className={`gba:mr-4 gba:flex gba:h-12 gba:w-12 gba:items-center gba:justify-center gba:rounded-full ${stat.iconBackgroundClassName}`}
                >
                  <Icon size={24} className={stat.iconClassName} />
                </div>
                <div>
                  <span className="gba:block gba:text-sm gba:text-muted-foreground">
                    {stat.title}
                  </span>
                  <h3 className="gba:mb-0 gba:mt-1 gba:text-xl gba:font-semibold">
                    {stat.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="gba:bg-primary-foreground gba:p-6 gba:rounded-lg gba:shadow">
        <h4 className="gba:mb-4 gba:text-lg gba:font-semibold">
          Quick Actions
        </h4>
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2 md:gba:grid-cols-4">
          {quickActions.map(action => {
            const { Icon } = action

            return (
              <Card key={action.title} className="gba:text-center gba:transition-shadow hover:gba:shadow-md">
                <CardContent className="gba:p-6">
                  <Icon size={32} className={action.iconClassName} />
                  <div className="gba:mt-2">{action.title}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default HrDashboard
