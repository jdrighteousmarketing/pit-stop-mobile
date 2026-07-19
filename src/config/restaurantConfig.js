export const restaurantConfig = {
  // =========================================================================
  // Restaurant Identity
  // =========================================================================
  // Never change this after a restaurant is created.
  // It uniquely identifies the restaurant throughout the database.
  id: 'pit_stop_mobile',

  // =========================================================================
  // Branding
  // =========================================================================
  appName:
    import.meta.env.VITE_APP_NAME || 'Pit Stop Mobile',

  restaurantName:
    import.meta.env.VITE_RESTAURANT_NAME || 'Pit Stop Mobile',

  logo:
    import.meta.env.VITE_RESTAURANT_LOGO ||
    '/branding/logo.png',

  signupHeroImage:
    import.meta.env.VITE_SIGNUP_HERO_IMAGE ||
    '/branding/signup-hero.png',

  primaryColor:
    import.meta.env.VITE_PRIMARY_COLOR || '#C8102E',

    emailHeaderImage: '/branding/email-header.png',

  // =========================================================================
  // Default Contact Information
  // =========================================================================
  defaultSupportEmail:
    import.meta.env.VITE_SUPPORT_EMAIL ||
    'support@pitstopmobile.com',

  defaultPhone:
    import.meta.env.VITE_RESTAURANT_PHONE || '',

  defaultAddress:
    import.meta.env.VITE_RESTAURANT_ADDRESS || '',

  defaultWebsite:
    import.meta.env.VITE_RESTAURANT_WEBSITE || '',

  // =========================================================================
  // Default Business Settings
  // =========================================================================
  defaultTagline:
    import.meta.env.VITE_DEFAULT_TAGLINE ||
    'Fresh food, rewards, and fast service.',

  defaultTaxRate: 0.06,

  defaultPointsPerDollar: 1,
};