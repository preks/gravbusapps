import React, { createContext, useContext } from 'react'

const FlowProposalFormContext = createContext<string | null>(null)

export function FlowProposalFormProvider(props: { flowProposalId: string; children: React.ReactNode }) {
  return (
    <FlowProposalFormContext.Provider value={props.flowProposalId}>{props.children}</FlowProposalFormContext.Provider>
  )
}

export function useFlowProposalId(): string | null {
  return useContext(FlowProposalFormContext)
}
