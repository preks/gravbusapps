import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerApproveFormValues, NominatedPeer } from '../types'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useNominatedPeersFromProcess } from '../hooks/useNominatedPeersFromProcess'
import { useEmployeeDisplayNames } from '../hooks/useEmployeeDisplayNames'
import { useEmployeeForPeerApproveHeader } from '../hooks/useEmployeeForPeerApproveHeader'

import { useStructureEmployees } from '../../performance-evaluation-form/hooks/useStructureEmployees'

export interface EmployeeForHeader {
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobTitle?: string
}

export const MIN_PEERS = 3
export const MAX_PEERS = 5

/** Map peer id -> replacement employee id when manager chooses a different employee. */
export type PeerReplacements = Record<string, string | null>

export interface AdditionalPeerSlot {
  slotId: string
  employeeId: string | null
}

interface PerformanceEvaluationPeerApproveContextType {
  nominatedPeers: NominatedPeer[]
  peersLoading: boolean
  isLoading: boolean
  error: string | null
  clearError: () => void
  onApprove: () => Promise<void>
  onReject: (comment?: string) => Promise<void>
  businessAppContext: BusinessAppContextProps
  evaluatedEmployeeId: string | null
  managerEmployeeId: string | null
  employeeForHeader: EmployeeForHeader | null
  employeeForHeaderLoading: boolean
  peerReplacements: PeerReplacements
  setPeerReplacement: (peerId: string, replacementEmployeeId: string | null) => void
  removedPeerIds: Set<string>
  removeNominatedPeer: (peerId: string) => void
  restoreNominatedPeer: (peerId: string) => void
  additionalSlots: AdditionalPeerSlot[]
  addPeerSlot: () => void
  removePeerSlot: (slotId: string) => void
  setAdditionalPeerEmployee: (slotId: string, employeeId: string | null) => void
  totalPeerCount: number
  canAddPeers: boolean
  canRemovePeers: boolean
  isValid: boolean
  replacementEmployees: Array<{
    id: string
    name: string
    jobTitle?: string
    department?: string
    pictureThumbnail?: string
    userId?: string
  }>
  replacementEmployeesLoading: boolean
  searchReplacementEmployees: (search: string) => Promise<void>
  getReplacementEmployeeById: (
    employeeId: string
  ) =>
    | { id: string; name: string; jobTitle?: string; department?: string; pictureThumbnail?: string; userId?: string }
    | undefined
}

const PerformanceEvaluationPeerApproveContext = createContext<PerformanceEvaluationPeerApproveContextType | undefined>(
  undefined
)

interface PerformanceEvaluationPeerApproveProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  onSubmit?: (values: PerformanceEvaluationPeerApproveFormValues) => Promise<void>
}

function getNominatedPeersFromPayload(ad: Record<string, unknown> | undefined): NominatedPeer[] {
  if (!ad) return []
  const taskPayload = ad.psi_taskPayload as Record<string, unknown> | undefined
  const processInputs = (ad.psi_processMetadata as Record<string, unknown> | undefined)?.inputs as
    | Record<string, unknown>
    | undefined
  const initialParams = taskPayload?.psi_initialParameters as Record<string, unknown> | undefined

  const peerNomination = (taskPayload?.peerNominationRequest ??
    processInputs?.peerNominationRequest ??
    initialParams?.peerNominationRequest) as
    | {
        nominatedEmployeeIds?: string[]
        nominatedEmployeeNames?: string[]
        peerEmployeeIds?: string[]
        peerEmployeeNames?: string[]
      }
    | undefined

  const ids = peerNomination?.nominatedEmployeeIds ?? peerNomination?.peerEmployeeIds ?? ([] as string[])
  const names = (peerNomination?.nominatedEmployeeNames ?? peerNomination?.peerEmployeeNames ?? []) as string[]

  if (!Array.isArray(ids) || ids.length === 0) return []
  return ids.map((id, index) => ({
    id,
    name: Array.isArray(names) && names[index] ? String(names[index]) : id
  }))
}

let slotCounter = 0

export const PerformanceEvaluationPeerApproveProvider: React.FC<PerformanceEvaluationPeerApproveProviderProps> = ({
  children,
  businessAppContext,
  onSubmit = async () => {}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peerReplacements, setPeerReplacements] = useState<PeerReplacements>({})
  const [removedPeerIds, setRemovedPeerIds] = useState<Set<string>>(new Set())
  const [additionalSlots, setAdditionalSlots] = useState<AdditionalPeerSlot[]>([])

  const ad = businessAppContext?.additionalData as Record<string, unknown> | undefined

  const {
    employeeForHeader,
    evaluatedEmployeeId,
    loading: employeeForHeaderLoading,
    error: employeeForHeaderError
  } = useEmployeeForPeerApproveHeader(businessAppContext?.accessToken, ad)

  const {
    peers: peersFromProcess,
    loading: peersLoading,
    error: peersError
  } = useNominatedPeersFromProcess(businessAppContext?.accessToken, ad)
  const peersFromPayload = useMemo(() => getNominatedPeersFromPayload(ad), [ad])

  const {
    employees: structureEmployees,
    isLoading: replacementEmployeesLoading,
    fetchStructureEmployees,
    getEmployeeById: getStructureEmployeeById
  } = useStructureEmployees(businessAppContext?.accessToken ?? '', true, evaluatedEmployeeId ?? undefined)

  const nominatedPeersRaw = useMemo(
    () => (peersFromProcess.length > 0 ? peersFromProcess : peersFromPayload),
    [peersFromProcess, peersFromPayload]
  )
  const peerIds = useMemo(() => nominatedPeersRaw.map(p => p.id), [nominatedPeersRaw])
  const { displayNames, loading: namesLoading } = useEmployeeDisplayNames(businessAppContext?.accessToken, peerIds)

  const nominatedPeers = useMemo(
    () =>
      nominatedPeersRaw.map(p => ({
        ...p,
        name: displayNames[p.id] ?? p.name
      })),
    [nominatedPeersRaw, displayNames]
  )

  const activeNominatedPeers = useMemo(
    () => nominatedPeers.filter(p => !removedPeerIds.has(p.id)),
    [nominatedPeers, removedPeerIds]
  )

  const totalPeerCount = activeNominatedPeers.length + additionalSlots.length
  const canAddPeers = totalPeerCount < MAX_PEERS
  const canRemovePeers = totalPeerCount > MIN_PEERS
  const allAdditionalSlotsFilled = additionalSlots.every(s => s.employeeId != null)
  const isValid = totalPeerCount >= MIN_PEERS && totalPeerCount <= MAX_PEERS && allAdditionalSlotsFilled

  const resolvedError = error ?? peersError ?? employeeForHeaderError
  const peersLoadingResolved = peersLoading || (peerIds.length > 0 && namesLoading)

  const clearError = useCallback(() => setError(null), [])

  const setPeerReplacement = useCallback((peerId: string, replacementEmployeeId: string | null) => {
    setPeerReplacements(prev => {
      const next = { ...prev }
      if (replacementEmployeeId == null) {
        delete next[peerId]
      } else {
        next[peerId] = replacementEmployeeId
      }
      return next
    })
  }, [])

  const removeNominatedPeer = useCallback((peerId: string) => {
    setRemovedPeerIds(prev => new Set([...prev, peerId]))
    setPeerReplacements(prev => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

  const restoreNominatedPeer = useCallback((peerId: string) => {
    setRemovedPeerIds(prev => {
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const addPeerSlot = useCallback(() => {
    slotCounter += 1
    setAdditionalSlots(prev => [...prev, { slotId: `slot-${slotCounter}`, employeeId: null }])
  }, [])

  const removePeerSlot = useCallback((slotId: string) => {
    setAdditionalSlots(prev => prev.filter(s => s.slotId !== slotId))
  }, [])

  const setAdditionalPeerEmployee = useCallback((slotId: string, employeeId: string | null) => {
    setAdditionalSlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, employeeId } : s)))
  }, [])

  const buildPeerApprovalPayload = useCallback(
    (approved: boolean) => {
      const nominatedDecisions = activeNominatedPeers.map(p => {
        const replacementId = peerReplacements[p.id]
        return {
          employeeId: p.id,
          approved,
          ...(replacementId ? { replacementEmployeeId: replacementId } : {})
        }
      })

      const additionalDecisions = additionalSlots
        .filter(s => s.employeeId != null)
        .map(s => ({
          employeeId: s.employeeId as string,
          approved
        }))

      return {
        peerApprovalRequest: {
          decisions: [...nominatedDecisions, ...additionalDecisions]
        }
      }
    },
    [activeNominatedPeers, peerReplacements, additionalSlots]
  )

  const handleApprove = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      dispatchProcessContinueEvent('pse_submit', buildPeerApprovalPayload(true))
      await onSubmit({
        nominatedPeers: activeNominatedPeers,
        approved: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setIsLoading(false)
    }
  }, [activeNominatedPeers, onSubmit, buildPeerApprovalPayload])

  const handleReject = useCallback(
    async (comment?: string) => {
      try {
        setIsLoading(true)
        setError(null)
        dispatchProcessContinueEvent('pse_submit', buildPeerApprovalPayload(false))
        await onSubmit({
          nominatedPeers: activeNominatedPeers,
          approved: false,
          comment
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject')
      } finally {
        setIsLoading(false)
      }
    },
    [activeNominatedPeers, onSubmit, buildPeerApprovalPayload]
  )

  const searchReplacementEmployees = useCallback(
    async (search: string) => {
      await fetchStructureEmployees(search)
    },
    [fetchStructureEmployees]
  )

  const getReplacementEmployeeById = useCallback(
    (employeeId: string) => {
      const emp = getStructureEmployeeById(employeeId)
      if (!emp) return undefined
      return {
        id: emp.id,
        name: emp.name,
        jobTitle: emp.jobTitle,
        department: emp.department,
        pictureThumbnail: emp.pictureThumbnail,
        userId: emp.userId
      }
    },
    [getStructureEmployeeById]
  )

  const value = useMemo<PerformanceEvaluationPeerApproveContextType>(
    () => ({
      nominatedPeers: activeNominatedPeers,
      peersLoading: peersLoadingResolved,
      isLoading,
      error: resolvedError,
      clearError,
      onApprove: handleApprove,
      onReject: handleReject,
      businessAppContext,
      evaluatedEmployeeId: evaluatedEmployeeId ?? null,
      managerEmployeeId: businessAppContext?.userInfo?.employeeDetails?.employeeId ?? null,
      employeeForHeader,
      employeeForHeaderLoading,
      peerReplacements,
      setPeerReplacement,
      removedPeerIds,
      removeNominatedPeer,
      restoreNominatedPeer,
      additionalSlots,
      addPeerSlot,
      removePeerSlot,
      setAdditionalPeerEmployee,
      totalPeerCount,
      canAddPeers,
      canRemovePeers,
      isValid,
      replacementEmployees: structureEmployees,
      replacementEmployeesLoading,
      searchReplacementEmployees,
      getReplacementEmployeeById
    }),
    [
      activeNominatedPeers,
      peersLoadingResolved,
      isLoading,
      resolvedError,
      clearError,
      handleApprove,
      handleReject,
      businessAppContext,
      evaluatedEmployeeId,
      employeeForHeader,
      employeeForHeaderLoading,
      peerReplacements,
      setPeerReplacement,
      removedPeerIds,
      removeNominatedPeer,
      restoreNominatedPeer,
      additionalSlots,
      addPeerSlot,
      removePeerSlot,
      setAdditionalPeerEmployee,
      totalPeerCount,
      canAddPeers,
      canRemovePeers,
      isValid,
      structureEmployees,
      replacementEmployeesLoading,
      searchReplacementEmployees,
      getReplacementEmployeeById
    ]
  )

  return (
    <PerformanceEvaluationPeerApproveContext.Provider value={value}>
      {children}
    </PerformanceEvaluationPeerApproveContext.Provider>
  )
}

export const usePerformanceEvaluationPeerApprove = (): PerformanceEvaluationPeerApproveContextType => {
  const context = useContext(PerformanceEvaluationPeerApproveContext)
  if (!context) {
    throw new Error('usePerformanceEvaluationPeerApprove must be used within PerformanceEvaluationPeerApproveProvider')
  }
  return context
}
