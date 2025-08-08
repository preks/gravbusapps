import React, { useState, useEffect, useRef } from "react";
import { useContactFormContext } from "../context/ContactFormContext";
import {
  Input,
  Label,
  Card,
  CardContent,
  Button,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

const prefixDataTestId = "ContactForm";

const AccountInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded to show account search

  const {
    formValues,
    setFormValues,
    error,
    accountSuggestions,
    searchAccounts,
    loadMoreAccounts,
    accountsHasMore,
    accountsLoading,
  } = useContactFormContext();

  // State for account searchable input (same as opportunity form)
  const [accountInputValue, setAccountInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibleAccountsCount, setVisibleAccountsCount] = useState(5);

  const accountContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountContainerRef.current &&
        !accountContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle account input change
  const handleAccountInputChange = async (value: string) => {
    setAccountInputValue(value);
    // Clear accountId when typing manually (not selecting from dropdown)
    setFormValues({ accountId: undefined });

    if (value.trim().length > 2) {
      searchAccounts(value);
      setIsDropdownOpen(true);
      setVisibleAccountsCount(5); // Reset to showing first 5
    } else if (value.trim().length === 0) {
      setIsDropdownOpen(false);
    }
  };

  // Handle arrow button click
  const handleArrowClick = async () => {
    if (!isDropdownOpen) {
      // Open dropdown and load initial data if no search term
      if (!accountInputValue.trim()) {
        searchAccounts(""); // Load all accounts initially
      }
      setIsDropdownOpen(true);
      setVisibleAccountsCount(5);
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    setAccountInputValue(suggestion.name);
    setFormValues({
      accountId: String(suggestion.id),
    });
    setIsDropdownOpen(false);
    setVisibleAccountsCount(5);
  };

  // Handle scroll to load more
  const handleSuggestionsScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to 80% of the list
    if (
      scrollPercentage > 0.8 &&
      accountsHasMore &&
      !accountsLoading &&
      accountSuggestions.length > 0
    ) {
      try {
        await loadMoreAccounts();
        // Show more items after loading
        setVisibleAccountsCount((prev) =>
          Math.min(prev + 10, accountSuggestions.length)
        );
      } catch (error) {
        console.error("Error loading more accounts:", error);
      }
    }
  };

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
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
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: "linear-gradient(to right, #ddd6fe, #c4b5fd)",
          transition: "all 0.3s ease",
          border: "0",
          borderWidth: "0",
          borderStyle: "none",
          borderColor: "transparent",
          outline: "none",
          outlineWidth: "0",
          outlineStyle: "none",
          boxShadow: "none",
          borderRadius: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #c4b5fd, #a78bfa)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #ddd6fe, #c4b5fd)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "AccountInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Account Information
          </span>
        </div>
        <div className="gba:flex gba:items-center">
          {isExpanded ? (
            <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
          ) : (
            <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <CardContent
          className="gba:space-y-6 gba:bg-white gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: "0",
            borderWidth: "0",
            borderStyle: "none",
            borderColor: "transparent",
            padding: "16px",
            marginTop: "0",
          }}
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Company Name (Account) - Same as Opportunity Modal */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Company Name <span className="gba:text-red-500">*</span>
            </Label>
            <div ref={accountContainerRef} className="gba:relative gba:w-full">
              <Input
                name="companyName"
                value={accountInputValue}
                onChange={(e) => handleAccountInputChange(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Please Enter or Select..."
                required
                className="gba:border-gray-300 gba:bg-white gba:pr-14"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CompanyNameInput"
                )}
              />
              <div className="gba:absolute gba:inset-y-0 gba:right-0 gba:flex gba:items-center gba:pr-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gba:h-auto gba:w-auto gba:p-0 gba:bg-transparent gba:border-0 gba:shadow-none hover:gba:bg-transparent focus:gba:bg-transparent gba:cursor-pointer"
                  onClick={handleArrowClick}
                  data-testid={formatDataTestId(
                    prefixDataTestId,
                    "CompanyNameArrowButton"
                  )}
                >
                  {isDropdownOpen ? (
                    <UpOutlined className="gba:text-xs gba:text-gray-600" />
                  ) : (
                    <DownOutlined className="gba:text-xs gba:text-gray-600" />
                  )}
                </Button>
              </div>

              {isDropdownOpen && (
                <div
                  ref={suggestionsScrollRef}
                  className="gba:absolute gba:z-10 gba:w-full gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:max-h-60 gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                  onScroll={handleSuggestionsScroll}
                >
                  {accountSuggestions
                    .slice(0, visibleAccountsCount)
                    .map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="gba:px-3 gba:py-2 gba:cursor-pointer gba:hover:bg-gray-100"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.name}
                      </div>
                    ))}
                  {accountsLoading && accountSuggestions.length === 0 && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                      Loading...
                    </div>
                  )}
                  {accountSuggestions.length === 0 && !accountsLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                      No companies found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Owner Organization ID */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Owner Organization ID
            </Label>
            <Input
              name="ownerOrganizationId"
              value={formValues.ownerOrganizationId}
              onChange={(e) =>
                setFormValues({ ownerOrganizationId: e.target.value })
              }
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "OwnerOrganizationIdInput"
              )}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AccountInformationSection;
