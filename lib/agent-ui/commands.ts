import { z } from 'zod';

const Base = z.object({
  correlation_id: z.string(),
  session_id: z.string().optional(),
});

const ShowDiscoveryCanvas = Base.extend({
  type: z.literal('show_discovery_canvas'),
  payload: z.object({}).optional(),
});

const SoftRedirect = Base.extend({
  type: z.literal('soft_redirect'),
  payload: z.object({
    reason_code: z.string(),
    missing: z.array(z.string()).optional(),
  }),
});

export const ItineraryOption = z.object({
  id: z.string(),
  name: z.string(),
  embarkation_port: z.string(),
  disembarkation_port: z.string(),
  match_score: z.number(),
});
export type ItineraryOption = z.infer<typeof ItineraryOption>;

const ShowItineraryOptions = Base.extend({
  type: z.literal('show_itinerary_options'),
  payload: z.object({ options: z.array(ItineraryOption).min(1) }),
});

export const DreamImage = z.object({
  src: z.string().url(),
  tag: z.string(),
});
export type DreamImage = z.infer<typeof DreamImage>;

const ShowDreamStage = Base.extend({
  type: z.literal('show_dream_stage'),
  payload: z.object({ images: z.array(DreamImage).min(1).max(5) }),
});

export const BookingSummarySnapshot = z.object({
  people: z.object({ label: z.string() }).nullable(),
  month: z.object({ label: z.string() }).nullable(),
  embarkation: z.object({ label: z.string() }).nullable(),
  stops: z.object({ primary: z.string(), extra: z.number().int().min(0) }).nullable(),
  duration: z.object({ label: z.string() }).nullable(),
  price: z.object({ label: z.string() }).nullable(),
  slots: z
    .array(
      z.object({
        label: z.string(),
        state: z.enum(['active', 'filled', 'empty']),
      })
    )
    .max(6),
  cta: z.object({ label: z.string(), enabled: z.boolean() }),
});
export type BookingSummarySnapshot = z.infer<typeof BookingSummarySnapshot>;

const SetBookingSummary = Base.extend({
  type: z.literal('set_booking_summary'),
  payload: BookingSummarySnapshot,
});

const SetCabinDetail = Base.extend({
  type: z.literal('set_cabin_detail'),
  payload: z.object({ cabin_id: z.string().nullable() }),
});

export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDreamStage,
  SetBookingSummary,
  SetCabinDetail,
]);
export type UiCommand = z.infer<typeof UiCommand>;
