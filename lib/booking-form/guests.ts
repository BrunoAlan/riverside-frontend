export type GuestInfo = {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
};

export function makeEmptyGuests(count: number): GuestInfo[] {
  return Array.from({ length: Math.max(0, count) }, () => ({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: 'US',
    phone: '',
  }));
}
