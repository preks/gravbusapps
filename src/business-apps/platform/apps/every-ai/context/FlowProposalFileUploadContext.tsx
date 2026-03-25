import React, { createContext, useContext } from 'react'
import type { FlowProposalFileBinding } from '../hooks/useFlowBot'

type UploadFn = (files: File[], binding: FlowProposalFileBinding) => Promise<void>

const FlowProposalFileUploadContext = createContext<UploadFn | null>(null)

export function FlowProposalFileUploadProvider(props: { upload: UploadFn; children: React.ReactNode }) {
  return (
    <FlowProposalFileUploadContext.Provider value={props.upload}>
      {props.children}
    </FlowProposalFileUploadContext.Provider>
  )
}

export function useFlowProposalFileUpload(): UploadFn {
  const ctx = useContext(FlowProposalFileUploadContext)
  if (!ctx) {
    throw new Error('useFlowProposalFileUpload must be used within FlowProposalFileUploadProvider')
  }
  return ctx
}
