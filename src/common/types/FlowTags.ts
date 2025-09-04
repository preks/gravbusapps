/**
 * Flow Tags System for metadata-based querying
 * Enables key:value tagging for flows to support filtering like solution:compliance
 */

export interface FlowTag {
  key: string;
  value: string;
}

export interface FlowTags {
  [key: string]: string;
}

/**
 * Predefined tag keys for common use cases
 */
export const FLOW_TAG_KEYS = {
  SOLUTION: 'solution',
  DEPARTMENT: 'department', 
  CATEGORY: 'category',
  PRIORITY: 'priority',
  COMPLIANCE_TYPE: 'complianceType',
  RISK_LEVEL: 'riskLevel',
  INDUSTRY: 'industry',
  REGULATION: 'regulation',
  PROCESS_TYPE: 'processType',
  COMPLEXITY: 'complexity',
  DURATION: 'duration',
  OWNER: 'owner',
  VERSION: 'version',
  STATUS: 'status'
} as const;

/**
 * Predefined tag values for solutions
 */
export const SOLUTION_TAGS = {
  COMPLIANCE: 'compliance',
  ADVISORY: 'advisory', 
  TRAINING: 'training',
  AUDIT: 'audit',
  RISK_MANAGEMENT: 'riskManagement',
  POLICY: 'policy',
  INCIDENT: 'incident',
  APPROVAL: 'approval'
} as const;

/**
 * Predefined tag values for compliance types
 */
export const COMPLIANCE_TYPE_TAGS = {
  GDPR: 'gdpr',
  SOX: 'sox',
  HIPAA: 'hipaa',
  ISO_27001: 'iso27001',
  PCI_DSS: 'pciDss',
  SOC2: 'soc2',
  ANTI_MONEY_LAUNDERING: 'aml',
  KYC: 'kyc',
  DATA_RETENTION: 'dataRetention',
  PRIVACY_IMPACT: 'privacyImpact'
} as const;

/**
 * Utility functions for working with flow tags
 */
export class FlowTagUtils {
  /**
   * Convert tags object to array of FlowTag objects
   */
  static tagsToArray(tags: FlowTags): FlowTag[] {
    return Object.entries(tags).map(([key, value]) => ({ key, value }));
  }

  /**
   * Convert array of FlowTag objects to tags object
   */
  static tagsFromArray(tagArray: FlowTag[]): FlowTags {
    return tagArray.reduce((acc, tag) => {
      acc[tag.key] = tag.value;
      return acc;
    }, {} as FlowTags);
  }

  /**
   * Create query string for tag-based filtering
   */
  static createTagQuery(tags: Partial<FlowTags>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}:${value}`)
      .join(' AND ');
  }

  /**
   * Parse tag query string into tags object
   */
  static parseTagQuery(query: string): Partial<FlowTags> {
    const tags: Partial<FlowTags> = {};
    
    // Split by AND and process each tag
    const tagPairs = query.split(/\s+AND\s+/i);
    
    for (const pair of tagPairs) {
      const [key, value] = pair.split(':');
      if (key && value) {
        tags[key.trim()] = value.trim();
      }
    }
    
    return tags;
  }

  /**
   * Check if a flow matches tag criteria
   */
  static matchesTags(flowTags: FlowTags, criteria: Partial<FlowTags>): boolean {
    return Object.entries(criteria).every(([key, value]) => 
      flowTags[key] === value
    );
  }

  /**
   * Get default tags for a compliance solution flow
   */
  static getComplianceSolutionTags(additionalTags: Partial<FlowTags> = {}): FlowTags {
    return {
      [FLOW_TAG_KEYS.SOLUTION]: SOLUTION_TAGS.COMPLIANCE,
      [FLOW_TAG_KEYS.CATEGORY]: 'businessProcess',
      [FLOW_TAG_KEYS.PROCESS_TYPE]: 'approval',
      ...additionalTags
    };
  }

  /**
   * Get default tags for an advisory solution flow
   */
  static getAdvisorySolutionTags(additionalTags: Partial<FlowTags> = {}): FlowTags {
    return {
      [FLOW_TAG_KEYS.SOLUTION]: SOLUTION_TAGS.ADVISORY,
      [FLOW_TAG_KEYS.CATEGORY]: 'businessProcess',
      [FLOW_TAG_KEYS.PROCESS_TYPE]: 'consultation',
      ...additionalTags
    };
  }
}

/**
 * Extended workflow metadata with tagging support
 */
export interface WorkflowMetadataWithTags {
  flowType: string;
  originalTemplate: any;
  createdAt: string;
  subflowVersions: {
    assignmentHandler: number;
    actionHandler: number;
  };
  // New tagging fields
  tags: FlowTags;
  searchableText?: string; // For full-text search
  createdBy?: string;
  lastModified?: string;
  solutionVersion?: string;
}


