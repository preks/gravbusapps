export const GET_EMPLOYEE_ASSETS = `
  query GetEmployeeAssets($employeeId: uuid!) {
    EmployeeAsset(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false } }
      orderBy: { startDate: DESC }
    ) {
      id
      startDate
      endDate
      expectedEndDate
      notes
      startAssetConditionRef
      endAssetConditionRef
      asset {
        id
        model
        serialNumber
        assetStatus
        assetBrand {
          id
          code
          value
        }
        assetCategory {
          id
          code
          value
        }
      }
      startAssetCondition {
        id
        code
        value
      }
      endAssetCondition {
        id
        code
        value
      }
    }
  }
`
