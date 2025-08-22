/**
 * Common GraphQL fragments for reuse across entities
 * Simple fragments for common patterns
 */

// ==========================================
// BASIC FRAGMENTS
// ==========================================

/**
 * Complete audit fields including lifecycle tracking
 */
export const AUDIT_FIELDS = `
  createdAt
  createdBy
  updatedAt
  updatedBy
  isDeleted
  recordState
  activeFrom
  activeTo
  version
`;

/**
 * Structure/tenant field
 */
export const STRUCTURE_FIELD = `
  structureId
`;

/**
 * Catalog entry with translations
 */
export const CATALOG_ENTRY = `
  id
  code
  alternativeCode
  value
  additionalValue1
  additionalValue2
  additionalValue3
  type
  objectValue
  catalogId
  parentEntryId
  displayOrder
  isDeleted
  createdAt
  createdBy
  recordState
  activeFrom
  activeTo
  translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }
`;

// ==========================================
// RECURRING FRAGMENTS
// ==========================================

/**
 * Basic employee fragment
 */

export const EMPLOYEE = `
    id
    code
    firstName
    lastName
    displayName
    fullName
    picture
    pictureThumbnail
`;

// ==========================================
// STANDARD QUERY PATTERNS
// ==========================================

/**
 * Build standard query pattern for any entity
 * Returns both parameter declaration and usage
 */
export const buildQueryPattern = (entityName: string) => ({
  params: `$offset: Int, $limit: Int, $orderBy: [${entityName}OrderBy!], $where: ${entityName}BoolExp`,
  args: `offset: $offset, limit: $limit, orderBy: $orderBy, where: $where`
});

// ==========================================
// AGGREGATION HELPERS
// ==========================================

/**
 * Build aggregate query for entity counts
 */
export const buildAggregateQuery = (entityName: string) => `
  ${entityName}Aggregate(where: $where) {
    aggregate {
      count
    }
  }
`;

/**
 * Build financial aggregate query (with sums)
 */
export const buildFinancialAggregateQuery = (entityName: string, sumFields: string[] = []) => {
  const sumSelections = sumFields.map(field => `sum { ${field} }`).join('\n      ');
  
  return `
    ${entityName}Aggregate(where: $where) {
      aggregate {
        count
        ${sumSelections}
      }
    }
  `;
};

// ==========================================
// QUERY BUILDING UTILITIES
// ==========================================

// Removed: buildQueryParams - now using buildQueryPattern instead

/**
 * Build complete query with standard pagination and aggregation
 */
export const buildStandardQuery = (
  entityName: string,
  fields: string,
  includeAggregate: boolean = true
): string => {
  const { params, args } = buildQueryPattern(entityName);
  const aggregateQuery = includeAggregate ? buildAggregateQuery(entityName) : '';
  
  return `
    query Get${entityName}s(${params}) {
      ${entityName}(${args}) {
        ${fields}
      }
      
      ${aggregateQuery}
    }
  `;
};


