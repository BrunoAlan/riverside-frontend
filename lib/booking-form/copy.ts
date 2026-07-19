// Copy for the booking form (checkout) modal, kept in one place like the
// itinerary summary's copy.ts.
export const BOOKING_FORM_COPY = {
  title: 'Guest information',
  guestBlock: (n: number) => `#${n} Guest information`,
  fields: {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone number',
  },
  emailPlaceholder: 'name@gmail.com',
  phonePlaceholder: '+1 (555) 000-0000',
  cancellation: {
    heading: 'Cancellation policy',
    body: 'Free cancellation before November 01.',
    detail: 'After that, the reservation is non-refundable.',
    learnMore: 'Learn more',
    terms: 'I agree to the Terms of Services, booking and cancellation policy',
  },
  submit: 'Submit',
  submitting: 'Sending…',
} as const;
