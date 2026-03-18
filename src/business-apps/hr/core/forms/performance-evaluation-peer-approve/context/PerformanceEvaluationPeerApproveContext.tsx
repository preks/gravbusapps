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

/** Map peer id -> replacement employee id when manager chooses a different employee. */
export type PeerReplacements = Record<string, string | null>

interface PerformanceEvaluationPeerApproveContextType {
  nominatedPeers: NominatedPeer[]
  peersLoading: boolean
  isLoading: boolean
  error: string | null
  clearError: () => void
  onApprove: () => Promise<void>
  onReject: (comment?: string) => Promise<void>
  businessAppContext: BusinessAppContextProps
  employeeForHeader: EmployeeForHeader | null
  employeeForHeaderLoading: boolean
  /** Manager can replace a nominated peer with another employee; key = peer id, value = replacement employee id */
  peerReplacements: PeerReplacements
  setPeerReplacement: (peerId: string, replacementEmployeeId: string | null) => void
  /** For replacement dropdown: employees from structure, search, loading */
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

export const PerformanceEvaluationPeerApproveProvider: React.FC<PerformanceEvaluationPeerApproveProviderProps> = ({
  children,
  businessAppContext,
  onSubmit = async () => {}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peerReplacements, setPeerReplacements] = useState<PeerReplacements>({})

  const ad = businessAppContext?.additionalData as Record<string, unknown> | undefined

  const {
    employeeForHeader,
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
  } = useStructureEmployees(businessAppContext?.accessToken ?? '', true)

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

  const buildPeerApprovalPayload = useCallback(
    (approved: boolean) => ({
      peerApprovalRequest: {
        decisions: nominatedPeers.map(p => {
          const replacementId = peerReplacements[p.id]
          return {
            employeeId: p.id,
            approved,
            ...(replacementId ? { replacementEmployeeId: replacementId } : {})
          }
        })
      }
    }),
    [nominatedPeers, peerReplacements]
  )

  const handleApprove = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      dispatchProcessContinueEvent('pse_submit', buildPeerApprovalPayload(true))
      await onSubmit({
        nominatedPeers,
        approved: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setIsLoading(false)
    }
  }, [nominatedPeers, onSubmit, buildPeerApprovalPayload])

  const handleReject = useCallback(
    async (comment?: string) => {
      try {
        setIsLoading(true)
        setError(null)
        dispatchProcessContinueEvent('pse_submit', buildPeerApprovalPayload(false))
        await onSubmit({
          nominatedPeers,
          approved: false,
          comment
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject')
      } finally {
        setIsLoading(false)
      }
    },
    [nominatedPeers, onSubmit, buildPeerApprovalPayload]
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
      nominatedPeers,
      peersLoading: peersLoadingResolved,
      isLoading,
      error: resolvedError,
      clearError,
      onApprove: handleApprove,
      onReject: handleReject,
      businessAppContext,
      employeeForHeader,
      employeeForHeaderLoading,
      peerReplacements,
      setPeerReplacement,
      replacementEmployees: structureEmployees,
      replacementEmployeesLoading,
      searchReplacementEmployees,
      getReplacementEmployeeById
    }),
    [
      nominatedPeers,
      peersLoadingResolved,
      isLoading,
      resolvedError,
      clearError,
      handleApprove,
      handleReject,
      businessAppContext,
      employeeForHeader,
      employeeForHeaderLoading,
      peerReplacements,
      setPeerReplacement,
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
