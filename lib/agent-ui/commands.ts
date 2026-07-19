import { z } from 'zod';

const Base = z.object({
  correlationId: z.string(),
  sessionId: z.string().optional(),
  // Who originated the command: 'frontend-intent' when the user tapped,
  // 'classifier' when the agent decided on its own. The backend computes this
  // (turn_handler.py:143) but does not send it yet — accepted here so it parses
  // the day it does. Nothing renders differently on it today.
  source: z.string().optional(),
});

const ShowDiscoveryCanvas = Base.extend({
  type: z.literal('show_discovery_canvas'),
  payload: z.object({}).optional(),
});

const SoftRedirect = Base.extend({
  type: z.literal('soft_redirect'),
  // Matches what the backend actually emits: {reasonCode, suggestedIntent}.
  // `suggestedIntent` is renderer steering, deliberately not modeled here.
  payload: z.object({
    reasonCode: z.string(),
  }),
});

export const Experience = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  venue: z.string().nullable(),
  description: z.string(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
});
export type Experience = z.infer<typeof Experience>;

// A city as it travels inside an itinerary payload. Structurally a `City`
// (lib/map/cities.ts) plus the wire-only `day_details` and `experiences`.
export const ItineraryCity = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  image: z.string(),
  days: z.string(),
  lon: z.number(),
  lat: z.number(),
  day_details: z.array(z.object({ day: z.string(), description: z.string() })).optional(),
  experiences: z.array(Experience).optional(),
});
export type ItineraryCity = z.infer<typeof ItineraryCity>;

export const ItineraryFull = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.object({ days: z.number().int(), nights: z.number().int() }),
  match_score: z.number(),
  departure_dates: z.array(z.string()),
  center: z.tuple([z.number(), z.number()]), // [lon, lat]
  zoom: z.number(),
  cities: z.array(ItineraryCity).min(1),
});
export type ItineraryFull = z.infer<typeof ItineraryFull>;

const ShowItineraryOptions = Base.extend({
  type: z.literal('show_itinerary_options'),
  payload: z.object({ itinerary: ItineraryFull }),
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

const LabelField = z.preprocess(
  (v) => (v && typeof v === 'object' && (v as { label?: unknown }).label == null ? null : v),
  z.object({ label: z.string() }).nullable()
);

export const BookingSummarySnapshot = z.object({
  people: LabelField,
  month: LabelField,
  embarkation: LabelField,
  stops: z.object({ primary: z.string(), extra: z.number().int().min(0) }).nullable(),
  duration: LabelField,
  price: LabelField,
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

// A cabin as it travels in a cabin_selection payload. Card fields plus the
// detail-only content shown in the cabin modal.
export const Cabin = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  guests: z.number().int(),
  area: z.number(),
  price_from: z.number(),
  view: z.string(),
  detail: z.object({
    gallery: z.array(z.string()).min(1),
    bedroom: z.array(z.string()),
    bathroom: z.array(z.string()),
    amenities: z.array(z.string()),
  }),
});
export type Cabin = z.infer<typeof Cabin>;

const ShowCabinOptions = Base.extend({
  type: z.literal('show_cabin_options'),
  payload: z.object({ cabins: z.array(Cabin).min(1) }),
});

const ShowCabinDetail = Base.extend({
  type: z.literal('show_cabin_detail'),
  payload: z.object({ cabin_id: z.string().nullable() }),
});

const ShowCityDetail = Base.extend({
  type: z.literal('show_city_detail'),
  payload: z.object({ city_id: z.string().nullable() }),
});

const ShowExperienceDetail = Base.extend({
  type: z.literal('show_experience_detail'),
  payload: z.object({ experience_id: z.string().nullable() }),
});

const ShowItineraryTab = Base.extend({
  type: z.literal('show_itinerary_tab'),
  payload: z.object({ tab: z.enum(['overview', 'excursions']) }),
});

const nstr = z.string().nullable();

export const ItinerarySummaryWire = z.object({
  header: z.object({ title: nstr, subtitle: nstr, image: nstr }),
  details: z.object({
    guests: nstr,
    month: nstr,
    embarkation: nstr,
    stops: nstr,
    dates: nstr,
    price_per_person: nstr,
    cabin_name: nstr,
  }),
  cabin: Cabin.nullable(),
  package: z
    .object({
      price_per_person: nstr,
      name: nstr,
      inclusions: z.array(z.string()),
    })
    .nullable(),
  itinerary: z
    .object({
      title: nstr,
      countries: z.array(z.string()),
      description: nstr,
      cities: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          country: z.string(),
          days: z.string(),
          image: z.string(),
        })
      ),
    })
    .nullable(),
  total: nstr,
});
export type ItinerarySummaryWire = z.infer<typeof ItinerarySummaryWire>;

const ShowItinerarySummary = Base.extend({
  type: z.literal('show_itinerary_summary'),
  payload: ItinerarySummaryWire,
});

const AddCabinToBasket = Base.extend({
  type: z.literal('add_cabin_to_basket'),
  payload: z.object({
    cabin_id: z.string(),
    name: z.string(),
    category: z.string(),
    guests: z.number().int(),
    area: z.number(),
    price_from: z.number().nullable(),
    view: z.string(),
  }),
});

const AddExperienceToBasket = Base.extend({
  type: z.literal('add_experience_to_basket'),
  // The backend currently sends only `experience_id` (select_experience.py:193).
  // `day` and `passenger_count` stay optional so the command parses today;
  // sync_itinerary_experiences carries the full basket in the same batch.
  payload: z.object({
    experience_id: z.string(),
    day: z.string().optional(),
    passenger_count: z.number().int().optional(),
  }),
});

const SyncItineraryExperiences = Base.extend({
  type: z.literal('sync_itinerary_experiences'),
  payload: z.object({
    experiences: z.array(
      z.object({
        experience_id: z.string(),
        name: z.string(),
        day: z.string(),
        destination: z.string(),
        passenger_count: z.number().int(),
      })
    ),
  }),
});

export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDestinationDetail,
  SetBookingSummary,
  ShowCabinOptions,
  ShowCabinDetail,
  ShowCityDetail,
  ShowExperienceDetail,
  ShowItineraryTab,
  AddCabinToBasket,
  AddExperienceToBasket,
  SyncItineraryExperiences,
  ShowItinerarySummary,
]);
export type UiCommand = z.infer<typeof UiCommand>;

// The inbound data-channel envelope that wraps a batch of UI commands. Permissive
// by design: it only guarantees `commands` is an array (defaulting to empty). The
// metadata fields are listed to document the wire shape but stay `unknown` so a
// stray type (e.g. a numeric or null `correlationId`) never rejects the whole
// batch — only a non-array `commands` is treated as a malformed envelope.
// Named `UiCommandEnvelope` to stay distinct from the outbound `FrontendIntent`
// envelope in frontend-intent.ts.
export const UiCommandEnvelope = z.object({
  correlationId: z.unknown().optional(),
  sessionId: z.unknown().optional(),
  timestamp: z.unknown().optional(),
  commands: z.array(z.unknown()).default([]),
});
export type UiCommandEnvelope = z.infer<typeof UiCommandEnvelope>;
