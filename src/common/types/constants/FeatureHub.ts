import {
  CoreFeatureCollaborationValue,
  CoreFeatureIntranetValue,
  HCMFeatureEmployeeProfileValue,
  OrgChartCapabilityModeValue,
  OrgChartFinanceModeValue,
  OrgChartMatrixModeValue,
  OrgChartOrganizationModeValue,
  OrgChartSiteLocationModeValue,
  OrgChartLegalModeValue,
  PlatformFeatureDashboardLayoutValue,
  SiteLocationAlgorithmValue
} from '@/common/types/enums/FeatureHub'

const OrgChartFeature = {
  Organization: { Key: 'orgchart.organization.mode', Values: OrgChartOrganizationModeValue },
  Matrix: { Key: 'orgchart.matrix.mode', Values: OrgChartMatrixModeValue },
  Capability: { Key: 'orgchart.capability.mode', Values: OrgChartCapabilityModeValue },
  Finance: { Key: 'orgchart.finance.mode', Values: OrgChartFinanceModeValue },
  UnfoldNodes: { Key: 'orgchart.unfold.nodes.enabled' },
  SiteLocation: { Key: 'orgchart.siteLocation.mode', Values: OrgChartSiteLocationModeValue },
  Legal: { Key: 'orgchart.legal.mode', Values: OrgChartLegalModeValue },
  SiteLocationAlgorithm: { Key: 'orgchart.siteLocationAlgorithm.mode', Values: SiteLocationAlgorithmValue },
  Planning: { Key: 'orgchart.planning.enabled' }
}

const CoreFeature = {
  Collaboration: { Key: 'core.collaboration.mode', Values: CoreFeatureCollaborationValue },
  Intranet: { Key: 'core.intranet.mode', Values: CoreFeatureIntranetValue },
  AiAgent: { Key: 'core.aiagent.enabled' }
}

const HCMFeature = {
  EmployeeProfile: { Key: 'hcm.employee-profile.mode', Values: HCMFeatureEmployeeProfileValue },
  EmployeeAbsence: { Key: 'hcm.employee-absence.enabled' },
  EmployeeExpenses: { Key: 'hcm.employee-expenses.enabled' }
}

const CRMFeature = {
  Accounts: { Key: 'crm.accounts.enabled' }
}

const Servicedesk = {
  Servicedesk: { Key: 'servicedesk.enabled' }
}

const FLOWFeature = {
  Creator: { Key: 'flow.creator.enabled' },
  Success: { Key: 'flow.success.enabled' },
  Guardian: { Key: 'flow.guardian.enabled' }
}

const PlatformFeature = {
  Development: { Key: 'platform.create.development.enabled' },
  Deployment: { Key: 'platform.create.deployment.enabled' },
  Cloud: { Key: 'platform.create.cloud.enabled' },
  GlobalManagement: { Key: 'platform.global.manage.enabled' },
  FlowBot: { Key: 'platform.ai.flowbot.enabled' },
  DashboardLayout: { Key: 'platform.dashboard-layout.mode', Values: PlatformFeatureDashboardLayoutValue }
}

const DevFeature = {
  Enabled: { Key: 'dev.enabled' }
}

export const Feature = {
  OrgChart: OrgChartFeature,
  Core: CoreFeature,
  HCM: HCMFeature,
  CRM: CRMFeature,
  ServiceDesk: Servicedesk,
  FLOW: FLOWFeature,
  Platform: PlatformFeature,
  Dev: DevFeature
}
