import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  Alert,
  AlertDescription,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import { toStringOrUndefined } from "../utils/validationUtils";
// Note: Removed SearchableSelect and useAccountsGraphQL imports since we're using simple input

const prefixDataTestId = "LeadForm";

const LeadInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const {
    formValues,
    setFormValues,
    isLoading,

    // Lead Sources
    leadSources,
    leadSourcesLoading,
    leadSourcesError,
    leadSourcesHasMore,
    leadSourcesNeedsMoreData,
    leadSourcesDisplayCount,
    leadSourcesTotalFetched,
    searchLeadSources,
    loadMoreLeadSources,
    showMoreLeadSources,

    // Lead Statuses
    leadStatuses,
    leadStatusesLoading,
    leadStatusesError,
    leadStatusesHasMore,
    leadStatusesNeedsMoreData,
    leadStatusesDisplayCount,
    leadStatusesTotalFetched,
    searchLeadStatuses,
    loadMoreLeadStatuses,
    showMoreLeadStatuses,

    // Lead Ratings
    leadRatings,
    leadRatingsLoading,
    leadRatingsError,
    leadRatingsHasMore,
    leadRatingsNeedsMoreData,
    leadRatingsDisplayCount,
    leadRatingsTotalFetched,
    searchLeadRatings,
    loadMoreLeadRatings,
    showMoreLeadRatings,

    // Access token for API calls
    accessToken,
  } = useLeadFormContext();

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

  // When dropdowns open, show more if we have them cached
  useEffect(() => {
    if (
      isStatusOpen &&
      leadStatusesDisplayCount < leadStatusesTotalFetched &&
      leadStatusesTotalFetched > 5
    ) {
      showMoreLeadStatuses();
    }
  }, [
    isStatusOpen,
    leadStatusesDisplayCount,
    leadStatusesTotalFetched,
    showMoreLeadStatuses,
  ]);

  useEffect(() => {
    if (
      isSourceOpen &&
      leadSourcesDisplayCount < leadSourcesTotalFetched &&
      leadSourcesTotalFetched > 5
    ) {
      showMoreLeadSources();
    }
  }, [
    isSourceOpen,
    leadSourcesDisplayCount,
    leadSourcesTotalFetched,
    showMoreLeadSources,
  ]);

  useEffect(() => {
    if (
      isRatingOpen &&
      leadRatingsDisplayCount < leadRatingsTotalFetched &&
      leadRatingsTotalFetched > 5
    ) {
      showMoreLeadRatings();
    }
  }, [
    isRatingOpen,
    leadRatingsDisplayCount,
    leadRatingsTotalFetched,
    showMoreLeadRatings,
  ]);

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
          {/* Status dropdown like Country */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Status
            </Label>
            <Select
              value={formValues.leadStatus}
              onValueChange={(value) => setFormValues({ leadStatus: value })}
              onOpenChange={setIsStatusOpen}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "LeadStatusSelect"
              )}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: "200px", overflowY: "auto" }}
              >
                {leadStatuses.map((option, index) => (
                  <SelectItem
                    key={`${option.id}-${index}`}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
                {leadStatusesLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                    🔄 Loading more statuses...
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Source dropdown like Country */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Source
            </Label>
            <Select
              value={formValues.leadSource}
              onValueChange={(value) => setFormValues({ leadSource: value })}
              onOpenChange={setIsSourceOpen}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "LeadSourceSelect"
              )}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: "200px", overflowY: "auto" }}
              >
                {leadSources.map((option, index) => (
                  <SelectItem
                    key={`${option.id}-${index}`}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
                {leadSourcesLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                    🔄 Loading more sources...
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rating like Country */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            Rating
          </Label>
          <Select
            value={formValues.rating}
            onValueChange={(value) => setFormValues({ rating: value })}
            onOpenChange={setIsRatingOpen}
            data-testid={formatDataTestId(prefixDataTestId, "RatingSelect")}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {leadRatings.map((option, index) => (
                <SelectItem key={`${option.id}-${index}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {leadRatingsLoading && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                  🔄 Loading more ratings...
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadInformationSection;
