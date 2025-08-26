/**
 * GraphQL query helpers (generic, entity-agnostic)
 */

// (Removed legacy basic where/query presets/builders - keep helpers minimal)


export interface SortInput {
  field: string;
  direction: 'ASC' | 'DESC';
}

// ==========================================
// CORE BUILDERS (DOT-PATH)
// ==========================================

/** Build a nested GraphQL object path from a dot path, with a leaf assignment */
const buildNestedPath = (dotPath: string, leaf: string): string => {
  const segments = dotPath.split('.').filter(Boolean);
  if (segments.length === 0) return leaf;
  return segments
    .reverse()
    .reduce((acc, seg) => `{ ${seg}: ${acc} }`, leaf);
};


/**
 * Unified descriptor for search, sort and filter
 * - Use searchPaths/type for free-text search
 * - Use sortPath for orderBy building
 * - Use path/kind/build for filter WHERE building
 * Optional enable flags allow opting out per capability without separate types
 */
export interface Descriptor {
  // Common
  key: string;

  // Sorting
  sortPath?: string;
  enableSort?: boolean;

  // Search
  searchPaths?: string[];
  enableSearch?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean';

  // Filters
  path?: string;
  kind?: FilterKind;
  build?: (value: any) => string[] | string;
  enableFilter?: boolean;

  // Options (for building filter groups / distinct lists)
  optionSelectPaths?: string[];
  optionSearchPaths?: string[];
  optionDistinctOn?: string[];
}

/** Build orderBy clause from UI inputs and descriptors (no schema mapping required) */
export const buildOrderBy = (
  orderBy: SortInput[] = [],
  descriptors: Descriptor[] = []
): string => {
  if (!orderBy.length) return '';
  const index: Record<string, Descriptor> = Object.fromEntries(
    descriptors.map(d => [d.key, d])
  );
  const parts = orderBy.map(o => {
    const d = index[o.field];
    const path = d?.sortPath || (d?.searchPaths && d.searchPaths[0]) || o.field;
    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) return '';
    if (segments.length === 1) {
      return `{ ${segments[0]}: ${o.direction} }`;
    }
    const leaf = `${segments.pop()!}: ${o.direction}`;
    return buildNestedPath(segments.join('.'), `{ ${leaf} }`);
  });
  return `orderBy: [${parts.join(', ')}]`;
};

/** Build _or search conditions from descriptors */
export const buildSearch = (
  search: string,
  descriptors: Descriptor[] = []
): string => {
  const term = search?.trim();
  if (!term) return '';
  const escape = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const like = `%${escape(term)}%`;
  const conds: string[] = [];
  for (const d of descriptors) {
    const paths = d.searchPaths || [];
    if (d.enableSearch === false) continue;
    for (const path of paths) {
      let leaf = `{ _ilike: "${like}" }`;
      if (d.type === 'number') {
        const num = Number(term);
        if (!Number.isNaN(num) && Number.isFinite(num)) {
          leaf = `{ _eq: ${num} }`;
        } else {
          continue; // skip invalid numeric input for number fields
        }
      } else if (d.type === 'boolean') {
        const t = term.toLowerCase();
        const bool = t === 'true' || t === '1' || t === 'yes' ? true : t === 'false' || t === '0' || t === 'no' ? false : null;
        if (bool === null) {
          continue; // skip invalid boolean input
        }
        leaf = `{ _eq: ${bool ? 'true' : 'false'} }`;
      } else if (d.type === 'date') {
        // Accept YYYY, YYYY-MM, YYYY-MM-DD, or parseable date; build a day/month/year range
        const ymd = term.match(/^\d{4}-\d{2}-\d{2}$/);
        const ym = term.match(/^\d{4}-\d{2}$/);
        const y = term.match(/^\d{4}$/);
        let start: Date | null = null;
        let end: Date | null = null;
        if (ymd) {
          const [Y, M, D] = term.split('-').map(n => parseInt(n, 10));
          start = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
          end = new Date(Date.UTC(Y, M - 1, D, 23, 59, 59, 999));
        } else if (ym) {
          const [Y, M] = term.split('-').map(n => parseInt(n, 10));
          start = new Date(Date.UTC(Y, M - 1, 1, 0, 0, 0, 0));
          end = new Date(Date.UTC(Y, M, 0, 23, 59, 59, 999));
        } else if (y) {
          const Y = parseInt(term, 10);
          start = new Date(Date.UTC(Y, 0, 1, 0, 0, 0, 0));
          end = new Date(Date.UTC(Y, 11, 31, 23, 59, 59, 999));
        } else {
          const dParsed = new Date(term);
          if (!Number.isNaN(dParsed.getTime())) {
            start = new Date(Date.UTC(
              dParsed.getUTCFullYear(), dParsed.getUTCMonth(), dParsed.getUTCDate(), 0, 0, 0, 0
            ));
            end = new Date(Date.UTC(
              dParsed.getUTCFullYear(), dParsed.getUTCMonth(), dParsed.getUTCDate(), 23, 59, 59, 999
            ));
          }
        }
        if (!start || !end) {
          continue; // skip invalid date-like input for date fields
        }
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        leaf = `{ _gte: "${startIso}", _lte: "${endIso}" }`;
      }
      conds.push(buildNestedPath(path, leaf));
    }
  }
  return conds.length ? `_or: [${conds.join(', ')}]` : '';
};

export const buildFilter = (
  variables: Record<string, any>,
  descriptors: Descriptor[] = []
): string => {
  const andConds: string[] = [];
  for (const d of descriptors) {
    const value = variables[d.key as keyof typeof variables];
    if (value === undefined || value === null) continue;
    if (d.enableFilter === false) continue;
    if (d.kind === 'custom' && d.build) {
      const built = d.build(value);
      if (Array.isArray(built)) andConds.push(...built);
      else if (built) andConds.push(built);
      continue;
    }
    if (!d.path) continue;
    switch (d.kind) {
      case 'inIds': {
        const arr: string[] = Array.isArray(value) ? value : [];
        if (!arr.length) break;
        const list = arr.map(v => `"${v}"`).join(', ');
        andConds.push(buildNestedPath(d.path, `{ _in: [${list}] }`));
        break;
      }
      case 'inStrings': {
        const arr: string[] = Array.isArray(value) ? value : [];
        if (!arr.length) break;
        const list = arr.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        andConds.push(buildNestedPath(d.path, `{ _in: [${list}] }`));
        break;
      }
      case 'eqBool': {
        andConds.push(buildNestedPath(d.path, `{ _eq: ${value === true ? 'true' : 'false'} }`));
        break;
      }
      case 'dateFrom': {
        andConds.push(buildNestedPath(d.path, `{ _gte: "${value}" }`));
        break;
      }
      case 'dateTo': {
        andConds.push(buildNestedPath(d.path, `{ _lte: "${value}" }`));
        break;
      }
    }
  }
  return andConds.length ? `_and: [${andConds.join(', ')}]` : '';
};

// ==========================================
// GENERIC GRAPHQL DISTINCT LIST QUERY BUILDERS
// ==========================================

/** Build nested selection string from dot paths */
export const selectionFromPaths = (paths: string[]): string => {
  const tree: any = {};
  for (const p of paths) {
    const segs = p.split('.').filter(Boolean);
    let node = tree;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (i === segs.length - 1) {
        node[s] = true;
      } else {
        node[s] = node[s] || {};
        node = node[s];
      }
    }
  }
  const render = (n: any): string => {
    return Object.entries(n)
      .map(([k, v]) => (v === true ? k : `${k} { ${render(v)} }`))
      .join(' ');
  };
  return render(tree);
};

export const searchOrFromPaths = (search: string, paths: string[] = []): string => {
  const term = search?.trim();
  if (!term) return '';
  const like = `%${term}%`;
  const conds = paths.map(p => buildNestedPath(p, `{ _ilike: "${like}" }`));
  return conds.length ? `_or: [${conds.join(', ')}]` : '';
};

export const buildFilterGroups = (args: {
  entityName: string;
  descriptors: Descriptor[];
  searchByKey?: Record<string, string>;
  limit?: number;
}): Record<string, string> => {
  const { entityName, descriptors, searchByKey = {}, limit = 100 } = args;
  const result: Record<string, string> = {};
  for (const d of descriptors) {
    if (!d.optionSelectPaths || !d.optionSelectPaths.length) continue;
    const selectPaths = d.optionSelectPaths;
    const searchPaths = d.optionSearchPaths || d.searchPaths || [];
    const distinctOn = d.optionDistinctOn || [];
    const search = searchByKey[d.key] || '';
    const selection = selectionFromPaths(selectPaths);
    const searchOr = searchOrFromPaths(search, searchPaths);
    const whereParts = ['isDeleted: { _eq: false }'];
    if (searchOr) whereParts.push(searchOr);
    const where = `where: { ${whereParts.join(', ')} }`;
    const distinct = distinctOn.length ? `distinctOn: [${distinctOn.join(', ')}]` : '';
    result[d.key] = `
      query GetDistinct${entityName}List_${d.key} {
        ${entityName}(
          ${where}
          ${distinct}
          limit: ${limit}
        ) {
          ${selection}
        }
      }
    `;
  }
  return result;
};

// ==========================================
// GENERIC FILTER BUILDERS (AND)
// ==========================================

export type FilterKind = 'inIds' | 'inStrings' | 'eqBool' | 'dateFrom' | 'dateTo' | 'custom';


// (Intentionally no entity-specific descriptors below this point)




