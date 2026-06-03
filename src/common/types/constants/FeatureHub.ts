import {
  CoreFeatureCollaborationValue,
  CoreFeatureHomeModeValue,
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
  HomeMode: { Key: 'core.home.mode', Values: CoreFeatureHomeModeValue },
  AiAgent: { Key: 'core.aiagent.enabled' },
  TeamChat: { Key: 'core.teamchat.enabled' },
  ChatTeam: { Key: 'core.chat.team.enabled' },
  ChatAI: { Key: 'core.chat.ai.enabled' }
}

const HCMFeature = {
  EmployeeProfile: { Key: 'hcm.employee-profile.mode', Values: HCMFeatureEmployeeProfileValue },
  EmployeeAbsence: { Key: 'hcm.employee-absence.enabled' },
  EmployeeExpenses: { Key: 'hcm.employee-expenses.enabled' },
  HRDevelopment: { Key: 'human-resources.performance.enabled' },
  Compensation: { Key: 'human-resources.compensation.enabled' },
  Recruiting: { Key: 'human-resources.recruiting.enabled' },
  Assets: { Key: 'assets.enabled' }
}

const CRMFeature = {
  Accounts: { Key: 'crm.accounts.enabled' },
  CustomerRelations: { Key: 'customer-relations.enabled' },
  DocuSign: { Key: 'customer-relations.docusign.enabled' }
}

const IRMFeature = {
  DocuSign: { Key: 'investment-relations.docusign.enabled' }
}

const ServicesFeature = {
  Enabled: { Key: 'services.enabled' }
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
  DashboardLayout: { Key: 'platform.dashboard-layout.mode', Values: PlatformFeatureDashboardLayoutValue },
  EveryAI: { Key: 'everyai.enabled' },
  WorkHome: { Key: 'platform.work-home.enabled' }
}

const EveryBoxFeature = {
  AiEnabled: { Key: 'everybox.ai.enabled' },
  AiInsightsEnabled: { Key: 'everyboxadmin.ai.enabled' }
}

const DevFeature = {
  Enabled: { Key: 'dev.enabled' }
}

const PreviewFeature = {
  Enabled: { Key: 'preview.enabled' }
}

const ReportingFeature = {
  Internal: {
    Enabled: { Key: 'reporting.internal.enabled' }
  }
}

export const Feature = {
  OrgChart: OrgChartFeature,
  Core: CoreFeature,
  HCM: HCMFeature,
  CRM: CRMFeature,
  IRM: IRMFeature,
  Services: ServicesFeature,
  FLOW: FLOWFeature,
  Platform: PlatformFeature,
  Dev: DevFeature,
  Preview: PreviewFeature,
  Reporting: ReportingFeature,
  EveryBox: EveryBoxFeature
}
