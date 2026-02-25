import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerApproveFormValues, NominatedPeer } from '../types'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useNominatedPeersFromProcess } from '../hooks/useNominatedPeersFromProcess'
import { useEmployeeDisplayNames } from '../hooks/useEmployeeDisplayNames'
import { useEmployeeForPeerApproveHeader } from '../hooks/useEmployeeForPeerApproveHeader'

export interface EmployeeForHeader {
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobTitle?: string
}

interface PerformanceEvaluationPeerApproveContextType {
  nominatedPeers: NominatedPeer[]
  peersLoading: boolean
  isLoading: boolean
  error: string | null
  clearError: () => void
  onApprove: () => Promise<void>
  onReject: (comment?: string) => Promise<void>
  onCancel: () => Promise<void>
  businessAppContext: BusinessAppContextProps
  employeeForHeader: EmployeeForHeader | null
  employeeForHeaderLoading: boolean
}

const PerformanceEvaluationPeerApproveContext = createContext<PerformanceEvaluationPeerApproveContextType | undefined>(
  undefined
)

interface PerformanceEvaluationPeerApproveProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  onSubmit?: (values: PerformanceEvaluationPeerApproveFormValues) => Promise<void>
  onCancel?: () => Promise<void>
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
  onSubmit = async () => {},
  onCancel = async () => {}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const buildPeerApprovalPayload = useCallback(
    (approved: boolean) => ({
      peerApprovalRequest: {
        decisions: nominatedPeers.map(p => ({
          employeeId: p.id,
          approved
        }))
      }
    }),
    [nominatedPeers]
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

  const handleCancel = useCallback(async () => {
    try {
      dispatchProcessContinueEvent('pse_abort', {})
      await onCancel()
    } catch {
      // ignore
    }
  }, [onCancel])

  const value = useMemo<PerformanceEvaluationPeerApproveContextType>(
    () => ({
      nominatedPeers,
      peersLoading: peersLoadingResolved,
      isLoading,
      error: resolvedError,
      clearError,
      onApprove: handleApprove,
      onReject: handleReject,
      onCancel: handleCancel,
      businessAppContext,
      employeeForHeader,
      employeeForHeaderLoading
    }),
    [
      nominatedPeers,
      peersLoadingResolved,
      isLoading,
      resolvedError,
      clearError,
      handleApprove,
      handleReject,
      handleCancel,
      businessAppContext,
      employeeForHeader,
      employeeForHeaderLoading
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
