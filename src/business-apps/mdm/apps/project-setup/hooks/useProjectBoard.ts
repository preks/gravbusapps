import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BoardApiService,
  setBoardApiAuthTokenProvider
} from '@/business-apps/platform/apps/board-apps/services/BoardApiService'
import { buildBoardFromTemplate } from '@/business-apps/platform/apps/board-apps/templates/boardTemplateTypes'
import {
  buildProjectBoardTemplate,
  type ProjectBoardInput
} from '@/business-apps/platform/apps/board-apps/templates/projectBoardTemplate'
import type { Board, BoardSummary } from '@/business-apps/platform/apps/board-apps/types'
import type { Project } from '../../project-management/types'
import { Navigation } from '@/common/utils/navigationUtils'

interface ProjectBoardMap {
  [projectId: string]: { boardId: string; boardName: string }
}

interface UseProjectBoardOptions {
  accessToken: string
  projects: Project[]
}

export function useProjectBoard({ accessToken, projects }: UseProjectBoardOptions) {
  const [projectBoardMap, setProjectBoardMap] = useState<ProjectBoardMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const authInitialized = useRef(false)

  useEffect(() => {
    if (accessToken && !authInitialized.current) {
      setBoardApiAuthTokenProvider(() => accessToken)
      authInitialized.current = true
    }
  }, [accessToken])

  const loadProjectBoardMap = useCallback(async () => {
    if (!accessToken || projects.length === 0) return

    setIsLoading(true)
    try {
      const boards = await BoardApiService.listBoards({ limit: 100 })
      const map: ProjectBoardMap = {}
      for (const board of boards) {
        const pid = (board.settings as Record<string, unknown> | undefined)?.projectId as string | undefined
        if (pid) {
          map[pid] = { boardId: board.id, boardName: board.name }
        }
      }
      setProjectBoardMap(map)
    } catch (err) {
      console.error('Failed to load project board map:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, projects.length])

  useEffect(() => {
    if (authInitialized.current && projects.length > 0) {
      loadProjectBoardMap()
    }
  }, [loadProjectBoardMap])

  const findProjectBoard = useCallback(async (projectId: string): Promise<BoardSummary | null> => {
    try {
      const boards = await BoardApiService.listBoards({ projectId })
      return boards.length > 0 ? boards[0] : null
    } catch {
      return null
    }
  }, [])

  const createProjectBoard = useCallback(
    async (
      project: Project,
      members: Array<{ employeeId: string; role?: string; name?: string }>
    ): Promise<Board | null> => {
      const existing = projectBoardMap[project.id]
      if (existing) {
        console.warn(`Board already exists for project ${project.id}`)
        return null
      }

      if (!project.validFrom || !project.validTo) {
        console.error('Project must have validFrom and validTo dates')
        return null
      }

      setIsCreating(true)
      try {
        const input: ProjectBoardInput = {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            validFrom: project.validFrom,
            validTo: project.validTo,
            status: project.status,
            projectType: project.projectType,
            hoursBudget: project.hoursBudget ?? undefined
          },
          members
        }

        const template = buildProjectBoardTemplate(input)
        const boardData = buildBoardFromTemplate(template)

        boardData.settings = {
          ...boardData.settings,
          projectId: project.id
        } as Board['settings']
        boardData.status = 'promoted'
        boardData.description = template.description

        const board = await BoardApiService.createBoard(boardData)

        const firstSheet = board.sheets?.[0]
        if (firstSheet) {
          const seedRows = template.sheets[0].getSeedRows()
          const BATCH = 5
          for (let i = 0; i < seedRows.length; i += BATCH) {
            await Promise.all(
              seedRows
                .slice(i, i + BATCH)
                .map(rowData => BoardApiService.createRow(board.id, firstSheet.id, rowData).catch(() => null))
            )
          }
        }

        if (members.length > 0) {
          const memberShares = members.map(m => ({
            userId: m.employeeId,
            permission: 'edit' as const
          }))
          await BoardApiService.shareBoard(board.id, memberShares).catch(() => null)
        }

        setProjectBoardMap(prev => ({
          ...prev,
          [project.id]: { boardId: board.id, boardName: board.name }
        }))

        return board
      } catch (err) {
        console.error('Failed to create project board:', err)
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [projectBoardMap]
  )

  const syncProjectBoard = useCallback(
    async (
      project: Project,
      members: Array<{ employeeId: string }>,
      boardId: string
    ): Promise<{ synced: boolean; changes: string[] }> => {
      const changes: string[] = []
      try {
        const board = await BoardApiService.getBoard(boardId)
        if (!board) return { synced: false, changes }

        if (board.name !== project.name) {
          await BoardApiService.updateBoard(boardId, { name: project.name })
          changes.push(`Board name updated to "${project.name}"`)
          setProjectBoardMap(prev => ({
            ...prev,
            [project.id]: { boardId, boardName: project.name }
          }))
        }

        if (members.length > 0) {
          const existingShares = await BoardApiService.getBoardSharedUsers(boardId)
          const existingUserIds = new Set(existingShares.map(s => s.userId))
          const newMembers = members.filter(m => !existingUserIds.has(m.employeeId))

          if (newMembers.length > 0) {
            await BoardApiService.shareBoard(
              boardId,
              newMembers.map(m => ({ userId: m.employeeId, permission: 'edit' as const }))
            )
            changes.push(`${newMembers.length} new member(s) added to board`)
          }
        }

        return { synced: true, changes }
      } catch (err) {
        console.error('Failed to sync project board:', err)
        return { synced: false, changes }
      }
    },
    []
  )

  const getBoardUrl = useCallback((boardId: string): string => {
    return `${Navigation.PLATFORM_BOARDS}?boardId=${boardId}`
  }, [])

  const hasBoard = useCallback(
    (projectId: string): boolean => {
      return !!projectBoardMap[projectId]
    },
    [projectBoardMap]
  )

  const getBoardInfo = useCallback(
    (projectId: string): { boardId: string; boardName: string } | null => {
      return projectBoardMap[projectId] || null
    },
    [projectBoardMap]
  )

  return {
    projectBoardMap,
    isLoading,
    isCreating,
    hasBoard,
    getBoardInfo,
    getBoardUrl,
    findProjectBoard,
    createProjectBoard,
    syncProjectBoard,
    refreshBoardMap: loadProjectBoardMap
  }
}
