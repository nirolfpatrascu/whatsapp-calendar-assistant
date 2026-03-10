import { z } from "zod";

export const UpdateProfileSchema = z.object({
  phone: z
    .string()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+?\d[\d\s-]{5,}$/, "Invalid phone number format"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const UpdateCalendarSelectionSchema = z.object({
  selected_calendar_ids: z
    .array(z.string())
    .min(1, "Select at least one calendar"),
});
