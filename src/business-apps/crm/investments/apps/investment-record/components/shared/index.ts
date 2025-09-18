// Shared Investment Record Components
// Consolidated and cleaned up for better maintainability
// Note: CompanyInformation and ContactDetails replaced with standard AccountSection and ContactSection
export { default as InvestmentHomeTab } from './InvestmentHomeTab';
export { default as InvestmentTileSection } from './InvestmentTileSection';
export { default as InvestmentReportsTab } from './InvestmentReportsTab';

// Consolidated action buttons
export { GenerateOnePagerButton, UploadReportButton } from './InvestmentActionButtons';

// Note: Group-specific components moved to ../group-specific/ directory
// Import them directly from there: EquityInvestmentRounds, RealEstateLiquidityForecast