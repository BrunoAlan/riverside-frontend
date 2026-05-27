import { z } from 'zod';

const Base = z.object({
  correlationId: z.string(),
  sessionId: z.string().optional(),
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

export const Destination = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  region: z.string(),
  aliases: z.array(z.string()),
});
export type Destination = z.infer<typeof Destination>;

export const DestinationImage = z.object({
  url: z.string().url(),
  caption: z.string(),
});
export type DestinationImage = z.infer<typeof DestinationImage>;

const ShowDestinationDetail = Base.extend({
  type: z.literal('show_destination_detail'),
  payload: z.object({
    destination: Destination,
    images: z.array(DestinationImage).min(1),
  }),
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
  ShowDestinationDetail,
  SetBookingSummary,
  SetCabinDetail,
]);
export type UiCommand = z.infer<typeof UiCommand>;
