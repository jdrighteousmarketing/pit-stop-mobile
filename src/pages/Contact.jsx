import {
  Phone,
  Mail,
  Globe,
  MapPin,
  ArrowLeft,
  Facebook,
  Instagram,
  Clock,
  Navigation,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const DEFAULT_HOURS = [
  { day: 'Monday', open: '11:00', close: '21:00', closed: false },
  { day: 'Tuesday', open: '11:00', close: '21:00', closed: false },
  { day: 'Wednesday', open: '11:00', close: '21:00', closed: false },
  { day: 'Thursday', open: '11:00', close: '21:00', closed: false },
  { day: 'Friday', open: '11:00', close: '22:00', closed: false },
  { day: 'Saturday', open: '10:00', close: '22:00', closed: false },
  { day: 'Sunday', open: '10:00', close: '20:00', closed: false },
];

const FALLBACK_SETTINGS = {
  business_name: 'Pit Stop Mobile',
  name: 'Pit Stop Mobile',
  tagline: 'Fresh food, rewards, and fast service.',
  phone: '',
  email: '',
  website: '',
  facebook_url: '',
  instagram_url: '',
  address: '',
  current_location: '',
  business_hours: DEFAULT_HOURS,
};

function formatTime(time) {
  if (!time) return '';

  const [h, m] = time.split(':').map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return time;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHours(item) {
  if (!item) return '';

  if (item.closed) {
    return 'Closed';
  }

  if (item.hours) {
    return item.hours;
  }

  if (item.open && item.close) {
    return `${formatTime(item.open)} – ${formatTime(item.close)}`;
  }

  return 'Hours not listed';
}

function buildMapsUrl(settings) {
  if (settings.latitude && settings.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`;
  }

  const location = settings.current_location || settings.address;

  if (!location) {
    return 'https://www.google.com/maps';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
  )}`;
}

function normalizeUrl(url) {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
}

export default function Contact() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contactRestaurantSettings', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (error) {
        console.error('Contact settings error:', error);
        throw error;
      }

      return data;
    },
  });

  const settings = {
    ...FALLBACK_SETTINGS,
    ...(data || {}),
    business_name:
      data?.business_name || data?.name || FALLBACK_SETTINGS.business_name,
    tagline: data?.tagline || FALLBACK_SETTINGS.tagline,
    business_hours:
      Array.isArray(data?.business_hours) && data.business_hours.length > 0
        ? data.business_hours
        : DEFAULT_HOURS,
  };

  const directionsUrl = buildMapsUrl(settings);

  const contactItems = [
    settings.phone
      ? {
          icon: Phone,
          label: 'Call Us',
          value: settings.phone,
          href: `tel:${settings.phone}`,
        }
      : null,
    settings.email
      ? {
          icon: Mail,
          label: 'Email',
          value: settings.email,
          href: `mailto:${settings.email}`,
        }
      : null,
    settings.website
      ? {
          icon: Globe,
          label: 'Website',
          value: settings.website,
          href: normalizeUrl(settings.website),
        }
      : null,
    settings.facebook_url
      ? {
          icon: Facebook,
          label: 'Facebook',
          value: 'Visit our Facebook page',
          href: normalizeUrl(settings.facebook_url),
        }
      : null,
    settings.instagram_url
      ? {
          icon: Instagram,
          label: 'Instagram',
          value: 'Follow us on Instagram',
          href: normalizeUrl(settings.instagram_url),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="pb-4">
      <div className="px-5 pt-12 pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl font-display font-bold">Contact Us</h1>

        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'Loading business information...' : "We'd love to hear from you"}
        </p>
      </div>

      {error && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            Could not load contact settings. Showing default information.
          </div>
        </div>
      )}

      <div className="px-5 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-accent rounded-3xl p-5 text-white relative overflow-hidden"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-white/70">
              Welcome to
            </p>

            <h2 className="text-3xl font-display font-bold mt-1">
              {settings.business_name}
            </h2>

            <p className="text-sm text-white/80 mt-2">{settings.tagline}</p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              {settings.phone ? (
                <a
                  href={`tel:${settings.phone}`}
                  className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm"
                >
                  <Phone className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Call Now</span>
                </a>
              ) : (
                <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm opacity-60">
                  <Phone className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">No Phone</span>
                </div>
              )}

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm"
              >
                <Navigation className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Directions</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {(settings.address || settings.current_location) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4"
          >
            <div className="p-2.5 rounded-xl bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Address
              </p>

              <p className="text-sm font-medium">
                {settings.current_location || settings.address}
              </p>

              {settings.current_location && settings.address && (
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.address}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {contactItems.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            No contact links have been added yet.
          </div>
        ) : (
          contactItems.map(({ icon: Icon, label, value, href }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.06 }}
            >
              <a
                href={href}
                target={
                  href.startsWith('tel:') || href.startsWith('mailto:')
                    ? '_self'
                    : '_blank'
                }
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-all"
              >
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </a>
            </motion.div>
          ))
        )}
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-base font-display font-bold">Business Hours</h2>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="space-y-2">
            {settings.business_hours.map((item) => (
              <div
                key={item.day}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{item.day}</span>
                <span className="font-medium">{formatHours(item)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}