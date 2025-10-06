// Investment Report Seeds - Ready for API Submission
import liquidFundInvestmentReports from './liquidFundInvestmentReports.json';
import equityInvestmentReports from './equityInvestmentReports.json';
import realEstateInvestmentReports from './realEstateInvestmentReports.json';

export {
  liquidFundInvestmentReports,
  equityInvestmentReports,
  realEstateInvestmentReports
};

// Total Report Count Summary
// Liquid Fund: 17 monthly reports (3 investments × 6 months each, with some having fewer)
// Equity: 32 quarterly reports (4 investments × 8 quarters each)
// Real Estate: 24 quarterly reports (3 investments × 8 quarters each)
// TOTAL: 73 investment report payloads
