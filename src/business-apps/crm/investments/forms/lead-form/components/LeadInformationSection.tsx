import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import SearchableSelect from "./SearchableSelect";

const prefixDataTestId = "LeadForm";

const LeadInformationSection: React.FC = () => {
  // ✅ REMOVED: State variables no longer needed with SearchableSelect
  // const [isStatusOpen, setIsStatusOpen] = useState(false);
  // const [isSourceOpen, setIsSourceOpen] = useState(false);
  // const [isRatingOpen, setIsRatingOpen] = useState(false);

  const {
    formValues,
    setFormValues,

    // Lead Sources
    leadSources,
    leadSourcesLoading,
    leadSourcesHasMore,
    leadSourcesNeedsMoreData,
    leadSourcesTotalFetched,
    searchLeadSources,
    loadMoreLeadSources,

    // Lead Statuses
    leadStatuses,
    leadStatusesLoading,
    leadStatusesHasMore,
    leadStatusesNeedsMoreData,
    leadStatusesTotalFetched,
    searchLeadStatuses,
    loadMoreLeadStatuses,

    // Lead Ratings
    leadRatings,
    leadRatingsLoading,
    leadRatingsHasMore,
    leadRatingsNeedsMoreData,
    leadRatingsTotalFetched,
    searchLeadRatings,
    loadMoreLeadRatings,
  } = useLeadFormContext();

  // Debug logging to understand why Investment Group works but lead fields don't
  console.log("🔍 LeadInformationSection Debug:", {
    leadStatusValue: formValues.leadStatus,
    leadStatusValueType: typeof formValues.leadStatus,
    leadStatusValueTruthy: !!formValues.leadStatus,
    leadSourceValue: formValues.leadSource,
    leadSourceValueType: typeof formValues.leadSource,
    ratingValue: formValues.rating,
    ratingValueType: typeof formValues.rating,
    leadStatusesCount: leadStatuses?.length || 0,
    leadSourcesCount: leadSources?.length || 0,
    leadRatingsCount: leadRatings?.length || 0,
    leadStatusesFirst: leadStatuses?.[0] || null,
    leadSourcesFirst: leadSources?.[0] || null,
    leadRatingsFirst: leadRatings?.[0] || null,
    // Check if values match any options
    statusMatch: leadStatuses?.find(
      (opt) =>
        opt.value === formValues.leadStatus || opt.id === formValues.leadStatus
    ),
    sourceMatch: leadSources?.find(
      (opt) =>
        opt.value === formValues.leadSource || opt.id === formValues.leadSource
    ),
    ratingMatch: leadRatings?.find(
      (opt) => opt.value === formValues.rating || opt.id === formValues.rating
    ),
  });

  // Note: Removed accounts hook since we're using simple input instead of dropdown

  // Simple effect to load more lead sources when needed
  useEffect(() => {
    if (leadSourcesNeedsMoreData && !leadSourcesLoading && leadSourcesHasMore) {
      loadMoreLeadSources();
    }
  }, [
    leadSourcesNeedsMoreData,
    leadSourcesLoading,
    leadSourcesHasMore,
    leadSourcesTotalFetched,
    loadMoreLeadSources,
  ]);

  // Simple effect to load more lead statuses when needed
  useEffect(() => {
    if (
      leadStatusesNeedsMoreData &&
      !leadStatusesLoading &&
      leadStatusesHasMore
    ) {
      loadMoreLeadStatuses();
    }
  }, [
    leadStatusesNeedsMoreData,
    leadStatusesLoading,
    leadStatusesHasMore,
    leadStatusesTotalFetched,
    loadMoreLeadStatuses,
  ]);

  // Simple effect to load more lead ratings when needed
  useEffect(() => {
    if (leadRatingsNeedsMoreData && !leadRatingsLoading && leadRatingsHasMore) {
      loadMoreLeadRatings();
    }
  }, [
    leadRatingsNeedsMoreData,
    leadRatingsLoading,
    leadRatingsHasMore,
    leadRatingsTotalFetched,
    loadMoreLeadRatings,
  ]);

  // ✅ REMOVED: Open state management no longer needed with SearchableSelect
  // SearchableSelect handles showing more items automatically

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: "0",
        borderWidth: "0",
        borderStyle: "none",
        borderColor: "transparent",
        boxShadow: "none",
        padding: "0",
        background: "transparent",
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: "0",
          borderWidth: "0",
          borderStyle: "none",
          borderColor: "transparent",
          padding: "0",
        }}
      >
        {/* First Name and Last Name - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              First Name <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="firstName"
              value={
                typeof formValues.firstName === "string"
                  ? formValues.firstName
                  : ""
              }
              onChange={(e) => setFormValues({ firstName: e.target.value })}
              placeholder="Please Enter..."
              required
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "FirstNameInput")}
            />
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Last Name <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="lastName"
              value={
                typeof formValues.lastName === "string"
                  ? formValues.lastName
                  : ""
              }
              onChange={(e) => setFormValues({ lastName: e.target.value })}
              placeholder="Please Enter..."
              required
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "LastNameInput")}
            />
          </div>
        </div>

        {/* Company Name Input Field */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            Company Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="company"
            value={
              typeof formValues.company === "string"
                ? formValues.company
                : String(formValues.company || "")
            }
            onChange={(e) => setFormValues({ company: e.target.value })}
            placeholder="Please Enter..."
            required
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, "CompanyInput")}
          />
        </div>

        {/* Status and Source - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          {/* Status dropdown - ✅ FIXED: Using SearchableSelect like Investment Group */}
          <SearchableSelect
            label="Status"
            name="leadStatus"
            value={formValues.leadStatus}
            placeholder={
              formValues.leadStatus && formValues.leadStatus.trim()
                ? "Search and select status..."
                : "Please Select..."
            }
            options={leadStatuses}
            loading={leadStatusesLoading}
            hasMore={leadStatusesHasMore}
            onSearch={searchLeadStatuses}
            onLoadMore={loadMoreLeadStatuses}
            onChange={(value) => setFormValues({ leadStatus: value })}
            error={null}
            data-testid={formatDataTestId(prefixDataTestId, "LeadStatusSelect")}
            className="gba:w-full"
          />

          {/* Source dropdown - ✅ FIXED: Using SearchableSelect like Investment Group */}
          <SearchableSelect
            label="Source"
            name="leadSource"
            value={formValues.leadSource}
            placeholder={
              formValues.leadSource && formValues.leadSource.trim()
                ? "Search and select source..."
                : "Please Select..."
            }
            options={leadSources}
            loading={leadSourcesLoading}
            hasMore={leadSourcesHasMore}
            onSearch={searchLeadSources}
            onLoadMore={loadMoreLeadSources}
            onChange={(value) => setFormValues({ leadSource: value })}
            error={null}
            data-testid={formatDataTestId(prefixDataTestId, "LeadSourceSelect")}
            className="gba:w-full"
          />

          {/* Lead Source Type - ✅ ADDED: Additional lead source type field */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Source Type
            </Label>
            <Select
              value={
                typeof formValues.leadSourceType === "string"
                  ? formValues.leadSourceType
                  : ""
              }
              onValueChange={(value) =>
                setFormValues({ leadSourceType: value || "" })
              }
              data-testid={formatDataTestId(
                prefixDataTestId,
                "LeadSourceTypeSelect"
              )}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select Source Type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNKNOWN_LEAD_SOURCE_TYPE">
                  Unknown Lead Source Type
                </SelectItem>
                <SelectItem value="INDIVIDUAL_LEAD_SOURCE">
                  Individual Lead Source
                </SelectItem>
                <SelectItem value="COMPANY_LEAD_SOURCE">
                  Company Lead Source
                </SelectItem>
                <SelectItem value="INDIVIDUAL_COMPANY_LEAD_SOURCE">
                  Individual Company Lead Source
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rating - ✅ FIXED: Using SearchableSelect like Investment Group */}
        <SearchableSelect
          label="Rating"
          name="rating"
          value={formValues.rating}
          placeholder={
            formValues.rating && formValues.rating.trim()
              ? "Search and select rating..."
              : "Please Select..."
          }
          options={leadRatings}
          loading={leadRatingsLoading}
          hasMore={leadRatingsHasMore}
          onSearch={searchLeadRatings}
          onLoadMore={loadMoreLeadRatings}
          onChange={(value) => setFormValues({ rating: value })}
          error={null}
          data-testid={formatDataTestId(prefixDataTestId, "RatingSelect")}
          className="gba:w-full"
        />
      </CardContent>
    </Card>
  );
};

export default LeadInformationSection;
