import React from "react";

export interface CatalogIdentifier {
  identifier: string;
  version: string;
}

export interface OptionItem {
  value: string;
  label: string;
  id?: string | number;
}

export interface EntityOption {
  id: string;
  name: string;
  type: "account" | "contact" | "opportunity" | "lead" | "investment";
  subtitle?: string;
  pictureThumbnail?: string;
}

export interface EmployeeOption {
  id: string;
  displayName: string;
  userId?: string;
  pictureThumbnail?: string;
  organizationalUnitName?: string;
  jobPositionName?: string;
}

export interface ContactSegmentProps {
  // Labels
  ownerLabel: React.ReactNode;
  typeLabel?: React.ReactNode;
  firstNameLabel: React.ReactNode;
  lastNameLabel: React.ReactNode;
  emailLabel: React.ReactNode;
  phoneLabel?: React.ReactNode;
  salutationLabel?: React.ReactNode;
  academicTitleLabel?: React.ReactNode;
  languageLabel?: React.ReactNode;
  birthDateLabel?: React.ReactNode;
  descriptionLabel?: React.ReactNode;
  jobPositionLabel?: React.ReactNode;
  departmentLabel?: React.ReactNode;
  codeLabel?: React.ReactNode;
  notesSummaryLabel?: React.ReactNode;
  communicationChannelsLabel?: React.ReactNode;
  addressesLabel?: React.ReactNode;
  pictureUploadLabel?: React.ReactNode;
  entityLabel?: React.ReactNode;

  // Catalog/Options
  accessToken?: string;
  salutationCatalog?: CatalogIdentifier;
  academicTitleOptions?: OptionItem[];
  academicTitleCatalog?: CatalogIdentifier;
  fetchAcademicTitleOptions?: (q?: string) => Promise<OptionItem[]>;
  languageOptions?: OptionItem[];
  languageCatalog?: CatalogIdentifier;
  fetchLanguageOptions?: (q?: string) => Promise<OptionItem[]>;
  communicationChannelCatalog?: CatalogIdentifier;
  countryCatalog?: CatalogIdentifier;
  addressTypeCatalog?: CatalogIdentifier;
  contactTypeCatalog?: CatalogIdentifier;

  // Owner selection
  assignees?: EmployeeOption[];
  assigneesLoading?: boolean;
  onAssigneeSearch?: (q: string) => void;
  assigneesHasMore?: boolean;
  onAssigneeLoadMore?: () => void;

  // Entity selection
  showEntitySelection?: boolean;
  entities?: EntityOption[];
  entitiesLoading?: boolean;
  onEntitySearch?: (q: string) => void;
  entitiesHasMore?: boolean;
  onEntityLoadMore?: () => void;
  initialEntityFromContext?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string };

  ["data-testid"]?: string;
}


