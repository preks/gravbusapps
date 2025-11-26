import { env } from "../../env/EnvUtils";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";
import { RestClient, type RequestOptions } from "../rest/RestClient";

export interface QuickTipsRequest {
  ticket_data: Record<string, any>;
}

export interface QuickTipsResponse {
  quick_tips?: string;
  suggestions?: string;
  recommendations?: string[];
  analysis?: string;
  // Add other response fields as needed based on actual API response
}

export class FlowbotClient extends RestClient {
  constructor() {
    // Using the flowbot service URL from the provided endpoint
    const url = "https://newwork-dev.newwork.com/flowbot";
    super(url, {});
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }

    this.headers["Authorization"] = setAccessTokenToAuthorizationHeader(accessToken);
  }

  public async getQuickTipsForTicket(
    ticketData: Record<string, any>,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<QuickTipsResponse> {
    const requestBody: QuickTipsRequest = {
      ticket_data: ticketData
    };

    return this.post<QuickTipsResponse>(
      "/services/quick-tips-for-ticket/",
      requestBody,
      options
    );
  }
}

export const flowbotClient = new FlowbotClient();
