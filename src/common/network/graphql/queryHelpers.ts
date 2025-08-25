/**
 * Simple GraphQL query helpers
 * Common patterns for building where conditions with minimal complexity
 */

import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { BaseQueryVariables, QueryOptions } from './commonTypes';

// ==========================================
// SIMPLE WHERE BUILDERS
// ==========================================

/**
 * Build basic where condition with common filters
 */
export const buildWhere = (
  variables: BaseQueryVariables = {},
  options: QueryOptions = {}
): any => {
  const where: any = {};

  // Single ID takes precedence
  if (variables.id) {
    where.id = { _eq: variables.id };
    return where;
  }

  // Soft delete (default: exclude deleted) - now part of AUDIT_FIELDS
  if (!options.includeDeleted) {
    where.isDeleted = { _eq: false };
  }

  // Structure filtering
  if (options.useCurrentStructure) {
    const structureId = variables.structureId || getCurrentActiveStructureId();
    if (structureId) {
      where.structureId = { _eq: structureId };
    }
  }

  // Record state filtering
  if (options.recordState) {
    where.recordState = { _eq: options.recordState };
  }

  // Custom where conditions
  if (variables.where) {
    Object.assign(where, variables.where);
  }

  return where;
};

/**
 * Build search where condition for text fields
 */
export const buildSearchWhere = (searchTerm: string, searchFields: string[]): any => {
  if (!searchTerm?.trim()) return {};

  const pattern = { _ilike: `%${searchTerm.trim()}%` };
  const orConditions = searchFields.map(field => ({ [field]: pattern }));

  return { _or: orConditions };
};

/**
 * Build active date filtering (for activeFrom/activeTo)
 */
export const buildActiveDateWhere = (date: Date = new Date()): any => {
  const isoDate = date.toISOString();
  
  return {
    _and: [
      {
        _or: [
          { activeFrom: { _eq: null } },
          { activeFrom: { _lte: isoDate } }
        ]
      },
      {
        _or: [
          { activeTo: { _eq: null } },
          { activeTo: { _gte: isoDate } }
        ]
      }
    ]
  };
};

// ==========================================
// COMMON PRESETS
// ==========================================

export const QUERY_PRESETS = {
  // Standard business entity
  STANDARD: {
    includeDeleted: false,
    useCurrentStructure: true,
    recordState: 'active'
  },
  
  // Active records only
  ACTIVE_ONLY: {
    includeDeleted: false,
    useCurrentStructure: true,
    activeOnly: true
  },
  
  // Include everything (for historical data)
  ALL_RECORDS: {
    includeDeleted: true,
    useCurrentStructure: false
  },
  
  // Master data (no structure dependency)
  MASTER_DATA: {
    includeDeleted: false,
    useCurrentStructure: false
  }
};

// ==========================================
// QUERY BUILDING HELPERS
// ==========================================

/**
 * Build complete query variables with defaults
 */
export const buildQueryVariables = (
  variables: BaseQueryVariables = {},
  options: QueryOptions = {}
) => {
  const where = buildWhere(variables, options);
  
  // Add search if provided
  if (variables.search) {
    // This should be customized per entity
    console.warn('Search functionality needs entity-specific field configuration');
  }

  return {
    offset: variables.offset || 0,
    limit: Math.min(variables.limit || 50, 1000),
    orderBy: variables.orderBy || [],
    where
  };
};


