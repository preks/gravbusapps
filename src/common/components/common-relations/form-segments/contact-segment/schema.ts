import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const contactSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, "Owner is required"),
  contactTypeRef: z.string().optional(),
  salutationRef: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required"),
  phone: z.string().optional(),
  academicTitleRef: z.string().optional(),
  languageRef: z.string().optional(),
  birthDate: z.string().optional(),
  description: z.string().optional(),
  notesSummary: z.string().optional(),
  jobPosition: z.string().optional(),
  department: z.string().optional(),
  code: z.string().optional(),
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
  pictureFile: z.any().optional(),
  relatedEntityId: z.string().optional(),
});

export type ContactSegmentSchema = z.infer<typeof contactSegmentSchema>;

export const createContactSegmentResolver = () => zodResolver(contactSegmentSchema);


