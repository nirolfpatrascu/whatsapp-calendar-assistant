import { z } from 'zod';

// ============================================================
// ORDER WEBHOOK (WooCommerce → /api/webhooks/order)
// ============================================================

export const OrderWebhookPayloadSchema = z.object({
  order_id: z.number(),
  customer_email: z.string().email(),
  customer_name: z.string(),
  status: z.string().optional(),
  total: z.string().optional(),
  currency: z.string().optional(),
  created_at: z.string().optional(),
});

export type OrderWebhookPayload = z.infer<typeof OrderWebhookPayloadSchema>;

// ============================================================
// ONBOARDING SUBMISSION (form → /api/onboarding)
// ============================================================

export const OnboardingPayloadSchema = z.object({
  phone: z.string().min(5, 'Phone number must be at least 5 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  send_hour: z.string().regex(/^\d{2}:\d{2}$/, 'Send hour must be in HH:MM format'),
  ordertoken: z.string().min(1, 'Order token is required'),
});

export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>;

// ============================================================
// PREFERENCES SAVE (/api/preferences POST)
// ============================================================

export const PreferencesSavePayloadSchema = z.object({
  calendar_ids: z.array(z.string()),
  send_hour: z.string().regex(/^\d{2}:\d{2}$/, 'Send hour must be in HH:MM format'),
  timezone: z.string().min(1, 'Timezone is required'),
  display_name: z.string().optional(),
});

export type PreferencesSavePayload = z.infer<typeof PreferencesSavePayloadSchema>;
