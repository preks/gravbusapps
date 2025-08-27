import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { OpportunityList } from "./opportunity-list";
import { OpportunityBoard } from "./opportunity-board";

export interface OpportunityViewProps extends BusinessAppContextProps {}

// Map URL subView values to internal tab values and vice versa
const mapUrlToTab = (subView: string | null): "list" | "board" => {
  if (subView === "pipeline") return "board";
  return "list";
};

const mapTabToUrl = (tab: "list" | "board"): "list" | "pipeline" => {
  return tab === "board" ? "pipeline" : "list";
};

export const OpportunityView: React.FC<OpportunityViewProps> = (context) => {
  const getInitialSubTab = useCallback((): "list" | "board" => {
    const urlParams = new URLSearchParams(window.location.search);
    return mapUrlToTab(urlParams.get("subView"));
  }, []);

  const [activeSubTab, setActiveSubTab] = useState<"list" | "board">(getInitialSubTab());

  const updateSubViewInUrl = useCallback((tab: "list" | "board") => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("subView", mapTabToUrl(tab));
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, []);

  useEffect(() => {
    // Ensure subView param is present on mount using current tab
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("subView")) {
      updateSubViewInUrl(getInitialSubTab());
    }
  }, [getInitialSubTab, updateSubViewInUrl]);

  // Listen for browser navigation to keep tab in sync
  useEffect(() => {
    const handlePopState = () => {
      setActiveSubTab(getInitialSubTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [getInitialSubTab]);

  const handleSubTabChange = (value: string) => {
    const tab = (value === "board" ? "board" : "list") as "list" | "board";
    setActiveSubTab(tab);
    updateSubViewInUrl(tab);
  };

  return (
    <div data-testid="customer-opportunities-view">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="gba:mb-4">
          <TabsTrigger value="list" data-testid="opportunities-list-tab">List View</TabsTrigger>
          <TabsTrigger value="board" data-testid="opportunities-board-tab">Board View</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <OpportunityList {...context} sourceApp="CRM" />
        </TabsContent>
        <TabsContent value="board">
          <OpportunityBoard {...context} sourceApp="CRM" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpportunityView;


