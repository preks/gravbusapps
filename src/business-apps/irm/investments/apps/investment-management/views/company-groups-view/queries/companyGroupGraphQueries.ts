import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { INVESTMENT_COMPANY_REF } from '@/common/data/investment/queries/fragments/investmentReferenceFragments'

const INVESTMENT_COMPANY_GRAPH_REF = `
  ${INVESTMENT_COMPANY_REF}
  description
  pictureThumbnail
  investmentCompanyExecutives(where: { isDeleted: { _eq: false } }) {
    id
    employeeId
    investmentContactId
    executiveTypeRef
    executiveType {
      value
      code
    }
    employee {
      id
      displayName
      fullName
      firstName
      lastName
    }
    investmentContact {
      id
      fullName
      firstName
      lastName
    }
  }
`

export const buildInvestmentCompanyGroupGraphQuery = (): string => `
  query GetInvestmentCompanyGroupGraph($id: uuid!) {
    InvestmentCompanyGroupByPk(id: $id) {
      id
      ${AUDIT_FIELDS}
      name
      investmentCompanyGroupAssociation(where: { isDeleted: { _eq: false } }) {
        id
        investmentCompanyId
        investmentCompany {
          ${INVESTMENT_COMPANY_GRAPH_REF}
          investmentCompanyOwnership(where: { isDeleted: { _eq: false } }) {
            id
            investmentCompanyId
            ownerInvestmentCompanyId
            percentage
            ownerInvestmentCompany {
              ${INVESTMENT_COMPANY_GRAPH_REF}
            }
          }
        }
      }
    }
  }
`
