// Test hook to verify demo data loading
import { useBomData } from './useBomData'

export const testBomDataHook = () => {
  console.log('Testing BOM data hook...')

  // Test with no access token (should trigger demo data)
  const result = useBomData({ accessToken: '' })

  console.log('Hook result:', {
    bomsCount: result.boms.length,
    kpiData: result.kpiData,
    loading: result.loading,
    isUsingDemoData: result.isUsingDemoData,
    error: result.error
  })

  return result
}
