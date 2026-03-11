import { z } from "zod";

export const UpdateProfileSchema = z.object({
  phone: z
    .string()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+?\d[\d\s-]{5,}$/, "Invalid phone number format"),
  timezone: z.string().min(1, "Timezone is required"),
  preferred_hour: z.number().int().min(0).max(23),
  preferred_minute: z
    .number()
    .int()
    .refine((v) => [0, 15, 30, 45].includes(v), {
      message: "Minute must be 0, 15, 30, or 45",
    }),
});

export const UpdateCalendarSelectionSchema = z.object({
  selected_calendar_ids: z
    .array(z.string())
    .min(1, "Select at least one calendar"),
});
