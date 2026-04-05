import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Combobox,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { CaretDown, CaretUp, PlusIcon, TrashIcon, DeviceMobileIcon } from '@phosphor-icons/react'
import { useCreateComponent } from '@/common/data/resources/hooks/useCreateComponent'
import { useUpdateComponent } from '@/common/data/resources/hooks/useUpdateComponent'
import { useCreateNavigation } from '@/common/data/resources/hooks/useCreateNavigation'
import { useUpdateNavigation } from '@/common/data/resources/hooks/useUpdateNavigation'
import { useCreateMenuItem } from '@/common/data/resources/hooks/useCreateMenuItem'
import { useCreateContext } from '@/common/data/resources/hooks/useCreateContext'
import { useCreateAction } from '@/common/data/resources/hooks/useCreateAction'
import { useCreateActionAssignment } from '@/common/data/resources/hooks/useCreateActionAssignment'
import { useComponents } from '@/common/data/resources/hooks/useComponents'
import { useNavigations } from '@/common/data/resources/hooks/useNavigations'
import { useMenuItems } from '@/common/data/resources/hooks/useMenuItems'
import { useContexts } from '@/common/data/resources/hooks/useContexts'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import type { Component } from '@/common/data/resources/types/component.types'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import type { ContextDTO } from '@/common/data/resources/types/context.types'
import {
  urlPathToScreenKey,
  validateComponentPath,
  screenKeyToResourceUrlFilterPath
} from '../../../../utils/componentKeyUtils'
import {
  buildMenuEntryPathsForUrl,
  buildMenuPathOptions,
  getSpaceLabel,
  resolveOrCreateMenuPath,
  type HubWithMenuItems
} from '../../menuPathUtils'
import { DebugSection, type DebugStep } from '../../segments/DebugSection'
import {
  BUNDLE_FILTER_PATH_PREFIX,
  DEFAULT_NAMESPACE_ID,
  DEFAULT_NAMESPACE_CODE,
  PLACEHOLDER_DISPLAY_NAME,
  PLACEHOLDER_MENU_ENTRY_NAME
} from './constants'
import { MenuTree } from './components/MenuTree'
import { SimpleModeContent } from './components/SimpleModeContent'
import type {
  MenuEntryRow,
  UrlRow,
  PendingMenuItem,
  FlowEntryRow,
  FlowQueryParam,
  MenuSpaceType,
  ScreenBundleDialogInitialData,
  ScreenBundleDialogProps
} from './types'
import { navigationToUrlRow, getUrlEffectiveName, getMenuEntryEffectiveName, getMergedChildRows } from './utils'

export const ScreenBundleDialog: React.FC<ScreenBundleDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  'data-testid': dataTestId = 'register-native-screen-dialog',
  ...context
}) => {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [componentPath, setComponentPath] = useState('')
  const [componentVersion, setComponentVersion] = useState('')
  const [componentPathError, setComponentPathError] = useState<string | null>(null)
  const [urlRows, setUrlRows] = useState<UrlRow[]>([
    {
      url: '',
      roles: [],
      features: [],
      menuEntries: [],
      flows: [],
      useCustomName: false,
      customName: ''
    }
  ])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [bundleNavigations, setBundleNavigations] = useState<NavigationDTO[] | null>(null)
  const [activeUrlTab, setActiveUrlTab] = useState('0')
  const [selectedMenuSpace, setSelectedMenuSpace] = useState<MenuSpaceType>('USE')
  const [menuTreeExpandedIds, setMenuTreeExpandedIds] = useState<Set<string>>(new Set())
  const [pendingMenuItems, setPendingMenuItems] = useState<PendingMenuItem[]>([])
  const [newContextName, setNewContextName] = useState('')
  const [isCreatingContext, setIsCreatingContext] = useState(false)
  const [bundleMode, setBundleMode] = useState<'simple' | 'advanced'>('simple')
  const [advancedMenuEntryView, setAdvancedMenuEntryView] = useState<'select' | 'tree'>('select')
  const [codeUnifiedWarning, setCodeUnifiedWarning] = useState(false)

  const { createComponent, isCreating: isCreatingComponent } = useCreateComponent(context)
  const { updateComponent } = useUpdateComponent(context)
  const { createNavigation, isCreating: isCreatingNavigation } = useCreateNavigation(context)
  const { updateNavigation } = useUpdateNavigation(context)
  const { createMenuItem, isCreating: isCreatingMenuItem } = useCreateMenuItem(context)
  const { createContext } = useCreateContext(context)
  const { createAction, isLoading: isCreatingAction } = useCreateAction(context)
  const { createActionAssignment, isLoading: isCreatingAssignment } = useCreateActionAssignment(context)
  const resourceClient = useResourceClient(context.accessToken)
  const { components, refetch: refetchComponents } = useComponents(context)
  const { navigations, refetch: refetchNavigations } = useNavigations(context, { limit: 25, offset: 0 })
  const { menuItems, refetch: refetchMenuItems } = useMenuItems(context)
  const { contexts: contextsWithActions, refetch: refetchContexts } = useContexts(context, {
    limit: 25,
    offset: 0,
    returnTotalRecords: true
  })
  const { roles: roleOptions, refetch: refetchRoles } = useRolesCatalog(context)
  const { features: featureOptions, refetch: refetchFeatures } = useFeaturesCatalog(context)

  const isSubmitting =
    isCreatingComponent || isCreatingNavigation || isCreatingMenuItem || isCreatingAction || isCreatingAssignment

  const contextOptions = useMemo(
    () => contextsWithActions.map(c => ({ value: c.context.id, label: c.context.contextName })),
    [contextsWithActions]
  )
  const contextById = useMemo(() => {
    const map = new Map<string, ContextDTO>()
    contextsWithActions.forEach(c => map.set(c.context.id, c.context))
    return map
  }, [contextsWithActions])

  const menuHubsBySpace = useMemo(() => {
    return menuItems.filter(h => (h.level === 0 || h.type != null) && (h.type ?? 'USE') === selectedMenuSpace)
  }, [menuItems, selectedMenuSpace])

  const pathOptionById = useMemo(() => {
    const flat = buildMenuPathOptions(menuHubsBySpace)
    const map = new Map<string, { path: string; item: MenuItemDTO }>()
    flat.forEach(({ id, path, item }) => map.set(id, { path, item }))
    return map
  }, [menuHubsBySpace])

  const rootHubIdByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    function walk(items: MenuItemDTO[], rootHubId: string) {
      for (const item of items) {
        const hubId = item.level === 0 ? item.id : rootHubId
        map.set(item.id, hubId)
        if (item.children?.length) walk(item.children, hubId)
      }
    }
    menuHubsBySpace.forEach(hub => walk([hub], hub.id))
    return map
  }, [menuHubsBySpace])

  const allMenuPathOptions = useMemo(() => buildMenuPathOptions(menuItems), [menuItems])
  const allPathById = useMemo(() => new Map(allMenuPathOptions.map(x => [x.id, x.path])), [allMenuPathOptions])
  const advancedSelectPathOptions = useMemo(
    () =>
      Array.from(pathOptionById.entries())
        .map(([id, { path }]) => ({ value: id, label: path }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [pathOptionById]
  )

  useEffect(() => {
    setMenuTreeExpandedIds(new Set())
  }, [selectedMenuSpace, menuHubsBySpace])

  const handleMenuTreeToggleExpand = useCallback(
    (id: string) => {
      setMenuTreeExpandedIds(prev => {
        const next = new Set(prev)
        const isHub = menuHubsBySpace.some(h => h.id === id)
        if (isHub) {
          menuHubsBySpace.forEach(h => {
            if (h.id !== id) next.delete(h.id)
          })
        }
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [menuHubsBySpace]
  )

  const handleToggleUrlAtParent = useCallback(
    (urlRowIndex: number, parentId: string, parentIsHub: boolean) => {
      const row = urlRows[urlRowIndex]
      const existingIndex = row.menuEntries.findIndex(
        e => (parentIsHub && e.hubId === parentId) || (!parentIsHub && e.parentId === parentId)
      )
      if (existingIndex >= 0) {
        setUrlRows(prev =>
          prev.map((r, i) =>
            i === urlRowIndex ? { ...r, menuEntries: r.menuEntries.filter((_, j) => j !== existingIndex) } : r
          )
        )
        return
      }
      const isPendingParent = parentId.startsWith('pending-')
      const hubId = parentIsHub
        ? parentId
        : isPendingParent
          ? pendingMenuItems.find(p => p.tempId === parentId)?.rootHubId
          : undefined
      const parentIdForEntry = parentIsHub ? null : parentId
      if (!parentIsHub && !isPendingParent) {
        const opt = pathOptionById.get(parentId)
        if (!opt) return
      }
      if (!parentIsHub && isPendingParent && !hubId) return
      const itemChildren = isPendingParent ? [] : (pathOptionById.get(parentId)?.item.children ?? [])
      const merged = getMergedChildRows(parentId, parentIsHub, itemChildren, row.menuEntries, pendingMenuItems)
      const newRank = merged.length === 0 ? 0 : Math.min(...merged.map(m => m.rank)) - 1
      setUrlRows(prev =>
        prev.map((r, i) =>
          i === urlRowIndex
            ? {
                ...r,
                menuEntries: [
                  ...r.menuEntries,
                  {
                    icon: '',
                    name: '',
                    parentId: parentIdForEntry,
                    hubId: hubId ?? (parentIsHub ? parentId : null),
                    useCustomName: false,
                    pathString: '',
                    definePath: false,
                    rank: newRank
                  }
                ]
              }
            : r
        )
      )
      setMenuTreeExpandedIds(prev => {
        const next = new Set(prev)
        const isHub = menuHubsBySpace.some(h => h.id === parentId)
        if (isHub) {
          menuHubsBySpace.forEach(h => {
            if (h.id !== parentId) next.delete(h.id)
          })
        }
        next.add(parentId)
        return next
      })
    },
    [pathOptionById, urlRows, pendingMenuItems, menuHubsBySpace]
  )

  const handleMovePending = useCallback(
    (tempId: string, direction: 'up' | 'down') => {
      const pending = pendingMenuItems.find(p => p.tempId === tempId)
      if (!pending) return
      const siblings = pendingMenuItems
        .filter(p => p.parentNodeId === pending.parentNodeId && p.parentIsHub === pending.parentIsHub)
        .sort((a, b) => a.rank - b.rank)
      const idx = siblings.findIndex(p => p.tempId === tempId)
      if (idx < 0) return
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= siblings.length) return
      const other = siblings[swapIdx]
      setPendingMenuItems(prev =>
        prev.map(p => {
          if (p.tempId === tempId) return { ...p, rank: other.rank }
          if (p.tempId === other.tempId) return { ...p, rank: pending.rank }
          return p
        })
      )
    },
    [pendingMenuItems]
  )

  const handleMoveMenuEntry = useCallback(
    (urlRowIndex: number, menuEntryIndex: number, direction: 'up' | 'down') => {
      const row = urlRows[urlRowIndex]
      const entry = row.menuEntries[menuEntryIndex]
      if (!entry) return
      const parentId = entry.parentId ?? entry.hubId
      if (!parentId) return
      const isPendingParent = parentId.startsWith('pending-')
      const parentIsHub = !isPendingParent && pathOptionById.get(parentId)?.item.level === 0
      const itemChildren = isPendingParent ? [] : (pathOptionById.get(parentId)?.item.children ?? [])
      const merged = getMergedChildRows(parentId, parentIsHub, itemChildren, row.menuEntries, pendingMenuItems)
      const idx = merged.findIndex(m => m.type === 'entry' && m.menuEntryIndex === menuEntryIndex)
      if (idx < 0) return
      const prevIdx = direction === 'up' ? idx - 1 : idx + 1
      if (prevIdx < 0 || prevIdx >= merged.length) return
      const other = merged[prevIdx]
      if (other.type === 'entry') {
        const otherParentId = other.entry.hubId ?? other.entry.parentId
        if (otherParentId !== parentId) return
      }
      const myRank = entry.rank ?? idx
      let newRank: number
      if (other.type === 'entry') {
        newRank = other.rank
        setUrlRows(prev =>
          prev.map((r, i) =>
            i === urlRowIndex
              ? {
                  ...r,
                  menuEntries: r.menuEntries.map((e, j) => {
                    if (j === menuEntryIndex) return { ...e, rank: newRank }
                    if (j === other.menuEntryIndex) return { ...e, rank: myRank }
                    return e
                  })
                }
              : r
          )
        )
      } else {
        if (direction === 'up') newRank = other.rank - 0.5
        else newRank = other.rank + 0.5
        setUrlRows(prev =>
          prev.map((r, i) =>
            i === urlRowIndex
              ? {
                  ...r,
                  menuEntries: r.menuEntries.map((e, j) => (j === menuEntryIndex ? { ...e, rank: newRank } : e))
                }
              : r
          )
        )
      }
    },
    [pathOptionById, urlRows, pendingMenuItems]
  )

  const handleMenuEntryPathSelect = useCallback(
    (urlRowIndex: number, menuEntryIndex: number, selectedNodeId: string) => {
      const opt = pathOptionById.get(selectedNodeId)
      if (!opt) return
      const hubId = rootHubIdByNodeId.get(selectedNodeId) ?? (opt.item.level === 0 ? opt.item.id : null)
      const parentId = opt.item.level === 0 ? null : opt.item.id
      setUrlRows(prev =>
        prev.map((r, i) =>
          i === urlRowIndex
            ? {
                ...r,
                menuEntries: r.menuEntries.map((e, j) =>
                  j === menuEntryIndex
                    ? {
                        ...e,
                        pathString: opt.path,
                        definePath: true,
                        hubId: hubId ?? e.hubId,
                        parentId,
                        rank: e.rank ?? menuEntryIndex
                      }
                    : e
                )
              }
            : r
        )
      )
    },
    [pathOptionById, rootHubIdByNodeId]
  )

  const handleAddMenuEntryAdvanced = useCallback((urlRowIndex: number) => {
    setUrlRows(prev =>
      prev.map((r, i) =>
        i === urlRowIndex
          ? {
              ...r,
              menuEntries: [
                ...r.menuEntries,
                {
                  icon: '',
                  name: '',
                  parentId: null,
                  hubId: null,
                  useCustomName: false,
                  pathString: '',
                  definePath: true,
                  rank: r.menuEntries.length
                }
              ]
            }
          : r
      )
    )
  }, [])

  const handleReorderMenuEntryAdvanced = useCallback(
    (urlRowIndex: number, entryIndex: number, direction: 'up' | 'down') => {
      const row = urlRows[urlRowIndex]
      const len = row.menuEntries.length
      if (len <= 1) return
      const newIndex = direction === 'up' ? entryIndex - 1 : entryIndex + 1
      if (newIndex < 0 || newIndex >= len) return
      setUrlRows(prev =>
        prev.map((r, i) => {
          if (i !== urlRowIndex) return r
          const entries = [...r.menuEntries]
          const [removed] = entries.splice(entryIndex, 1)
          entries.splice(newIndex, 0, removed)
          return {
            ...r,
            menuEntries: entries.map((e, idx) => ({ ...e, rank: idx }))
          }
        })
      )
    },
    [urlRows]
  )

  const handleAddPendingChild = useCallback(
    (parentNodeId: string, parentIsHub: boolean) => {
      const existingUnderParent = pendingMenuItems.filter(
        p => p.parentNodeId === parentNodeId && p.parentIsHub === parentIsHub
      )
      if (existingUnderParent.length > 0) return
      const rootHubId = parentIsHub
        ? parentNodeId
        : parentNodeId.startsWith('pending-')
          ? pendingMenuItems.find(p => p.tempId === parentNodeId)?.rootHubId
          : rootHubIdByNodeId.get(parentNodeId)
      if (!rootHubId) return
      let itemChildren: MenuItemDTO[] = []
      if (parentIsHub) {
        const opt = pathOptionById.get(parentNodeId)
        if (!opt) return
        itemChildren = opt.item.children ?? []
      } else if (!parentNodeId.startsWith('pending-')) {
        itemChildren = pathOptionById.get(parentNodeId)?.item.children ?? []
      }
      const existing = pendingMenuItems.filter(p => p.parentNodeId === parentNodeId && p.parentIsHub === parentIsHub)
      const realRanks = itemChildren.map((c, i) => c.rank ?? i)
      const pendingRanks = existing.map(p => p.rank)
      const allRanks = [...realRanks, ...pendingRanks]
      const nextRank = allRanks.length === 0 ? 0 : Math.min(...allRanks) - 1
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setPendingMenuItems(prev => [...prev, { tempId, parentNodeId, parentIsHub, rootHubId, name: '', rank: nextRank }])
      setMenuTreeExpandedIds(prev => {
        const next = new Set(prev)
        const isHub = menuHubsBySpace.some(h => h.id === parentNodeId)
        if (isHub) {
          menuHubsBySpace.forEach(h => {
            if (h.id !== parentNodeId) next.delete(h.id)
          })
        }
        next.add(parentNodeId)
        return next
      })
    },
    [pathOptionById, pendingMenuItems, rootHubIdByNodeId, menuHubsBySpace]
  )

  const handleRemovePendingChild = useCallback((tempId: string) => {
    setPendingMenuItems(prev => prev.filter(p => p.tempId !== tempId))
  }, [])

  const handlePendingItemNameChange = useCallback((tempId: string, name: string) => {
    setPendingMenuItems(prev => prev.map(p => (p.tempId === tempId ? { ...p, name } : p)))
  }, [])

  const roleOptionsRef = useRef(roleOptions)
  const featureOptionsRef = useRef(featureOptions)
  roleOptionsRef.current = roleOptions
  featureOptionsRef.current = featureOptions

  const loadScreenBundleData = useCallback(
    async (data: ScreenBundleDialogInitialData) => {
      if (!data?.componentPath) return
      const filterPath = data.screenKey
        ? screenKeyToResourceUrlFilterPath(data.screenKey)
        : BUNDLE_FILTER_PATH_PREFIX + data.componentPath.replace(/^\//, '')
      const normalizer = (u: string) => (u ?? '').trim().replace(/\/+$/, '') || '/'
      try {
        const [urlRes, hubsRes] = await Promise.all([
          resourceClient.navigation.getResourceUrlsByFilter(filterPath),
          resourceClient.navigation.getHubsByFilter(filterPath)
        ])
        const navs = urlRes.data ?? []
        const hubs = (hubsRes.data ?? []) as HubWithMenuItems[]
        setBundleNavigations(navs)
        const rootName = data?.name ?? ''
        if (navs.length > 0) {
          const rows = navs.map(nav => {
            const row = navigationToUrlRow(nav, rootName, roleOptionsRef.current, featureOptionsRef.current)
            const menuEntryPathsForNav = hubs.flatMap(hub => buildMenuEntryPathsForUrl(hub, nav.url ?? '', normalizer))
            row.menuEntries = menuEntryPathsForNav.map(({ path, item }, idx) => ({
              icon: item.icon ?? '',
              name: item.name ?? '',
              parentId: item.parentId ?? null,
              hubId: item.hubId ?? null,
              useCustomName: false,
              pathString: path,
              definePath: true,
              rank: item.rank ?? idx
            }))
            return row
          })
          setUrlRows(rows)
          setCode(navs[0].code?.trim() ?? '')
          const allCodes = new Set<string>()
          for (const nav of navs) {
            const c = nav.code?.trim()
            if (c) allCodes.add(c)
            for (const mi of nav.menuItems ?? []) {
              const mc = (mi as { code?: string }).code?.trim()
              if (mc) allCodes.add(mc)
            }
          }
          setCodeUnifiedWarning(allCodes.size > 1)
          const forceAdvanced =
            rows.length > 1 ||
            rows.some(r => (r.menuEntries?.length ?? 0) > 1) ||
            rows.some(r => (r.flows?.length ?? 0) > 0)
          if (forceAdvanced) setBundleMode('advanced')
        } else {
          setUrlRows([
            { url: '', roles: [], features: [], menuEntries: [], flows: [], useCustomName: false, customName: '' }
          ])
          setCodeUnifiedWarning(false)
        }
      } catch {
        setBundleNavigations([])
        setUrlRows([
          { url: '', roles: [], features: [], menuEntries: [], flows: [], useCustomName: false, customName: '' }
        ])
        setCodeUnifiedWarning(false)
      }
    },
    [resourceClient]
  )

  useEffect(() => {
    if (!open) {
      setBundleNavigations(null)
      setNewContextName('')
      setPendingMenuItems([])
      setBundleMode('simple')
      setCodeUnifiedWarning(false)
      return
    }
    refetchComponents()
    refetchMenuItems()
    refetchContexts()
    refetchRoles()
    refetchFeatures()
    if (initialData?.componentPath) {
      loadScreenBundleData(initialData)
    } else {
      setBundleNavigations(null)
      refetchNavigations()
    }
  }, [
    open,
    initialData?.componentPath,
    initialData?.name,
    resourceClient,
    refetchComponents,
    refetchNavigations,
    refetchMenuItems,
    refetchContexts,
    refetchRoles,
    refetchFeatures,
    loadScreenBundleData
  ])

  const allPathByIdRef = useRef<Map<string, string>>(new Map())
  allPathByIdRef.current = allPathById
  useEffect(() => {
    if (!open || !bundleNavigations?.length || allPathById.size === 0) return
    setUrlRows(prev => {
      let changed = false
      const next = prev.map(row => ({
        ...row,
        menuEntries: row.menuEntries.map(entry => {
          const nodeId = entry.hubId ?? entry.parentId
          if (!nodeId || entry.pathString) return entry
          const path = allPathByIdRef.current.get(nodeId)
          if (!path) return entry
          changed = true
          return { ...entry, pathString: path, definePath: true }
        })
      }))
      return changed ? next : prev
    })
  }, [open, bundleNavigations?.length, allPathById])

  useEffect(() => {
    if (open && initialData) {
      if (initialData.componentPath != null) setComponentPath(initialData.componentPath)
      if (initialData.componentVersion != null) setComponentVersion(initialData.componentVersion)
      if (initialData.name != null) setName(initialData.name)
      if (initialData.code != null) setCode(initialData.code)
    }
  }, [open, initialData])

  useEffect(() => {
    const idx = parseInt(activeUrlTab, 10)
    if (urlRows.length > 0 && (idx < 0 || idx >= urlRows.length)) {
      setActiveUrlTab(String(Math.min(urlRows.length - 1, Math.max(0, idx))))
    }
  }, [urlRows.length, activeUrlTab])

  const validateComponentPathExists = useCallback(
    (path: string): string | null => {
      if (!path.trim()) return null
      const normalized = path.trim()
      const existingId = initialData?.existingComponentId
      const exists = components.some(
        c =>
          c.screenComponents?.formDefinition?.componentPath?.trim() === normalized &&
          (!existingId || c.id !== existingId)
      )
      return exists ? 'This component path is already registered' : null
    },
    [components, initialData?.existingComponentId]
  )

  const navigationsForValidation = bundleNavigations ?? navigations
  const validateUrlUnique = useCallback(
    (url: string, excludeIndex?: number): string | null => {
      if (!url.trim()) return null
      const normalized = url.trim()
      const inBackend = navigationsForValidation.some(n => (n.url || '').trim() === normalized)
      if (inBackend) return 'This URL is already registered'
      const inForm = urlRows.some((row, i) => i !== excludeIndex && (row.url || '').trim() === normalized)
      if (inForm) return 'Duplicate URL in this form'
      return null
    },
    [navigationsForValidation, urlRows]
  )

  const validateForm = useCallback((): boolean => {
    let valid = true
    if (!code.trim()) valid = false
    if (!name.trim()) valid = false
    const pathValidation = validateComponentPath(componentPath)
    if (!pathValidation.isValid) {
      setComponentPathError(pathValidation.error ?? null)
      valid = false
    } else {
      const existsError = validateComponentPathExists(componentPath)
      setComponentPathError(existsError)
      if (existsError) valid = false
    }
    const rootName = name.trim()
    const newUrlRows = urlRows.map((row, rowIndex) => {
      const urlError = !row.url.trim() ? 'URL is required' : validateUrlUnique(row.url, rowIndex)
      if (urlError) valid = false
      const urlEffectiveName = getUrlEffectiveName(row, rootName)
      const menuEntriesWithErrors = row.menuEntries.map(entry => {
        const effectiveName = getMenuEntryEffectiveName(entry, urlEffectiveName)
        const nameError = entry.useCustomName && !entry.name?.trim() ? 'Name is required when overriding' : null
        const hasPlace = (entry.definePath && entry.pathString?.trim()) || entry.hubId || entry.parentId
        if (effectiveName && !hasPlace) valid = false
        return { ...entry, nameError: nameError ?? undefined }
      })
      return { ...row, urlError, menuEntries: menuEntriesWithErrors }
    })
    setUrlRows(newUrlRows)
    return valid
  }, [code, name, componentPath, urlRows, validateComponentPathExists, validateUrlUnique])

  const handleAddUrlRow = useCallback(() => {
    setUrlRows(prev => [
      ...prev,
      {
        url: '',
        roles: [],
        features: [],
        menuEntries: [],
        flows: [],
        useCustomName: false,
        customName: ''
      }
    ])
  }, [])

  const handleRemoveUrlRow = useCallback((index: number) => {
    setUrlRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }, [])

  const handleUrlRowChange = useCallback((index: number, field: keyof UrlRow, value: string | string[] | boolean) => {
    setUrlRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value, urlError: undefined } : row)))
  }, [])

  const handleRemoveMenuEntry = useCallback((urlRowIndex: number, menuEntryIndex: number) => {
    setUrlRows(prev =>
      prev.map((row, i) =>
        i === urlRowIndex ? { ...row, menuEntries: row.menuEntries.filter((_, j) => j !== menuEntryIndex) } : row
      )
    )
  }, [])

  const handleMenuEntryChange = useCallback(
    (urlRowIndex: number, menuEntryIndex: number, field: keyof MenuEntryRow, value: string | null | boolean) => {
      setUrlRows(prev =>
        prev.map((row, i) =>
          i === urlRowIndex
            ? {
                ...row,
                menuEntries: row.menuEntries.map((entry, j) =>
                  j === menuEntryIndex ? { ...entry, [field]: value } : entry
                )
              }
            : row
        )
      )
    },
    []
  )

  const handleAddFlowEntry = useCallback(
    (urlRowIndex: number) => {
      setUrlRows(prev =>
        prev.map((row, i) =>
          i === urlRowIndex
            ? {
                ...row,
                flows: [
                  ...row.flows,
                  {
                    flowType: 'NAVIGATION',
                    flowName: name.trim() || '',
                    queryParams: [],
                    targetMobileOverride: '',
                    contextId: null
                  }
                ]
              }
            : row
        )
      )
    },
    [name]
  )

  const handleRemoveFlowEntry = useCallback((urlRowIndex: number, flowIndex: number) => {
    setUrlRows(prev =>
      prev.map((row, i) => (i === urlRowIndex ? { ...row, flows: row.flows.filter((_, j) => j !== flowIndex) } : row))
    )
  }, [])

  const handleFlowEntryChange = useCallback(
    (
      urlRowIndex: number,
      flowIndex: number,
      field: keyof FlowEntryRow,
      value: string | string[] | FlowQueryParam[] | null
    ) => {
      setUrlRows(prev =>
        prev.map((row, i) =>
          i === urlRowIndex
            ? {
                ...row,
                flows: row.flows.map((f, j) => (j === flowIndex ? { ...f, [field]: value } : f))
              }
            : row
        )
      )
    },
    []
  )

  const handleCreateContextForFlow = useCallback(
    async (urlIndex: number, flowIndex: number) => {
      const trimmed = newContextName?.trim()
      if (!trimmed) return
      setIsCreatingContext(true)
      try {
        const newId = await createContext({ contextName: trimmed, contextData: [] })
        if (newId) {
          await refetchContexts()
          handleFlowEntryChange(urlIndex, flowIndex, 'contextId', newId)
          setNewContextName('')
        }
      } finally {
        setIsCreatingContext(false)
      }
    },
    [newContextName, createContext, refetchContexts, handleFlowEntryChange]
  )

  const handleAddFlowQueryParam = useCallback((urlRowIndex: number, flowIndex: number) => {
    setUrlRows(prev =>
      prev.map((row, i) =>
        i === urlRowIndex
          ? {
              ...row,
              flows: row.flows.map((f, j) =>
                j === flowIndex ? { ...f, queryParams: [...f.queryParams, { key: '', expression: '' }] } : f
              )
            }
          : row
      )
    )
  }, [])

  const handleRemoveFlowQueryParam = useCallback((urlRowIndex: number, flowIndex: number, paramIndex: number) => {
    setUrlRows(prev =>
      prev.map((row, i) =>
        i === urlRowIndex
          ? {
              ...row,
              flows: row.flows.map((f, j) =>
                j === flowIndex ? { ...f, queryParams: f.queryParams.filter((_, k) => k !== paramIndex) } : f
              )
            }
          : row
      )
    )
  }, [])

  const handleFlowQueryParamChange = useCallback(
    (urlRowIndex: number, flowIndex: number, paramIndex: number, field: 'key' | 'expression', value: string) => {
      setUrlRows(prev =>
        prev.map((row, i) =>
          i === urlRowIndex
            ? {
                ...row,
                flows: row.flows.map((f, j) =>
                  j === flowIndex
                    ? {
                        ...f,
                        queryParams: f.queryParams.map((p, k) => (k === paramIndex ? { ...p, [field]: value } : p))
                      }
                    : f
                )
              }
            : row
        )
      )
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    if (!validateForm()) return

    const rowsToSubmit = bundleMode === 'simple' ? urlRows.slice(0, 1) : urlRows
    const rowsWithUrl = rowsToSubmit.filter(r => r.url?.trim())
    if (rowsWithUrl.length === 0) return

    const existingComponentId = initialData?.existingComponentId
    for (let i = 0; i < rowsWithUrl.length; i++) {
      const row = rowsWithUrl[i]
      const rowUrl = row.url.trim()
      const screenKey = urlPathToScreenKey(rowUrl)
      const componentPayload: Omit<
        Component,
        'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
      > = {
        name: getUrlEffectiveName(row, name.trim()),
        screenKey,
        namespaceCode: DEFAULT_NAMESPACE_CODE,
        namespaceId: DEFAULT_NAMESPACE_ID,
        namespaceDescription: DEFAULT_NAMESPACE_CODE,
        type: 'SCREEN',
        screenComponents: {
          key: screenKey,
          name: getUrlEffectiveName(row, name.trim()),
          builderType: 'NATIVE_SCREEN',
          appName: getUrlEffectiveName(row, name.trim()),
          flowIcon: '',
          formDefinition: { componentPath: componentPath.trim(), version: componentVersion.trim() },
          release: ''
        }
      }
      try {
        if (i === 0 && existingComponentId) {
          await updateComponent(existingComponentId, componentPayload)
        } else {
          await createComponent(componentPayload)
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : i === 0 && existingComponentId
              ? 'Failed to update component'
              : 'Failed to create component'
        )
        return
      }
    }

    const tempIdToId = new Map<string, string>()
    const pendingSorted = (() => {
      const added = new Set<string>()
      const isReady = (p: PendingMenuItem) =>
        p.parentIsHub || !p.parentNodeId.startsWith('pending-') || added.has(p.parentNodeId)
      const result: PendingMenuItem[] = []
      let remaining = [...pendingMenuItems]
      while (remaining.length) {
        const ready = remaining.filter(p => isReady(p))
        if (ready.length === 0) {
          setSubmitError('Invalid order of new menu items.')
          return
        }
        for (const p of ready) {
          result.push(p)
          added.add(p.tempId)
        }
        remaining = remaining.filter(p => !ready.includes(p))
      }
      return result
    })()
    for (const p of pendingSorted) {
      if (!p.name?.trim()) {
        setSubmitError('Every new menu item needs a name.')
        return
      }
      const parentId = p.parentIsHub
        ? p.parentNodeId
        : p.parentNodeId.startsWith('pending-')
          ? tempIdToId.get(p.parentNodeId)
          : p.parentNodeId
      if (!p.parentIsHub && !parentId) {
        setSubmitError('Parent of new menu item not found.')
        return
      }
      try {
        const created = await createMenuItem(
          {
            name: p.name.trim(),
            rank: p.rank,
            ...(p.parentIsHub ? { hubId: parentId } : { parentId })
          },
          false
        )
        if (created?.id) tempIdToId.set(p.tempId, created.id)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to create menu item')
        return
      }
    }

    const createdNavigationIds: string[] = []
    const baseCode = code.trim()
    const rootName = name.trim()

    for (let i = 0; i < rowsToSubmit.length; i++) {
      const row = rowsToSubmit[i]
      const navName = getUrlEffectiveName(row, rootName)
      const roleNames = row.roles.map(id => roleOptions.find(r => r.id === id)?.name).filter(Boolean) as string[]
      const featureNames = row.features
        .map(id => featureOptions.find(f => f.id === id)?.name)
        .filter(Boolean) as string[]
      const navPayload: Omit<NavigationDTO, 'id'> = {
        code: baseCode,
        name: navName,
        url: row.url.trim(),
        roles: roleNames.length ? roleNames.map(n => ({ name: n })) : undefined,
        features: featureNames.length ? featureNames.map(n => ({ name: n })) : undefined
      }
      try {
        if (row.navigationId) {
          await updateNavigation(row.navigationId, navPayload)
          createdNavigationIds.push(row.navigationId)
        } else {
          const nav = await createNavigation(navPayload)
          if (nav?.id) createdNavigationIds.push(nav.id)
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : `Failed to ${row.navigationId ? 'update' : 'create'} navigation for URL ${row.url}`
        )
        return
      }
    }

    const createdPathIds = new Map<string, { id: string; level: number }>()
    for (let urlIndex = 0; urlIndex < rowsToSubmit.length; urlIndex++) {
      const resourceUrlId = createdNavigationIds[urlIndex]
      if (!resourceUrlId) continue
      const row = rowsToSubmit[urlIndex]
      const urlEffectiveName = getUrlEffectiveName(row, rootName)
      for (const entry of row.menuEntries) {
        const effectiveName = getMenuEntryEffectiveName(entry, urlEffectiveName)
        if (!effectiveName) continue
        let hubId: string | undefined
        let parentId: string | undefined
        if (entry.definePath && entry.pathString?.trim()) {
          try {
            const resolved = await resolveOrCreateMenuPath(
              entry.pathString.trim(),
              menuItems,
              createMenuItem,
              createdPathIds
            )
            if (!resolved) {
              setSubmitError(`Invalid menu path: ${entry.pathString}`)
              return
            }
            hubId = resolved.hubId
            parentId = resolved.parentId
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Failed to resolve or create menu path')
            return
          }
        } else {
          if (entry.hubId) hubId = entry.hubId
          if (entry.parentId)
            parentId = entry.parentId.startsWith('pending-') ? tempIdToId.get(entry.parentId) : entry.parentId
        }
        const menuPayload: Parameters<typeof createMenuItem>[0] = {
          name: effectiveName,
          icon: entry.icon || undefined,
          resourceUrlId,
          code: baseCode,
          ...(hubId ? { hubId } : {}),
          ...(parentId ? { parentId } : {}),
          ...(entry.rank != null ? { rank: entry.rank } : {})
        }
        try {
          await createMenuItem(menuPayload, false)
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Failed to create menu item')
          return
        }
      }
    }

    let assignmentRank = 0
    for (let urlIndex = 0; urlIndex < rowsToSubmit.length; urlIndex++) {
      const row = rowsToSubmit[urlIndex]
      const baseUrl = row.url?.trim() ?? ''
      for (let flowIndex = 0; flowIndex < row.flows.length; flowIndex++) {
        const flowRow = row.flows[flowIndex]
        const paramParts = flowRow.queryParams
          .filter(p => p.key?.trim())
          .map(p => `${encodeURIComponent(p.key.trim())}=${(p.expression ?? '').trim()}`)
        const suffix = paramParts.length ? '?' + paramParts.join('&') : ''
        const targetDesktop = baseUrl + suffix
        const targetMobile = flowRow.targetMobileOverride?.trim() || targetDesktop
        if (!flowRow.flowName.trim() || !targetDesktop) continue
        const flowId =
          flowRow.flowName.trim().replace(/\s+/g, '-').toLowerCase() || `flow-${Date.now()}-${urlIndex}-${flowIndex}`
        const actionPayload: Omit<ActionDTO, 'id'> = {
          flowName: flowRow.flowName.trim(),
          flowId,
          processName: '',
          flowType: flowRow.flowType,
          domain: '',
          targetDesktop,
          targetMobile
        }
        const created = await createAction(actionPayload)
        if (!created) {
          setSubmitError('Failed to create flow action')
          return
        }
        if (flowRow.contextId) {
          const ctx = contextById.get(flowRow.contextId)
          if (ctx) {
            const assignmentResult = await createActionAssignment({
              context: ctx,
              assignments: [
                {
                  id: `temp-${assignmentRank}`,
                  flowItem: created,
                  permission: 'execute',
                  rank: assignmentRank
                }
              ]
            })
            if (!assignmentResult) {
              setSubmitError('Failed to create flow assignment')
              return
            }
          }
        }
        assignmentRank++
      }
    }

    onOpenChange(false)
    onSuccess?.()
  }, [
    validateForm,
    urlRows,
    bundleMode,
    code,
    name,
    componentPath,
    componentVersion,
    initialData?.existingComponentId,
    createComponent,
    updateComponent,
    createNavigation,
    updateNavigation,
    createMenuItem,
    createAction,
    createActionAssignment,
    contextById,
    roleOptions,
    featureOptions,
    pendingMenuItems,
    onOpenChange,
    onSuccess
  ])

  const rowsForDebug = useMemo(() => (bundleMode === 'simple' ? urlRows.slice(0, 1) : urlRows), [bundleMode, urlRows])

  const debugSteps = useMemo((): DebugStep[] => {
    const steps: DebugStep[] = []
    let order = 1
    const displayName = name.trim() || '<Name>'
    const displayComponentPath = componentPath.trim() || '<Component path>'
    const rootName = name.trim()
    const baseCode = code.trim()

    if (displayName !== '<Name>' || displayComponentPath !== '<Component path>') {
      const rowsWithUrl = rowsForDebug.filter(r => r.url?.trim())
      if (rowsWithUrl.length > 0) {
        rowsWithUrl.forEach(row => {
          const rowUrl = row.url!.trim()
          const screenKey = urlPathToScreenKey(rowUrl)
          const componentPayload: Omit<
            Component,
            'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
          > = {
            name: getUrlEffectiveName(row, rootName || displayName),
            screenKey,
            namespaceCode: DEFAULT_NAMESPACE_CODE,
            namespaceId: DEFAULT_NAMESPACE_ID,
            namespaceDescription: DEFAULT_NAMESPACE_CODE,
            type: 'SCREEN',
            screenComponents: {
              key: screenKey,
              name: getUrlEffectiveName(row, rootName || displayName),
              builderType: 'NATIVE_SCREEN',
              appName: getUrlEffectiveName(row, rootName || displayName),
              flowIcon: '',
              formDefinition: { componentPath: displayComponentPath, version: componentVersion?.trim() || '' },
              release: ''
            }
          }
          steps.push({ order: order++, method: 'POST', endpoint: '/screen', payload: componentPayload })
        })
      } else {
        const screenKey = displayName !== '<Name>' ? '<from URL when set>' : '<from URL>'
        const componentPayload: Omit<
          Component,
          'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
        > = {
          name: displayName,
          screenKey,
          namespaceCode: DEFAULT_NAMESPACE_CODE,
          namespaceId: DEFAULT_NAMESPACE_ID,
          namespaceDescription: DEFAULT_NAMESPACE_CODE,
          type: 'SCREEN',
          screenComponents: {
            key: screenKey,
            name: displayName,
            builderType: 'NATIVE_SCREEN',
            appName: displayName,
            flowIcon: '',
            formDefinition: { componentPath: displayComponentPath, version: componentVersion?.trim() || '' },
            release: ''
          }
        }
        steps.push({ order: order++, method: 'POST', endpoint: '/screen', payload: componentPayload })
      }
    }

    rowsForDebug.forEach(row => {
      if (!row.url?.trim()) return
      const navName = getUrlEffectiveName(row, rootName)
      const roleNames = row.roles.map(id => roleOptions.find(r => r.id === id)?.name).filter(Boolean) as string[]
      const featureNames = row.features
        .map(id => featureOptions.find(f => f.id === id)?.name)
        .filter(Boolean) as string[]
      const navPayload: Omit<NavigationDTO, 'id'> = {
        code: baseCode,
        name: navName,
        url: row.url.trim(),
        roles: roleNames.length ? roleNames.map(n => ({ name: n })) : undefined,
        features: featureNames.length ? featureNames.map(n => ({ name: n })) : undefined
      }
      steps.push({ order: order++, method: 'POST', endpoint: '/resource-url', payload: navPayload })
    })

    rowsForDebug.forEach((row, urlIndex) => {
      const urlEffectiveName = getUrlEffectiveName(row, rootName)
      row.menuEntries.forEach(entry => {
        const effectiveName = getMenuEntryEffectiveName(entry, urlEffectiveName)
        if (!effectiveName) return
        const menuPayload: Record<string, unknown> = {
          name: effectiveName,
          icon: entry.icon || undefined,
          resourceUrlId: '<from navigation response for URL index ' + urlIndex + '>',
          code: baseCode,
          ...(entry.hubId ? { hubId: entry.hubId } : entry.parentId ? { parentId: entry.parentId } : {})
        }
        if (entry.definePath && entry.pathString?.trim()) menuPayload.pathString = entry.pathString.trim()
        steps.push({
          order: order++,
          method: 'POST',
          endpoint: '/menuItems',
          payload: menuPayload,
          note:
            entry.definePath && entry.pathString?.trim()
              ? 'Path resolved to hubId/parentId on submit. Waits for navigation response above.'
              : 'Waits for navigation service response (step above for this URL) to get resourceUrlId.'
        })
      })
    })

    rowsForDebug.forEach((row, urlIndex) => {
      const baseUrl = row.url?.trim() ?? ''
      row.flows.forEach((flowRow, flowIndex) => {
        const paramParts = flowRow.queryParams
          .filter(p => p.key?.trim())
          .map(p => `${encodeURIComponent(p.key.trim())}=${(p.expression ?? '').trim()}`)
        const suffix = paramParts.length ? '?' + paramParts.join('&') : ''
        const targetDesktop = baseUrl + suffix
        const targetMobile = flowRow.targetMobileOverride?.trim() || targetDesktop
        if (!flowRow.flowName.trim() || !targetDesktop) return
        const flowId = flowRow.flowName.trim().replace(/\s+/g, '-').toLowerCase() || `flow-${urlIndex}-${flowIndex}`
        const actionPayload: Omit<ActionDTO, 'id'> = {
          flowName: flowRow.flowName.trim(),
          flowId,
          processName: '',
          flowType: flowRow.flowType,
          domain: '',
          targetDesktop,
          targetMobile
        }
        steps.push({ order: order++, method: 'POST', endpoint: '/flow-items', payload: actionPayload })
        if (flowRow.contextId) {
          const ctx = contextById.get(flowRow.contextId)
          if (ctx) {
            steps.push({
              order: order++,
              method: 'POST',
              endpoint: '/flow-assignments',
              payload: { flowItemId: '<from flow-items response>', contextId: ctx.id, permission: 'execute', rank: 0 },
              note: 'Uses action id from previous flow-items response.'
            })
          }
        }
      })
    })

    return steps
  }, [code, name, componentPath, componentVersion, rowsForDebug, roleOptions, featureOptions, contextById])

  const firstUrl = urlRows[0]?.url?.trim()
  const rootNameForSubmit = name.trim()
  const hasMenuEntryWithoutParent = urlRows.some(row => {
    const urlEffectiveName = getUrlEffectiveName(row, rootNameForSubmit)
    return row.menuEntries.some(e => {
      const hasName = getMenuEntryEffectiveName(e, urlEffectiveName)
      const hasPlace = e.pathString?.trim() || e.hubId || e.parentId
      return hasName && !hasPlace
    })
  })
  const canSubmit =
    code.trim() &&
    name.trim() &&
    componentPath.trim() &&
    firstUrl &&
    !componentPathError &&
    !urlRows.some(r => r.urlError) &&
    !hasMenuEntryWithoutParent

  const simpleModeFirstRow = urlRows[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:flex gba:flex-col gba:max-w-6xl gba:max-h-[95vh] gba:min-w-0 gba:p-0 gba:overflow-hidden"
        data-testid={dataTestId}
      >
        <DialogHeader className="gba:shrink-0 gba:px-6 gba:pt-6 gba:pb-2">
          <DialogTitle>Screen bundle</DialogTitle>
        </DialogHeader>

        <Tabs
          value={bundleMode}
          onValueChange={v => setBundleMode(v as 'simple' | 'advanced')}
          className="gba:flex gba:flex-col gba:min-h-0 gba:flex-1 gba:flex gba:overflow-hidden"
        >
          <TabsList className="gba:shrink-0 gba:mx-6 gba:mb-2 gba:w-auto" data-testid={`${dataTestId}-mode-tabs`}>
            <TabsTrigger value="simple" data-testid={`${dataTestId}-mode-simple`}>
              Simple
            </TabsTrigger>
            <TabsTrigger value="advanced" data-testid={`${dataTestId}-mode-advanced`}>
              Advanced
            </TabsTrigger>
          </TabsList>
          <TabsContent value="simple" className="gba:flex-1 gba:overflow-y-auto gba:mt-0 gba:px-6 gba:pb-4">
            <SimpleModeContent
              state={{
                code,
                setCode,
                name,
                setName,
                componentPath,
                setComponentPath,
                setComponentPathError,
                componentPathError,
                componentVersion,
                setComponentVersion,
                codeUnifiedWarning,
                simpleModeFirstRow,
                handleUrlRowChange,
                selectedMenuSpace,
                setSelectedMenuSpace,
                advancedSelectPathOptions,
                pathOptionById,
                handleMenuEntryPathSelect,
                handleAddMenuEntryAdvanced,
                handleReorderMenuEntryAdvanced,
                handleRemoveMenuEntry,
                handleMenuEntryChange,
                debugSteps,
                dataTestId,
                roleOptions,
                featureOptions
              }}
            />
          </TabsContent>
          <TabsContent value="advanced" className="gba:flex-1 gba:overflow-y-auto gba:mt-0 gba:px-6 gba:pb-4">
            <div className="gba:space-y-8 gba:py-4 gba:px-1">
              <section className="gba:space-y-4">
                {codeUnifiedWarning && (
                  <p
                    className="gba:text-xs gba:text-amber-600 gba:bg-amber-500/10 gba:px-3 gba:py-2 gba:rounded-md"
                    data-testid={`${dataTestId}-code-unified-warning`}
                  >
                    Alle Codes werden vereinheitlicht.
                  </p>
                )}
                <div className="gba:grid gba:grid-cols-[minmax(0,10rem)_1fr] gba:gap-4">
                  <div className="gba:space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="e.g. my-screen"
                      className="gba:w-full"
                      data-testid={`${dataTestId}-code`}
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Display name"
                      className="gba:w-full"
                      data-testid={`${dataTestId}-name`}
                    />
                  </div>
                </div>
                <div className="gba:grid gba:grid-cols-[1fr_minmax(0,6rem)] gba:gap-4">
                  <div className="gba:space-y-2 gba:min-w-0">
                    <Label htmlFor="componentPath">Component path *</Label>
                    <Input
                      id="componentPath"
                      value={componentPath}
                      onChange={e => {
                        setComponentPath(e.target.value)
                        setComponentPathError(null)
                      }}
                      placeholder="/module/core/apps/my-screen"
                      className={`gba:w-full ${componentPathError ? 'gba:border-destructive' : ''}`}
                      data-testid={`${dataTestId}-component-path`}
                    />
                    {componentPathError && (
                      <p
                        className="gba:text-sm gba:text-destructive"
                        data-testid={`${dataTestId}-component-path-error`}
                      >
                        {componentPathError}
                      </p>
                    )}
                  </div>
                  <div className="gba:space-y-2 gba:min-w-0">
                    <Label htmlFor="componentVersion">Version</Label>
                    <Input
                      id="componentVersion"
                      value={componentVersion}
                      onChange={e => setComponentVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="gba:w-full"
                      data-testid={`${dataTestId}-component-version`}
                    />
                  </div>
                </div>
              </section>

              <section className="gba:space-y-4">
                <Tabs value={activeUrlTab} onValueChange={v => setActiveUrlTab(v)} className="gba:w-full">
                  <TabsList className="gba:flex-wrap gba:h-auto gba:gap-1 gba:mb-3">
                    {urlRows.map((row, urlIndex) => (
                      <TabsTrigger
                        key={urlIndex}
                        value={String(urlIndex)}
                        className="gba:data-[state=active]:gba:bg-muted"
                        data-testid={`${dataTestId}-url-tab-${urlIndex}`}
                      >
                        {row.url?.trim() || `URL ${urlIndex + 1}`}
                      </TabsTrigger>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gba:ml-1"
                      onClick={() => {
                        handleAddUrlRow()
                        setActiveUrlTab(String(urlRows.length))
                      }}
                      data-testid={`${dataTestId}-add-url-tab`}
                    >
                      <PlusIcon size={14} className="gba:mr-1" />
                      Add URL
                    </Button>
                  </TabsList>
                  {urlRows.map((row, urlIndex) => (
                    <TabsContent
                      key={urlIndex}
                      value={String(urlIndex)}
                      className="gba:space-y-4 gba:mt-0 gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-muted/10"
                    >
                      <div className="gba:space-y-2">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Checkbox
                            id={`${dataTestId}-url-use-custom-name-${urlIndex}`}
                            checked={row.useCustomName ?? false}
                            onCheckedChange={checked => handleUrlRowChange(urlIndex, 'useCustomName', checked === true)}
                            data-testid={`${dataTestId}-url-use-custom-name-${urlIndex}`}
                          />
                          {row.useCustomName ? (
                            <Input
                              value={row.customName ?? ''}
                              onChange={e => handleUrlRowChange(urlIndex, 'customName', e.target.value)}
                              placeholder={PLACEHOLDER_DISPLAY_NAME}
                              className="gba:flex-1 gba:min-w-0 gba:max-w-sm"
                              data-testid={`${dataTestId}-url-custom-name-${urlIndex}`}
                            />
                          ) : (
                            <span className="gba:text-sm gba:text-muted-foreground">
                              {getUrlEffectiveName(row, name.trim())}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="gba:space-y-2 gba:pb-3 gba:border-b gba:border-border">
                        <Label
                          htmlFor={`${dataTestId}-url-input-${urlIndex}`}
                          className="gba:text-xs gba:font-medium gba:text-muted-foreground"
                        >
                          {urlRows.length === 1 ? 'URL' : `URL ${urlIndex + 1}`}
                        </Label>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:flex-1 gba:min-w-0">
                            <Input
                              id={`${dataTestId}-url-input-${urlIndex}`}
                              value={row.url}
                              onChange={e => handleUrlRowChange(urlIndex, 'url', e.target.value)}
                              placeholder="/platform/apps/my-screen"
                              className={`gba:w-full ${row.urlError ? 'gba:border-destructive' : ''}`}
                              data-testid={`${dataTestId}-url-${urlIndex}`}
                            />
                            {row.urlError && (
                              <p className="gba:text-xs gba:text-destructive gba:mt-0.5">{row.urlError}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleRemoveUrlRow(urlIndex)
                              setActiveUrlTab(String(Math.max(0, urlIndex - 1)))
                            }}
                            disabled={urlRows.length <= 1}
                            data-testid={`${dataTestId}-remove-url-${urlIndex}`}
                          >
                            <TrashIcon size={16} />
                          </Button>
                        </div>
                      </div>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                        <Combobox
                          mode="multiple"
                          options={roleOptions.map(r => ({ value: r.id, label: r.name }))}
                          value={row.roles}
                          onValueChange={v =>
                            handleUrlRowChange(urlIndex, 'roles', Array.isArray(v) ? v : v ? [v] : [])
                          }
                          placeholder="Roles"
                          data-testid={`${dataTestId}-url-roles-${urlIndex}`}
                        />
                        <Combobox
                          mode="multiple"
                          options={featureOptions.map(f => ({ value: f.id, label: f.name }))}
                          value={row.features}
                          onValueChange={v =>
                            handleUrlRowChange(urlIndex, 'features', Array.isArray(v) ? v : v ? [v] : [])
                          }
                          placeholder="Features"
                          data-testid={`${dataTestId}-url-features-${urlIndex}`}
                        />
                      </div>
                      <div className="gba:pt-3 gba:border-t gba:border-border">
                        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-3">
                          <p className="gba:text-sm gba:font-medium gba:text-foreground">Menu entries</p>
                          <Tabs
                            value={advancedMenuEntryView}
                            onValueChange={v => setAdvancedMenuEntryView(v as 'select' | 'tree')}
                            className="gba:flex gba:gap-0"
                          >
                            <TabsList className="gba:h-8">
                              <TabsTrigger value="select" className="gba:text-xs gba:px-3">
                                Select
                              </TabsTrigger>
                              <TabsTrigger value="tree" className="gba:text-xs gba:px-3">
                                Tree
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        {advancedMenuEntryView === 'tree' && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:leading-relaxed">
                            Pick a space, open one hub. Use the target icon to place or remove this URL under a node
                            (one per node). Use + to add a new menu item. Arrows reorder.
                          </p>
                        )}
                        {advancedMenuEntryView === 'select' && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:leading-relaxed">
                            Pick a space, then choose a path per entry. Add multiple entries with the button below.
                          </p>
                        )}
                        <div className="gba:mb-3">
                          <Select
                            value={selectedMenuSpace}
                            onValueChange={v => setSelectedMenuSpace(v as MenuSpaceType)}
                            data-testid={`${dataTestId}-menu-space-select`}
                          >
                            <SelectTrigger className="gba:w-[10rem] gba:h-9">
                              <SelectValue placeholder="Space" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USE">{getSpaceLabel('USE')}</SelectItem>
                              <SelectItem value="CREATE">{getSpaceLabel('CREATE')}</SelectItem>
                              <SelectItem value="MANAGE">{getSpaceLabel('MANAGE')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {advancedMenuEntryView === 'tree' && (
                          <MenuTree
                            menuItems={menuHubsBySpace}
                            urlRowIndex={urlIndex}
                            row={row}
                            rootName={name.trim()}
                            pathOptionById={pathOptionById}
                            expandedIds={menuTreeExpandedIds}
                            pendingMenuItems={pendingMenuItems}
                            dataTestId={dataTestId}
                            callbacks={{
                              onToggleExpand: handleMenuTreeToggleExpand,
                              onToggleUrlAtParent: handleToggleUrlAtParent,
                              onAddPendingChild: handleAddPendingChild,
                              onMovePending: handleMovePending,
                              onRemovePendingChild: handleRemovePendingChild,
                              onPendingItemNameChange: handlePendingItemNameChange,
                              onMenuEntryChange: handleMenuEntryChange,
                              onRemoveMenuEntry: handleRemoveMenuEntry,
                              onMoveEntry: handleMoveMenuEntry
                            }}
                          />
                        )}
                        {advancedMenuEntryView === 'select' && (
                          <div className="gba:space-y-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/5 gba:p-4">
                            {row.menuEntries.map((entry, entryIndex) => {
                              const placementNodeId = entry.parentId ?? entry.hubId ?? ''
                              const pathSelectValue =
                                placementNodeId && pathOptionById.has(placementNodeId)
                                  ? placementNodeId
                                  : (Array.from(pathOptionById.entries()).find(
                                      ([, { path }]) => path === (entry.pathString ?? '')
                                    )?.[0] ?? '')
                              return (
                                <div
                                  key={entryIndex}
                                  className="gba:flex gba:flex-wrap gba:items-end gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border/60"
                                >
                                  <div className="gba:flex-1 gba:min-w-[12rem] gba:space-y-1">
                                    <Label className="gba:text-xs gba:text-muted-foreground">Path</Label>
                                    <Combobox
                                      options={advancedSelectPathOptions}
                                      value={pathSelectValue}
                                      onValueChange={id =>
                                        id != null && handleMenuEntryPathSelect(urlIndex, entryIndex, id)
                                      }
                                      placeholder="e.g. Use / My Hub / Section"
                                      searchPlaceholder="Search path..."
                                      className="gba:w-full"
                                      data-testid={`${dataTestId}-advanced-select-path-${urlIndex}-${entryIndex}`}
                                    />
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-2">
                                    <Checkbox
                                      id={`${dataTestId}-advanced-select-use-custom-name-${urlIndex}-${entryIndex}`}
                                      checked={entry.useCustomName ?? false}
                                      onCheckedChange={c =>
                                        handleMenuEntryChange(urlIndex, entryIndex, 'useCustomName', c === true)
                                      }
                                      data-testid={`${dataTestId}-advanced-select-use-custom-name-${urlIndex}-${entryIndex}`}
                                      aria-label="Name override"
                                    />
                                    {entry.useCustomName ? (
                                      <Input
                                        value={entry.name ?? ''}
                                        onChange={e =>
                                          handleMenuEntryChange(urlIndex, entryIndex, 'name', e.target.value)
                                        }
                                        placeholder={PLACEHOLDER_MENU_ENTRY_NAME}
                                        className="gba:w-44 gba:min-w-0"
                                        data-testid={`${dataTestId}-advanced-select-entry-name-${urlIndex}-${entryIndex}`}
                                      />
                                    ) : (
                                      <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[10rem]">
                                        {pathSelectValue
                                          ? getMenuEntryEffectiveName(entry, getUrlEffectiveName(row, name.trim()))
                                          : '-'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="gba:h-8 gba:w-8"
                                      onClick={() => handleReorderMenuEntryAdvanced(urlIndex, entryIndex, 'up')}
                                      disabled={entryIndex === 0}
                                      aria-label="Move up"
                                      data-testid={`${dataTestId}-advanced-select-move-up-${urlIndex}-${entryIndex}`}
                                    >
                                      <CaretUp size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="gba:h-8 gba:w-8"
                                      onClick={() => handleReorderMenuEntryAdvanced(urlIndex, entryIndex, 'down')}
                                      disabled={entryIndex === row.menuEntries.length - 1}
                                      aria-label="Move down"
                                      data-testid={`${dataTestId}-advanced-select-move-down-${urlIndex}-${entryIndex}`}
                                    >
                                      <CaretDown size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="gba:h-8 gba:w-8 gba:text-muted-foreground gba:hover:text-destructive"
                                      onClick={() => handleRemoveMenuEntry(urlIndex, entryIndex)}
                                      aria-label="Remove entry"
                                      data-testid={`${dataTestId}-advanced-select-remove-${urlIndex}-${entryIndex}`}
                                    >
                                      <TrashIcon size={16} />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddMenuEntryAdvanced(urlIndex)}
                              data-testid={`${dataTestId}-advanced-select-add-entry-${urlIndex}`}
                            >
                              <PlusIcon size={14} className="gba:mr-1" />
                              Add menu entry
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="gba:pt-3 gba:border-t gba:border-border">
                        <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                          Flows (optional)
                        </p>
                        {row.flows.map((flowRow, flowIndex) => {
                          const baseUrl = row.url?.trim() ?? ''
                          const paramParts = flowRow.queryParams
                            .filter(p => p.key?.trim())
                            .map(p => `${p.key.trim()}=${(p.expression ?? '').trim()}`)
                          const resolvedDesktopUrl = baseUrl + (paramParts.length ? '?' + paramParts.join('&') : '')
                          return (
                            <div key={flowIndex} className="gba:space-y-3 gba:p-3 gba:rounded gba:bg-muted/20 gba:mt-2">
                              <div className="gba:grid gba:grid-cols-[auto_1fr_auto_1fr_auto] gba:gap-3 gba:items-end gba:min-w-0">
                                <div className="gba:space-y-1">
                                  <Label className="gba:text-xs gba:text-muted-foreground">Type</Label>
                                  <Combobox
                                    options={[
                                      { value: 'NAVIGATION', label: 'NAVIGATION' },
                                      { value: 'REPORT', label: 'REPORT' }
                                    ]}
                                    value={flowRow.flowType}
                                    onValueChange={v =>
                                      handleFlowEntryChange(
                                        urlIndex,
                                        flowIndex,
                                        'flowType',
                                        v === 'REPORT' ? 'REPORT' : 'NAVIGATION'
                                      )
                                    }
                                    placeholder="Type"
                                    className="gba:min-w-[7rem]"
                                    data-testid={`${dataTestId}-flow-type-${urlIndex}-${flowIndex}`}
                                  />
                                </div>
                                <div className="gba:space-y-1 gba:min-w-0">
                                  <Label className="gba:text-xs gba:text-muted-foreground">Flow name *</Label>
                                  <Input
                                    value={flowRow.flowName}
                                    onChange={e =>
                                      handleFlowEntryChange(urlIndex, flowIndex, 'flowName', e.target.value)
                                    }
                                    placeholder="e.g. Open record"
                                    className="gba:w-full"
                                    data-testid={`${dataTestId}-flow-name-${urlIndex}-${flowIndex}`}
                                  />
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gba:shrink-0"
                                      data-testid={`${dataTestId}-flow-mobile-override-trigger-${urlIndex}-${flowIndex}`}
                                    >
                                      <DeviceMobileIcon size={16} className="gba:mr-1" />
                                      {flowRow.targetMobileOverride ? 'Mobile overridden' : 'Override mobile'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="gba:w-96" align="end">
                                    <div className="gba:space-y-2">
                                      <Label>Alternative target URL for mobile (empty = same as desktop)</Label>
                                      <Input
                                        value={flowRow.targetMobileOverride}
                                        onChange={e =>
                                          handleFlowEntryChange(
                                            urlIndex,
                                            flowIndex,
                                            'targetMobileOverride',
                                            e.target.value
                                          )
                                        }
                                        placeholder={resolvedDesktopUrl || 'e.g. /platform/...'}
                                        className="gba:w-full"
                                        data-testid={`${dataTestId}-flow-target-mobile-override-${urlIndex}-${flowIndex}`}
                                      />
                                      <p className="gba:text-xs gba:text-muted-foreground">
                                        Desktop: {resolvedDesktopUrl || '-'}
                                      </p>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <div className="gba:flex gba:items-end gba:gap-2 gba:min-w-0">
                                  <div className="gba:flex-1 gba:min-w-0 gba:space-y-1">
                                    <Label className="gba:text-xs gba:text-muted-foreground">Context (optional)</Label>
                                    <Combobox
                                      options={contextOptions}
                                      value={flowRow.contextId ?? ''}
                                      onValueChange={v =>
                                        handleFlowEntryChange(urlIndex, flowIndex, 'contextId', v || null)
                                      }
                                      placeholder="Context"
                                      searchPlaceholder="Search..."
                                      className="gba:w-full"
                                      data-testid={`${dataTestId}-flow-context-${urlIndex}-${flowIndex}`}
                                    />
                                  </div>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gba:shrink-0"
                                        data-testid={`${dataTestId}-flow-create-context-${urlIndex}-${flowIndex}`}
                                      >
                                        Create context
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="gba:w-80" align="end">
                                      <div className="gba:space-y-3">
                                        <Label>New context name</Label>
                                        <Input
                                          value={newContextName}
                                          onChange={e => setNewContextName(e.target.value)}
                                          placeholder="Context name"
                                          data-testid={`${dataTestId}-flow-new-context-name`}
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => handleCreateContextForFlow(urlIndex, flowIndex)}
                                          disabled={!newContextName?.trim() || isCreatingContext}
                                          data-testid={`${dataTestId}-flow-create-context-submit`}
                                        >
                                          {isCreatingContext ? 'Creating...' : 'Create and assign'}
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="gba:shrink-0"
                                  onClick={() => handleRemoveFlowEntry(urlIndex, flowIndex)}
                                  data-testid={`${dataTestId}-remove-flow-${urlIndex}-${flowIndex}`}
                                >
                                  <TrashIcon size={16} />
                                </Button>
                              </div>
                              <div className="gba:space-y-2">
                                <Label className="gba:text-xs gba:text-muted-foreground">
                                  Query parameters (key = expression)
                                </Label>
                                <div className="gba:space-y-2">
                                  {flowRow.queryParams.map((param, paramIndex) => (
                                    <div
                                      key={paramIndex}
                                      className="gba:grid gba:grid-cols-[1fr_1fr_auto] gba:gap-3 gba:items-center gba:min-w-0"
                                    >
                                      <div className="gba:space-y-1 gba:min-w-0">
                                        <Label className="gba:text-xs gba:text-muted-foreground gba:sr-only">Key</Label>
                                        <Input
                                          value={param.key}
                                          onChange={e =>
                                            handleFlowQueryParamChange(
                                              urlIndex,
                                              flowIndex,
                                              paramIndex,
                                              'key',
                                              e.target.value
                                            )
                                          }
                                          placeholder="employeeId"
                                          className="gba:w-full"
                                          data-testid={`${dataTestId}-flow-param-key-${urlIndex}-${flowIndex}-${paramIndex}`}
                                        />
                                      </div>
                                      <div className="gba:space-y-1 gba:min-w-0">
                                        <Label className="gba:text-xs gba:text-muted-foreground gba:sr-only">
                                          Expression
                                        </Label>
                                        <Input
                                          value={param.expression}
                                          onChange={e =>
                                            handleFlowQueryParamChange(
                                              urlIndex,
                                              flowIndex,
                                              paramIndex,
                                              'expression',
                                              e.target.value
                                            )
                                          }
                                          placeholder="{managerId}"
                                          className="gba:w-full"
                                          data-testid={`${dataTestId}-flow-param-expression-${urlIndex}-${flowIndex}-${paramIndex}`}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="gba:shrink-0"
                                        onClick={() => handleRemoveFlowQueryParam(urlIndex, flowIndex, paramIndex)}
                                        data-testid={`${dataTestId}-remove-flow-param-${urlIndex}-${flowIndex}-${paramIndex}`}
                                      >
                                        <TrashIcon size={16} />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="gba:flex gba:justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddFlowQueryParam(urlIndex, flowIndex)}
                                      data-testid={`${dataTestId}-add-flow-param-${urlIndex}-${flowIndex}`}
                                    >
                                      <PlusIcon size={16} className="gba:mr-1" />
                                      Add query param
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div className="gba:flex gba:justify-center gba:mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gba:text-xs gba:text-muted-foreground hover:gba:text-foreground"
                            onClick={() => handleAddFlowEntry(urlIndex)}
                            data-testid={`${dataTestId}-add-flow-entry-${urlIndex}`}
                          >
                            <PlusIcon size={14} className="gba:mr-1" />
                            Add flow
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <DebugSection steps={debugSteps} data-testid={`${dataTestId}-debug`} />

              {submitError && (
                <p className="gba:text-sm gba:text-destructive" data-testid={`${dataTestId}-submit-error`}>
                  {submitError}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gba:shrink-0 gba:mt-auto gba:sticky gba:bottom-0 gba:border-t gba:bg-background gba:px-6 gba:py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} data-testid={`${dataTestId}-submit`}>
            {isSubmitting ? 'Creating...' : 'Create component, URL and menu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
