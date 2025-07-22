import * as z from "zod";
import useInformationExtraction from "@/common/hooks/useInformationExtraction";
import { useCallback, useState } from "react";
import { useOpportunityData } from "./useOpportunityData";
import { Opportunity } from "../types";


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

function generateInputData(opportunity: Opportunity): string {
    return JSON.stringify(opportunity);
}

export function useAiSummary(opportunityId: string, accessToken: string): UseAiSummaryReturn {
    const [state, setState] = useState<AiSummaryState | null>(null);
    const extractInformation = useInformationExtraction(taskDescription, summarySchema);
    const { opportunity, refetchOpportunityData } = useOpportunityData(opportunityId, accessToken);
    
    const generateSummary = useCallback(async () => {
        setState({ type: "loading" });
        try {
            await refetchOpportunityData();
            if (!opportunity) {
                setState({ type: "error" });
                return
            }

            const inputData = generateInputData(opportunity);

            const result = await extractInformation(inputData);
            setState({ type: "success", content: result });
        } catch (error) {
            setState({ type: "error" });
        }
    }, [extractInformation, setState, opportunityId, refetchOpportunityData, opportunity]);

    return { state, generateSummary };
}
