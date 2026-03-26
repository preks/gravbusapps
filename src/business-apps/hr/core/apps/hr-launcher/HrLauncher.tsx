import { useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { hrAreas } from './utils/hrAreas'
import { HrAreaCard } from './components/HrAreaCard'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { UsersThreeIcon } from '@phosphor-icons/react'

const HrLauncher: React.FC<BusinessAppContextProps> = props => {
  void props

  const handleNavigate = useCallback((path?: string) => {
    if (!path) return
    navigateTo(buildPlatformUrl(path))
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid="hr-launcher">
      <div className="gba:absolute gba:inset-x-0 gba:top-0 gba:h-56 gba:bg-gradient-to-b gba:from-info/10 gba:to-transparent" />

      <div className="gba:relative gba:mx-auto gba:max-w-7xl gba:px-6 gba:pt-10 gba:pb-8">
        <div className="gba:mb-8 gba:flex gba:items-start gba:gap-3">
          <div className="gba:rounded-lg gba:border gba:border-info/10 gba:bg-info/5 gba:p-2.5">
            <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-info" weight="duotone" />
          </div>
          <div className="gba:max-w-2xl">
            <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">Human Resources Management Hub</h1>
            <p className="gba:mt-2 gba:text-muted-foreground">
              HR operations, talent, payroll, and workforce insights in one place.
            </p>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-3">
          {hrAreas.map(area => (
            <HrAreaCard
              key={area.id}
              title={area.title}
              description={area.description}
              icon={area.icon}
              badgeLabel={area.badgeLabel}
              badgeTone={area.badgeTone}
              links={area.links}
              onExplore={area.explorePath ? () => handleNavigate(area.explorePath) : undefined}
              onLinkClick={path => handleNavigate(path)}
              data-testid={`hr-area-${area.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HrLauncher
