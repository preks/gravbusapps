import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const accountSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, "Owner is required"),
  accountName: z.string().min(1, "Account name is required"),
  legalFormRef: z.string().optional(),
  industryRef: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  geographicPresence: z.string().optional(),
  annualRevenue: z.string().optional(),
  numberOfEmployees: z.string().optional(),
  timeZone: z.string().optional(),
  foundationDate: z.string().optional(),
  tickerSymbol: z.string().optional(),
  liquidationDate: z.string().optional(),
  mission: z.string().optional(),
  specialty: z.string().optional(),
  notesSummary: z.string().optional(),
  pictureFile: z.any().optional(),
  communicationChannels: z.array(z.object({
    channelRef: z.string(),
    value: z.string().min(1, "Value is required"),
  })).optional(),
  addresses: z.array(z.object({
    addressTypeRef: z.string().optional(),
    countryRef: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
  })).optional(),
  relatedEntityId: z.string().optional(),
});

export type AccountSegmentSchema = z.infer<typeof accountSegmentSchema>;

export const createAccountSegmentResolver = () => zodResolver(accountSegmentSchema);


