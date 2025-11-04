/**
 * Account Mapper
 * Maps context-specific Account implementations to CommonAccount structure
 */

import type { CommonAccount } from '../types/commonAccountTypes'
import type { BaseCustomerAccount } from '@/common/data/customer/types/customerRelationBaseTypes'
import type { BaseInvestmentAccount } from '@/common/data/investment/types/investmentRelationBaseTypes'
import type { Address } from '@/common/data/common/types/commonTypes'

/**
 * Map Customer Account to Common Account structure
 * Handles field name differences and data transformations
 */
export function mapCustomerAccountToCommon(customer: BaseCustomerAccount): CommonAccount {
  return {
    ...customer,

    // Map picture URLs to base64 fields
    picture: customer.pictureUrl,
    pictureThumbnail: customer.pictureThumbnailUrl,

    // Map catalog naming: industry → industryClass
    industryClass: customer.industry,
    industryClassRef: customer.industryRef,

    // Map catalog naming: numberOfEmployees → companySize
    companySize: customer.numberOfEmployees,
    companySizeRef: customer.numberOfEmployeesRef,

    // Map catalog naming: annualRevenue → annualRevenueBand
    annualRevenueBand: customer.annualRevenue,
    annualRevenueBandRef: customer.annualRevenueRef

    // addresses is already correct (GraphQL alias handles crmAddress → addresses)
    // communicationChannels is already correct
  }
}

/**
 * Map Investment Account to Common Account structure
 * Handles field name differences and data transformations
 */
export function mapInvestmentAccountToCommon(investment: BaseInvestmentAccount): CommonAccount {
  // Map investmentAddress to addresses (with locality transformation)
  const addresses: Address[] | undefined = investment.investmentAddress?.map(addr => ({
    id: addr.id,
    addressType: addr.addressType,
    addressLine: addr.addressLine,
    locality: addr.locality,
    postalCode: addr.postalCode,
    region: addr.region,
    country: addr.country,
    createdAt: addr.createdAt,
    updatedAt: addr.updatedAt,
    createdBy: addr.createdBy,
    updatedBy: addr.updatedBy,
    isDeleted: addr.isDeleted,
    version: addr.version
  }))

  return {
    ...investment,

    // Map investmentAddress → addresses
    addresses,

    // Map catalog naming: accountAnnualRevenueBand → annualRevenueBand
    annualRevenueBand: investment.accountAnnualRevenueBand,
    annualRevenueBandRef: investment.accountAnnualRevenueBandRef

    // picture, pictureThumbnail already correct
    // industryClass, companySize already correct
    // communicationChannels already correct
  }
}

/**
 * Generic mapper that handles both Customer and Investment Accounts
 * Detects type based on available fields
 */
export function mapAccountToCommon(account: BaseCustomerAccount | BaseInvestmentAccount): CommonAccount {
  // Detect if Customer (has industry field) or Investment (has industryClass field)
  if ('industry' in account && account.industry) {
    return mapCustomerAccountToCommon(account as BaseCustomerAccount)
  }

  if ('investmentAddress' in account && account.investmentAddress) {
    return mapInvestmentAccountToCommon(account as BaseInvestmentAccount)
  }

  // Default: try Investment mapper
  return mapInvestmentAccountToCommon(account as BaseInvestmentAccount)
}
