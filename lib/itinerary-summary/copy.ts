// Shared CTA copy for the itinerary summary modal. Rendered in both the top bar
// and the footer bar, so it lives in one place to keep the labels in sync.
export const SUMMARY_CTA = {
  specialist: 'Talk to a Riverside Specialist',
  booking: 'Continue to booking',
} as const;

// Placeholders shown when a section/field is not yet chosen (partial booking).
export const SUMMARY_PLACEHOLDER = {
  field: '—',
  title: 'Your itinerary',
  cabin: 'Cabin not selected yet',
  package: 'Package not selected yet',
  itinerary: 'Itinerary not defined yet',
  image: '/cabin/1.png',
} as const;
