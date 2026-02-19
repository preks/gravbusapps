export interface NominatedPeer {
  id: string
  name: string
}

export interface PerformanceEvaluationPeerApproveFormValues {
  nominatedPeers: NominatedPeer[]
  approved: boolean | null
  comment?: string
}

export interface PerformanceEvaluationPeerApproveFormProps {
  onSubmit?: (values: PerformanceEvaluationPeerApproveFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}
