import { useState, useCallback } from 'react'

export interface AssetDialogState {
  isRegisterOpen: boolean
  isAllocateOpen: boolean
  isReturnOpen: boolean
  isRetireOpen: boolean
  isDeleteOpen: boolean
  editingAssetId: string | null
  allocatingAssetId: string | null
  returningAssetId: string | null
  retiringAssetId: string | null
  deletingAssetId: string | null
}

export const useAssetDialogs = () => {
  const [state, setState] = useState<AssetDialogState>({
    isRegisterOpen: false,
    isAllocateOpen: false,
    isReturnOpen: false,
    isRetireOpen: false,
    isDeleteOpen: false,
    editingAssetId: null,
    allocatingAssetId: null,
    returningAssetId: null,
    retiringAssetId: null,
    deletingAssetId: null
  })

  const openRegister = useCallback((assetId?: string) => {
    setState(prev => ({
      ...prev,
      isRegisterOpen: true,
      editingAssetId: assetId || null
    }))
  }, [])

  const openAllocate = useCallback((assetId: string) => {
    setState(prev => ({
      ...prev,
      isAllocateOpen: true,
      allocatingAssetId: assetId
    }))
  }, [])

  const openReturn = useCallback((assetId: string) => {
    setState(prev => ({
      ...prev,
      isReturnOpen: true,
      returningAssetId: assetId
    }))
  }, [])

  const closeRegister = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRegisterOpen: false,
      editingAssetId: null
    }))
  }, [])

  const closeAllocate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAllocateOpen: false,
      allocatingAssetId: null
    }))
  }, [])

  const closeReturn = useCallback(() => {
    setState(prev => ({
      ...prev,
      isReturnOpen: false,
      returningAssetId: null
    }))
  }, [])

  const openRetire = useCallback((assetId: string) => {
    setState(prev => ({
      ...prev,
      isRetireOpen: true,
      retiringAssetId: assetId
    }))
  }, [])

  const openDelete = useCallback((assetId: string) => {
    setState(prev => ({
      ...prev,
      isDeleteOpen: true,
      deletingAssetId: assetId
    }))
  }, [])

  const closeRetire = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRetireOpen: false,
      retiringAssetId: null
    }))
  }, [])

  const closeDelete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDeleteOpen: false,
      deletingAssetId: null
    }))
  }, [])

  const closeAll = useCallback(() => {
    setState({
      isRegisterOpen: false,
      isAllocateOpen: false,
      isReturnOpen: false,
      isRetireOpen: false,
      isDeleteOpen: false,
      editingAssetId: null,
      allocatingAssetId: null,
      returningAssetId: null,
      retiringAssetId: null,
      deletingAssetId: null
    })
  }, [])

  return {
    ...state,
    openRegister,
    openAllocate,
    openReturn,
    openRetire,
    openDelete,
    closeRegister,
    closeAllocate,
    closeReturn,
    closeRetire,
    closeDelete,
    closeAll
  }
}
