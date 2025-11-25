import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LauncherLayout, type LauncherSectionConfig } from '@newwork/nw-design-system'
import { projectAreas } from './utils/projectAreas'
import { ProjectArea } from './types'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { KanbanIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useProjects } from './hooks/useProjects'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const moduleColor = MODULE_COLORS.SER || 'ext3'

const ProjectsLauncher: React.FC<BusinessAppContextProps> = context => {
  const { totalProjects } = useProjects(context)
  // Helper function to get default button label
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'project-setup':
        return getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.manage_projects', 'Manage Projects')
      case 'project-allocation':
        return getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.view_allocations', 'View Allocations')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.view_details', 'View Details')
    }
  }

  // Generate sections for LauncherLayout
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: ProjectArea[] = projectAreas

    // Convert areas to NavigationCardData format
    const cards = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string) => {
        switch (areaId) {
          case 'project-setup':
            return {
              value: String(totalProjects || 0),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.stats.projects', 'Projects')
            }
          case 'project-allocation':
            return {
              value: '0',
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:smart_project.stats.teams_allocated',
                'Teams Allocated'
              )
            }
          default:
            return {
              value: '0',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.stats.items', 'Items')
            }
        }
      }

      const areaStats = getAreaStats(area.id)

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: area.icon,
        stats: areaStats,
        actions: [],
        primaryAction: {
          label: area.buttonLabel || getDefaultButtonLabel(area.id),
          onClick: () => handleNavigationClick(area)
        }
      }
    })

    return [
      {
        id: 'project-modules',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.title', 'Project Management Hub'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:smart_project.description',
          'Comprehensive project management tools for setup, allocation, and resource management'
        ),
        cards
      }
    ]
  }, [totalProjects])

  const handleNavigationClick = (area: ProjectArea) => {
    // Map areas to their corresponding navigation paths
    const areaToPathMap: Record<string, string> = {
      'project-setup': '/platform/project-setup',
      'project-allocation': '/platform/project-allocation'
    }

    const navigationPath = areaToPathMap[area.id]

    if (navigationPath) {
      const projectUrl = buildPlatformUrl(navigationPath)
      navigateTo(projectUrl)
    }
  }

  return (
    <LauncherLayout
      title={getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.title', 'Project Management Hub')}
      description={getTranslationFromI18nKeyAndLabel(
        'lowcoder:smart_project.description',
        'Comprehensive project management tools for setup, allocation, and resource management'
      )}
      icon={KanbanIcon}
      sections={sections}
      variant={moduleColor}
    />
  )
}

export default ProjectsLauncher
