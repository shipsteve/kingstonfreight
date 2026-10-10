export const config = {
  homeCountry: (process.env.HOME_COUNTRY || "US").toUpperCase(),
  currency: (process.env.CURRENCY || "USD").toUpperCase(),
  volumetricDivisor: 5000,
  quoteValidityDays: 7,
} as const;
