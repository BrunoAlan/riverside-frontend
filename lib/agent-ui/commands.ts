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

export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
]);
export type UiCommand = z.infer<typeof UiCommand>;
