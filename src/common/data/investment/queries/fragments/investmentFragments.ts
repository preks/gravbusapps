import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments';


export const INVESTMENT_REF=`
    id
    code
    name
    isin
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    acquisitionDate
    exitDate
    
    # Basic investment info
    investmentType {
    ${CATALOG_ENTRY}
    }
    currency {
    ${CATALOG_ENTRY}
    }
`;

export const INVESTMENT = `
    id
    code
    name
    isin
    acquisitionDate
    planedExit
    plannedExitDate
    exitDate
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    debtFinancingAmount
    requiredCapitalAmount
    forecastedRevenueAmount
    forecastedProfitAmount
    stakePercentage
    loanRecipientName
    loanAmount
    loanOpenCommitmentAmount
    loanInterestRate
    loanStartDate
    loanEndDate
    loanInterestClaim
    totalCommitmentAmount
    totalDistributionAmount
    fundManagerName
    ${AUDIT_FIELDS}

    # Catalog relationships
    investmentGroup {
        ${CATALOG_ENTRY}
    }
    investmentType {
        ${CATALOG_ENTRY}
    }
    investmentStakeType {
        ${CATALOG_ENTRY}
    }
    investmentStatus {
        ${CATALOG_ENTRY}
    }
    investmentRiskLevel {
        ${CATALOG_ENTRY}
    }
    currency {
        ${CATALOG_ENTRY}
    }

    # Employee relationship
    ownerEmployee {
        ${EMPLOYEE_REF}
    }
`;

