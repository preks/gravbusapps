import { useEffect } from 'react'

interface ProcessEventHandlers {
  onAssetProcessComplete?: () => void
  onAllocationProcessComplete?: () => void
  onReturnProcessComplete?: () => void
  onRetireProcessComplete?: () => void
  onUpdateAsset?: (assetId: string) => void
  onAllocateAsset?: (assetId: string) => void
  onCloseDialogs?: () => void
}

export const useAssetProcessEvents = (handlers: ProcessEventHandlers) => {
  const {
    onAssetProcessComplete,
    onAllocationProcessComplete,
    onReturnProcessComplete,
    onRetireProcessComplete,
    onUpdateAsset,
    onAllocateAsset,
    onCloseDialogs
  } = handlers

  useEffect(() => {
    const handleProcessCompletion = (event: CustomEvent) => {
      const detail = event.detail
      if (detail?.resolution !== 'success') return

      const processName = (detail?.processName || '').toLowerCase()
      const domain = (detail?.domain || '').toLowerCase()

      const isAssetProcess = domain === 'employee' && processName.includes('asset')
      const isAllocationProcess =
        domain === 'employee' && (processName.includes('allocate') || processName.includes('employeeasset'))
      const isReturnProcess =
        domain === 'employee' &&
        (processName.includes('return') || processName.includes('deallocate') || processName.includes('retrieve'))
      const isStatusChangeProcess =
        domain === 'employee' && (processName.includes('updateasset') || processName.includes('retire'))

      if (isAssetProcess || detail?.response?.asset) {
        onAssetProcessComplete?.()
      }

      if (isAllocationProcess || detail?.response?.allocation || detail?.response?.employeeAsset) {
        onAllocationProcessComplete?.()
      }

      if (isReturnProcess || detail?.response?.deallocation) {
        onReturnProcessComplete?.()
      }

      const isRetiredStatus =
        detail?.response?.asset?.assetStatus === 'RETIRED_ASSET' || detail?.response?.asset?.assetStatus === 'RETIRED'
      if (isStatusChangeProcess && isRetiredStatus) {
        onRetireProcessComplete?.()
      }
    }

    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion as EventListener)
    window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion as EventListener)
      window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener)
    }
  }, [onAssetProcessComplete, onAllocationProcessComplete, onReturnProcessComplete, onRetireProcessComplete])

  useEffect(() => {
    const handleProcessContinue = (event: CustomEvent) => {
      if (event.detail?.event === 'pse_abort') {
        onCloseDialogs?.()
      }
    }

    window.addEventListener('com.newwork.process.continue', handleProcessContinue as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.continue', handleProcessContinue as EventListener)
    }
  }, [onCloseDialogs])

  useEffect(() => {
    const handleUpdateAssetAction = (event: CustomEvent) => {
      const assetId = event.detail?.assetId || event.detail?.id
      if (assetId && onUpdateAsset) {
        onUpdateAsset(assetId)
      }
    }

    window.addEventListener('update-asset', handleUpdateAssetAction as EventListener)

    return () => {
      window.removeEventListener('update-asset', handleUpdateAssetAction as EventListener)
    }
  }, [onUpdateAsset])

  useEffect(() => {
    const handleProcessStart = (event: Event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent.detail
      const processName = (detail?.processName || '').toLowerCase()
      const domain = (detail?.domain || '').toLowerCase()
      const startProcessBody = detail?.startProcessBody || {}

      const extractAssetId = () => {
        return (
          startProcessBody.assetId ||
          startProcessBody.asset?.id ||
          startProcessBody.saveAssetModelInput?.asset?.id ||
          startProcessBody.updateAssetModelInput?.asset?.id ||
          detail?.assetId ||
          (startProcessBody as any)?.assetId
        )
      }

      const interceptAndOpen = (handler: (assetId: string) => void, assetId: string) => {
        event.stopImmediatePropagation()
        event.stopPropagation()
        event.preventDefault()
        if (customEvent.stopImmediatePropagation) customEvent.stopImmediatePropagation()
        if (customEvent.stopPropagation) customEvent.stopPropagation()
        if (customEvent.preventDefault) customEvent.preventDefault()
        handler(assetId)
        return false
      }

      const isAllocateProcess = domain === 'employee' && processName === 'createemployeeasset'
      if (isAllocateProcess) {
        const assetId = extractAssetId()
        if (assetId && onAllocateAsset) {
          return interceptAndOpen(onAllocateAsset, assetId)
        }
      }

      const isUpdateAssetProcess =
        domain === 'employee' && (processName === 'updateasset' || processName.includes('update-asset'))
      if (isUpdateAssetProcess) {
        const assetId = extractAssetId()
        if (assetId && onUpdateAsset) {
          return interceptAndOpen(onUpdateAsset, assetId)
        }
      }
    }

    const options = { capture: true, passive: false } as AddEventListenerOptions
    window.addEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)

    return () => {
      window.removeEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)
    }
  }, [onUpdateAsset, onAllocateAsset])
}
