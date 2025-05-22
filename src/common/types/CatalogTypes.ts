import { JSONValue } from "./i18nTypes";

type TranslationValues = {
  localeCode?: string;
  value?: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  objectValue?: JSONValue;
};

export type CatalogEntry = {
  id: string;
  code: string;
  alternativeCode?: string;
  localeCode?: string;
  value: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  type: string;
  objectValue?: JSONValue;
  parentEntryId?: string;
  translations?: CatalogEntry[] | TranslationValues[];
  children?: CatalogEntry[];
  needTranslationIcon?: boolean;
};

export type GetCatalogEntriesParams = {
  catalogIdentifier: string;
  version: string;
};

export type GetCatalogsParams = {
  returnTotalRecords?: boolean,
  localeCode?: string,
  limit?: number;
  offset?: number;
};

export interface GetCatalogEntriesResponse {
  data: CatalogEntry[];
  paging: {
    limit: number;
    offset: number;
    totalRecords: number;
    returnTotalRecords: boolean;
  };
}

export interface Catalog {
  id: string;
  identifier: string;
  name: string;
  version: string;
  children?: Catalog[];
  parentId?: string;
  validFrom?: string;
  validTo?: string;
}

export interface GetCatalogsResponse {
  data: Catalog[];
  paging: {
    limit: number;
    offset: number;
    totalRecords: number;
    returnTotalRecords: boolean;
  };
}
