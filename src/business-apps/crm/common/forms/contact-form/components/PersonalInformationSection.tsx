import React, { useState, useEffect } from "react";
import { useContactFormContext } from "../context/ContactFormContext";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Card,
  CardContent,
  Button,
  Label,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

const prefixDataTestId = "ContactForm";

const PersonalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const [isAcademicTitleOpen, setIsAcademicTitleOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const {
    formValues,
    setFormValues,
    error,

    // Academic Titles
    academicTitles,
    academicTitlesLoading,
    academicTitlesError,
    academicTitlesHasMore,
    academicTitlesNeedsMoreData,
    academicTitlesDisplayCount,
    academicTitlesTotalFetched,
    loadMoreAcademicTitles,
    showMoreAcademicTitles,

    // Languages
    languages,
    languagesLoading,
    languagesError,
    languagesHasMore,
    languagesNeedsMoreData,
    languagesDisplayCount,
    languagesTotalFetched,
    loadMoreLanguages,
    showMoreLanguages,
  } = useContactFormContext();

  // Simple effect to load more academic titles when needed
  useEffect(() => {
    if (
      academicTitlesNeedsMoreData &&
      !academicTitlesLoading &&
      academicTitlesHasMore
    ) {
      console.log(
        `🚀 Auto-loading more academic titles from API (${academicTitlesTotalFetched} fetched so far, loading 100 more)`
      );
      loadMoreAcademicTitles();
    }
  }, [
    academicTitlesNeedsMoreData,
    academicTitlesLoading,
    academicTitlesHasMore,
    academicTitlesTotalFetched,
    loadMoreAcademicTitles,
  ]);

  // Simple effect to load more languages when needed
  useEffect(() => {
    if (languagesNeedsMoreData && !languagesLoading && languagesHasMore) {
      console.log(
        `🚀 Auto-loading more languages from API (${languagesTotalFetched} fetched so far, loading 100 more)`
      );
      loadMoreLanguages();
    }
  }, [
    languagesNeedsMoreData,
    languagesLoading,
    languagesHasMore,
    languagesTotalFetched,
    loadMoreLanguages,
  ]);

  // When dropdowns open, show more if we have them cached
  useEffect(() => {
    if (
      isAcademicTitleOpen &&
      academicTitlesDisplayCount < academicTitlesTotalFetched &&
      academicTitlesTotalFetched > 5
    ) {
      console.log(
        `🚀 Academic Title dropdown opened - showing more from cache (${academicTitlesDisplayCount}/${academicTitlesTotalFetched})`
      );
      showMoreAcademicTitles();
    }
  }, [
    isAcademicTitleOpen,
    academicTitlesDisplayCount,
    academicTitlesTotalFetched,
    showMoreAcademicTitles,
  ]);

  useEffect(() => {
    if (
      isLanguageOpen &&
      languagesDisplayCount < languagesTotalFetched &&
      languagesTotalFetched > 5
    ) {
      console.log(
        `🚀 Language dropdown opened - showing more from cache (${languagesDisplayCount}/${languagesTotalFetched})`
      );
      showMoreLanguages();
    }
  }, [
    isLanguageOpen,
    languagesDisplayCount,
    languagesTotalFetched,
    showMoreLanguages,
  ]);

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
          background: "linear-gradient(to right, #bbf7d0, #6ee7b7)",
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
            "linear-gradient(to right, #86efac, #34d399)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #bbf7d0, #6ee7b7)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "PersonalInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Personal Information
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

          {/* Academic Title and Language - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Academic Title dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Academic Title
              </Label>
              <Select
                value={formValues.academicTitleRef}
                onValueChange={(value) =>
                  setFormValues({ academicTitleRef: value })
                } // Store ID
                onOpenChange={setIsAcademicTitleOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "AcademicTitleSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {academicTitles.map((title, index) => (
                    <SelectItem
                      key={`${title.id}-${index}`}
                      value={String(title.id)}
                    >
                      {" "}
                      {/* Use ID as string value */}
                      {title.label}
                    </SelectItem>
                  ))}
                  {academicTitlesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more academic titles...
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Language dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Language
              </Label>
              <Select
                value={formValues.languageRef}
                onValueChange={(value) => setFormValues({ languageRef: value })} // Store ID
                onOpenChange={setIsLanguageOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LanguageSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {languages.map((language, index) => (
                    <SelectItem
                      key={`${language.id}-${index}`}
                      value={String(language.id)}
                    >
                      {" "}
                      {/* Use ID as string value */}
                      {language.label}
                    </SelectItem>
                  ))}
                  {languagesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more languages...
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Birth Date */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Birth Date
            </Label>
            <Input
              name="birthDate"
              type="date"
              value={formValues.birthDate}
              onChange={(e) => setFormValues({ birthDate: e.target.value })}
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "BirthDateInput")}
            />
          </div>

          {/* Picture URL */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Picture URL
            </Label>
            <Input
              name="pictureUrl"
              type="url"
              value={formValues.pictureUrl}
              onChange={(e) => setFormValues({ pictureUrl: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "PictureUrlInput"
              )}
            />
          </div>

          {/* LinkedIn and XING URLs - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                LinkedIn Profile
              </Label>
              <Input
                name="linkedinUrl"
                type="url"
                value={formValues.linkedinUrl}
                onChange={(e) => setFormValues({ linkedinUrl: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LinkedinUrlInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                XING Profile
              </Label>
              <Input
                name="xingUrl"
                type="url"
                value={formValues.xingUrl}
                onChange={(e) => setFormValues({ xingUrl: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, "XingUrlInput")}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Bio
            </Label>
            <Textarea
              name="bio"
              value={formValues.bio}
              onChange={(e) => setFormValues({ bio: e.target.value })}
              placeholder="Please Enter..."
              rows={3}
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "BioTextarea")}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PersonalInformationSection;
