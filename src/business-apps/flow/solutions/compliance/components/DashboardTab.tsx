import React, { useState, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Card, Badge, Button } from "@newwork/nw-design-system";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { Shield, FileText, Clock, Users, ArrowRight, AlertTriangle, ArrowLeft } from "lucide-react";
import {
  ComplianceDataService,
  ComplianceFlow,
  StepSegment,
} from "../services/ComplianceDataService";
import { FlowDetailView } from "@/business-apps/flow/common/components/flow-detail";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface DashboardTabProps extends BusinessAppContextProps {}

export const DashboardTab: React.FC<DashboardTabProps> = (context) => {
  const [complianceFlows, setComplianceFlows] = useState<ComplianceFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepSegmentsByFlowId, setStepSegmentsByFlowId] = useState<Record<string, StepSegment[]>>(
    {},
  );
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  // Load compliance flows on mount and when notified of new flow
  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("compliance-flow-created", handler);
    return () => window.removeEventListener("compliance-flow-created", handler);
  }, [context.accessToken]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch compliance flows
      const flowsResponse = await ComplianceDataService.getComplianceFlows(context.accessToken);
      setComplianceFlows(flowsResponse.flows);

      // Fetch segmented step progress for each flow in parallel (best-effort)
      const segmentResults = await Promise.allSettled(
        flowsResponse.flows.slice(0, 9).map(async (flow) => {
          const segments = await ComplianceDataService.getFlowStepSegments(
            context.accessToken,
            flow.id,
          );
          return [flow.id, segments] as const;
        }),
      );

      const segmentMap: Record<string, StepSegment[]> = {};
      segmentResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const [flowId, segments] = result.value;
          segmentMap[flowId] = segments;
        }
      });
      setStepSegmentsByFlowId(segmentMap);
    } catch (err) {
      console.error("Error loading compliance data:", err);
      setError(err instanceof Error ? err.message : "Failed to load compliance data");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics from flows
  const totalFlows = complianceFlows.length;
  const activeFlows = complianceFlows.filter((f) => f.status === "RUNNING").length;
  const completedFlows = complianceFlows.filter((f) => f.status === "COMPLETED").length;
  const completionRate = totalFlows > 0 ? Math.round((completedFlows / totalFlows) * 100) : 0;
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const completedThisMonth = complianceFlows.filter(
    (f) => f.status === "COMPLETED" && f.endTime && new Date(f.endTime) >= thisMonth,
  ).length;

  // Widget configuration for statistics
  const widgets: WidgetItem[] = [
    {
      key: "total-compliance-flows",
      title: "Total Compliance Flows",
      value: totalFlows,
      prefix: <Shield className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: "#3b82f6",
      description: "All compliance processes",
    },
    {
      key: "active-flows",
      title: "Active Flows",
      value: activeFlows,
      prefix: <Clock className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: "#16a34a",
      description: "Currently in progress",
    },
    {
      key: "completion-rate",
      title: "Completion Rate",
      value: completionRate,
      suffix: "%",
      prefix: <FileText className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: "#16a34a",
      description: "Successfully completed",
    },
    {
      key: "completed-this-month",
      title: "Completed This Month",
      value: completedThisMonth,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: "#9333ea",
      description: "Finished this month",
    },
  ];

  // If a flow is selected, show the flow detail view
  if (selectedFlowId) {
    return (
      <div className="gba:space-y-6" data-testid="compliance-flow-detail-view">
        {/* Back button */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
          <Button
            variant="outline"
            onClick={() => setSelectedFlowId(null)}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="back-to-dashboard-button"
          >
            <ArrowLeft className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.back_to_btn",
              "Back to Dashboard",
            )}
          </Button>
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Flow Details</h1>
            <p className="gba:text-gray-600">Compliance Flow #{selectedFlowId.slice(0, 8)}</p>
          </div>
        </div>

        {/* Flow Detail Component */}
        <FlowDetailView {...context} flowId={selectedFlowId} />
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="compliance-dashboard-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <Shield className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Compliance Dashboard</h1>
          <p className="gba:text-gray-600">Monitor and manage compliance processes</p>
        </div>
      </div>

      {/* Statistics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        skeletonCount={4}
        emptyText="No compliance statistics available."
        data-testid="compliance-statistics"
      />

      {/* Recent Compliance Flows */}
      <Card className="gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Recent Compliance Flows</h3>
        {isLoading ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 xl:gba:grid-cols-3 gba:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="gba:h-36 gba:rounded gba:animate-pulse"
                data-testid={`compliance-flow-skeleton-${i}`}
              ></div>
            ))}
          </div>
        ) : complianceFlows.length > 0 ? (
          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-8">
            {complianceFlows.slice(0, 6).map((flow) => {
              // Use actual due date from API, fallback to estimated for flows without due dates
              const actualDueDate = flow.dueDate ? new Date(flow.dueDate) : null;
              const estimatedDueDate = new Date(
                new Date(flow.startTime).getTime() + 7 * 24 * 60 * 60 * 1000,
              );
              const dueDate = actualDueDate || estimatedDueDate;
              const isOverdue = new Date() > dueDate && flow.status === "RUNNING";
              const daysUntilDue = Math.ceil(
                (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
              );

              return (
                <Card
                  key={flow.id}
                  className={`gba:relative gba:overflow-hidden gba:border-2 gba:transition-all gba:duration-300 hover:gba:shadow-2xl hover:gba:scale-[1.02] gba:cursor-pointer ${
                    isOverdue
                      ? "gba:border-red-200 gba:bg-gradient-to-br gba:from-red-50 gba:to-white"
                      : flow.status === "COMPLETED"
                        ? "gba:border-green-200 gba:bg-gradient-to-br gba:from-green-50 gba:to-white"
                        : "gba:border-blue-200 gba:bg-gradient-to-br gba:from-blue-50 gba:to-white"
                  }`}
                  data-testid={`compliance-flow-card-${flow.id}`}
                  onClick={() => setSelectedFlowId(flow.id)}
                >
                  {/* Priority indicator stripe */}
                  <div
                    className={`gba:absolute gba:top-0 gba:left-0 gba:w-full gba:h-1 ${
                      isOverdue
                        ? "gba:bg-red-500"
                        : flow.status === "COMPLETED"
                          ? "gba:bg-green-500"
                          : "gba:bg-blue-500"
                    }`}
                  />

                  <div className="gba:p-6">
                    {/* Header with title and status badge */}
                    <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
                      <div className="gba:flex-1 gba:pr-4">
                        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                          <div
                            className={`gba:p-2 gba:rounded-lg ${
                              isOverdue
                                ? "gba:bg-red-100"
                                : flow.status === "COMPLETED"
                                  ? "gba:bg-green-100"
                                  : "gba:bg-blue-100"
                            }`}
                          >
                            <Shield
                              className={`gba:w-5 gba:h-5 ${
                                isOverdue
                                  ? "gba:text-red-600"
                                  : flow.status === "COMPLETED"
                                    ? "gba:text-green-600"
                                    : "gba:text-blue-600"
                              }`}
                            />
                          </div>
                          <h4 className="gba:text-xl gba:font-bold gba:text-gray-900 gba:leading-tight">
                            {flow.workflowName || "Untitled Flow"}
                          </h4>
                        </div>
                        <div className="gba:text-xs gba:text-gray-500 gba:font-mono gba:mb-3">
                          ID: {flow.id.substring(0, 8)}...
                        </div>
                      </div>
                      <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
                        <Badge
                          variant={
                            flow.status === "COMPLETED"
                              ? "default"
                              : flow.status === "RUNNING"
                                ? "secondary"
                                : "destructive"
                          }
                          className="gba:text-xs gba:font-semibold"
                        >
                          {flow.status}
                        </Badge>
                        {isOverdue && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-red-600 gba:font-medium">
                            <AlertTriangle className="gba:w-3 gba:h-3" />
                            OVERDUE
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key metrics grid */}
                    <div className="gba:grid gba:grid-cols-4 gba:gap-3 gba:mb-4">
                      {/* Created date */}
                      <div className="gba:text-center">
                        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">Created</div>
                        <div className="gba:text-sm gba:font-medium gba:text-gray-900">
                          {new Date(flow.startTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>

                      {/* Due date or completion */}
                      <div className="gba:text-center">
                        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
                          {flow.status === "COMPLETED" ? "Completed" : "Due Date"}
                        </div>
                        <div
                          className={`gba:text-sm gba:font-medium ${
                            flow.status === "COMPLETED"
                              ? "gba:text-green-600"
                              : isOverdue
                                ? "gba:text-red-600"
                                : daysUntilDue <= 2
                                  ? "gba:text-orange-600"
                                  : "gba:text-gray-900"
                          }`}
                        >
                          {flow.status === "COMPLETED" && flow.endTime
                            ? new Date(flow.endTime).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : dueDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                        </div>
                      </div>

                      {/* Task completion */}
                      <div className="gba:text-center">
                        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">Tasks</div>
                        <div
                          className={`gba:text-sm gba:font-medium ${
                            flow.completedTasks === flow.totalTasks
                              ? "gba:text-green-600"
                              : flow.completedTasks > 0
                                ? "gba:text-blue-600"
                                : "gba:text-gray-600"
                          }`}
                        >
                          {flow.completedTasks}/{flow.totalTasks}
                        </div>
                      </div>

                      {/* Days remaining or running time */}
                      <div className="gba:text-center">
                        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
                          {flow.status === "COMPLETED"
                            ? "Duration"
                            : flow.status === "RUNNING"
                              ? "Days Left"
                              : "Status"}
                        </div>
                        <div
                          className={`gba:text-sm gba:font-medium ${
                            flow.status === "COMPLETED"
                              ? "gba:text-gray-600"
                              : isOverdue
                                ? "gba:text-red-600"
                                : daysUntilDue <= 2
                                  ? "gba:text-orange-600"
                                  : "gba:text-green-600"
                          }`}
                        >
                          {flow.status === "COMPLETED"
                            ? `${Math.ceil((new Date(flow.endTime || flow.startTime).getTime() - new Date(flow.startTime).getTime()) / (1000 * 60 * 60 * 24) || 1)} days`
                            : flow.status === "RUNNING"
                              ? isOverdue
                                ? `${Math.abs(daysUntilDue)} days over`
                                : `${Math.max(0, daysUntilDue)} days`
                              : "Pending"}
                        </div>
                      </div>
                    </div>

                    {/* Segmented Step Progress */}
                    <div className="gba:mb-4">
                      {(() => {
                        const segments = stepSegmentsByFlowId[flow.id] || [];

                        // Compute overall progress from segments if available
                        let overallProgress = flow.progress || 0;
                        let completedSteps = flow.completedSteps || 0;
                        let totalSteps = flow.totalSteps || 0;

                        if (segments.length > 0) {
                          totalSteps = segments.length;
                          completedSteps = segments.filter((s) => s.status === "COMPLETED").length;
                          overallProgress =
                            segments.reduce((sum, seg) => sum + seg.percentage, 0) /
                            segments.length;
                        }

                        // Create visible segments - use fetched segments or fallback to estimated segments
                        const visible =
                          segments.length > 0
                            ? segments
                            : new Array(Math.max(1, totalSteps)).fill(0).map((_, idx) => ({
                                percentage: idx < completedSteps ? 100 : 0,
                                status: (idx < completedSteps
                                  ? "COMPLETED"
                                  : "PENDING") as StepSegment["status"],
                              }));

                        return (
                          <>
                            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                                Progress
                              </span>
                              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                                {Math.round(overallProgress)}%
                              </span>
                            </div>

                            <div
                              className="gba:flex gba:gap-1"
                              data-testid={`compliance-flow-step-segments-${flow.id}`}
                            >
                              {visible.map((seg, idx) => (
                                <div
                                  key={`${flow.id}-seg-${idx}`}
                                  className="gba:flex-1 gba:h-2 gba:rounded-sm gba:overflow-hidden gba:bg-gray-100"
                                  title={`Step ${idx + 1}: ${seg.status} (${seg.percentage}%)`}
                                >
                                  <div
                                    className="gba:h-full gba:transition-all gba:duration-300"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, seg.percentage))}%`,
                                      backgroundColor:
                                        seg.status === "COMPLETED"
                                          ? "#10b981"
                                          : seg.status === "IN_PROGRESS"
                                            ? "#3b82f6"
                                            : seg.status === "FAILED" ||
                                                seg.status === "TIMED_OUT" ||
                                                seg.status === "CANCELED"
                                              ? "#ef4444"
                                              : "transparent",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:mt-1">
                              <span>
                                {Math.round(completedSteps)} of {totalSteps} steps
                              </span>
                              <span>
                                {flow.status === "COMPLETED" ? "Complete" : "In Progress"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Footer with initiator and call-to-action */}
                    <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t gba:border-gray-100">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                        <Users className="gba:w-4 gba:h-4" />
                        <span>By {flow.initiator || "System"}</span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-blue-600 gba:font-medium">
                        <span>View Details</span>
                        <ArrowRight className="gba:w-4 gba:h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <Shield className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
            <p>No compliance flows found</p>
            <p className="gba:text-sm">Create your first compliance flow to get started</p>
          </div>
        )}
      </Card>
    </div>
  );
};
