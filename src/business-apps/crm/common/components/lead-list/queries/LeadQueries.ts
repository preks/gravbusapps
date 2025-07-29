import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCallback } from "react";
import { LeadQueryVariables, LeadListResponse } from "../types";

export const GET_LEADS_QUERY = `
  query GetLeads($offset: Int, $limit: Int, $orderBy: [LeadOrderBy!], $where: LeadBoolExp) {
    Lead(offset: $offset, limit: $limit, orderBy: $orderBy, where: $where) {
      id
      name
      firstName
      lastName
      email
      phoneNumber
      companyName
      companyEmail
      companyPhone
      createdAt
      countryRef
      contact {
        id
        firstName
        lastName
        pictureUrl
      }
      country {
        id
        code
        value
      }
      leadSource {
        id
        code
        value
      }
      leadStatus {
        id
        code
        value
        objectValue
      }
      leadRating {
        id
        code
        value
        objectValue
      }
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
      }
      account {
        id
        name
      }
    }
    LeadAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useGetLeadsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLeadsData = useCallback(
    async (variables: LeadQueryVariables = {}): Promise<LeadListResponse> => {
      const defaultVariables = {
        offset: 0,
        limit: 20,
        orderBy: [{ createdAt: "DESC" }],
        where: { isDeleted: { _eq: false } },
        ...variables,
      };

      try {
        const result = await graphqlClient.request<LeadListResponse>(
          GET_LEADS_QUERY,
          defaultVariables
        );
        return result;
      } catch (error) {
        console.error("Error fetching leads data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchLeadsData };
};
