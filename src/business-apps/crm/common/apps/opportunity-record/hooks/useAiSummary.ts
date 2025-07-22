import * as z from "zod";
import useInformationExtraction from "@/common/hooks/useInformationExtraction";
import { useCallback, useState } from "react";
import { useOpportunityData } from "./useOpportunityData";
import { Opportunity } from "../types";
import { SalesActivityData, useGetSalesActivities } from "../queries/OpportunityActivityQueries";
import { CrmNoteData, useGetCrmNotes } from "../queries/CrmNoteQueries";
import { SalesTaskData, useGetSalesTasks } from "../queries/OpportunityTaskQueries";


const taskDescription = "You are an assistant that summarises CRM opportunity timelines. Provide a concise executive summary in plain language, the total number of activities mentioned, and up to 5 key insights or next steps as an array of strings. Respond strictly in JSON conforming to the provided schema.'"
const summarySchema = z.object({
    summary: z.string().describe("A concise executive summary in plain language"),
    keyInsights: z.array(z.string()).describe("Up to 5 key insights or next steps"),
});

type SummarySchema = z.infer<typeof summarySchema>

type AiSummaryState = {
    type: "loading"
} | {
    type: "error"
} | {
    type: "success"
    content: SummarySchema
};

type UseAiSummaryReturn = {
    state: AiSummaryState | null
    generateSummary: () => Promise<void>
}

function generateInputData(opportunity: Opportunity, activities: SalesActivityData[], notes: CrmNoteData[], tasks: SalesTaskData[]): string {
    let inputData = `
    Opportunity Info: ${JSON.stringify(opportunity)}
    Activities: ${JSON.stringify(activities)}
    Notes: ${JSON.stringify(notes)}
    Tasks: ${JSON.stringify(tasks)}
    `;

    return inputData;
}

export function useAiSummary(opportunityId: string, accessToken: string): UseAiSummaryReturn {
    const [state, setState] = useState<AiSummaryState | null>(null);
    const extractInformation = useInformationExtraction(taskDescription, summarySchema);
    const { opportunity, refetchOpportunityData } = useOpportunityData(opportunityId, accessToken);
    const { fetchSalesActivities } = useGetSalesActivities(accessToken);
    const { fetchCrmNotes } = useGetCrmNotes(accessToken);
    const { fetchSalesTasks } = useGetSalesTasks(accessToken);

    const generateSummary = useCallback(async () => {
        setState({ type: "loading" });
        try {
            // get opportunity data
            await refetchOpportunityData();
            if (!opportunity) {
                setState({ type: "error" });
                return
            }

            // get activity data
            const activityResult = await fetchSalesActivities({ opportunityId });
            const sortedActivities = (activityResult.SalesActivity || []).sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // get notes data
            const notesResult = await fetchCrmNotes({ opportunityId });
            const sortedNotes = (notesResult.CrmNote || []).sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // get task data
            const tasksResult = await fetchSalesTasks({ opportunityId });
            const sortedTasks = (tasksResult.SalesTask || []).sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            const inputData = generateInputData(opportunity, sortedActivities, sortedNotes, sortedTasks);

            const result = await extractInformation(inputData);
            setState({ type: "success", content: result });
        } catch (error) {
            setState({ type: "error" });
        }
    }, [extractInformation, setState, opportunityId, refetchOpportunityData, opportunity]);

    return { state, generateSummary };
}
