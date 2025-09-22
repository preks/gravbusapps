import { env } from "../../env/EnvUtils";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";
import { RestClient, type RequestOptions, ResponseType } from "../rest/RestClient";

const BASE_PATH = "api/v1";

export interface GenerateInvestmentReportRequest {
  reportPath: string;
  templateName: string;
  reportData: {
    investment: any;
    equityInvestment?: any;
    equityInvestmentRounds?: any[];
    investmentRole?: any;
    realEstateInvestment?: any;
    ownerEmployeeName?: string;
    holdingPeriod?: number;
    aboutInvestment?: string;
    motivation?: string;
    topicsAndOutlook?: string[];
    aboutProjectDevelopment?: string;
    review?: string;
    outlook?: string[];
    mainActionItems?: string[];
    investmentPotential?: string;
    aboutProperty?: string;
    aboutArea?: string;
  };
}

export interface GenerateInvestmentReportResponse {
  success: boolean;
  reportUrl?: string;
  message?: string;
}

export class InvestmentReportClient extends RestClient {
  constructor() {
    let url: string = env("NEXT_PUBLIC_INVESTMENT_REPORT_API") ?? env("NEXT_PUBLIC_BASE_URL") ?? "";
    if (!url.endsWith("/")) {
      url += "/";
    }

    url += BASE_PATH;

    super(url, {});
  }

  /**
   * Generate investment one-pager report
   */
  public async generateInvestmentReport(
    request: GenerateInvestmentReportRequest,
    accessToken: string,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<GenerateInvestmentReportResponse> {
    const headers = {
      ...options.headers,
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    };

    return this.post<GenerateInvestmentReportResponse>(
      "/generateInvestmentReport",
      request,
      {
        ...options,
        headers,
        responseType: ResponseType.JSON,
      }
    );
  }

  /**
   * Alternative method for blob response (if the API returns a file directly)
   */
  public async generateInvestmentReportBlob(
    request: GenerateInvestmentReportRequest,
    accessToken: string,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<Blob> {
    const headers = {
      ...options.headers,
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    };

    return this.post<Blob>(
      "/generateInvestmentReport",
      request,
      {
        ...options,
        headers,
        responseType: ResponseType.BLOB,
      }
    );
  }
}

export const investmentReportClient = new InvestmentReportClient();
