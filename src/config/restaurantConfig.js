export const restaurantConfig = {
  id: 'pit_stop_mobile',

  name: import.meta.env.VITE_RESTAURANT_NAME || 'Pit Stop Mobile',

  logo: import.meta.env.VITE_RESTAURANT_LOGO || '/logo.png',

  primaryColor:
    import.meta.env.VITE_PRIMARY_COLOR || '#C8102E',

  supportEmail:
    import.meta.env.VITE_SUPPORT_EMAIL ||
    'support@pitstopmobile.com',

  defaultTagline:
    import.meta.env.VITE_DEFAULT_TAGLINE ||
    'Fresh food, rewards, and fast service.',

  defaultTaxRate: 0.06,

  defaultPointsPerDollar: 1,
};