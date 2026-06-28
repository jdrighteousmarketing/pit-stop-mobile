import { useEffect, useState } from 'react';
import HomeHero from '@/components/customer/HomeHero';
import QuickLinks from '@/components/customer/QuickLinks';
import { Link } from 'react-router-dom';
import { Gift, ChevronRight, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import PullToRefresh from '@/components/customer/PullToRefresh';
import AddToCartButton from '@/components/customer/AddToCartButton';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const DEFAULT_HOURS = [
  { day: 'Monday', open: '10:00', close: '20:00', closed: false },
  { day: 'Tuesday', open: '10:00', close: '20:00', closed: false },
  { day: 'Wednesday', open: '10:00', close: '20:00', closed: false },
  { day: 'Thursday', open: '10:00', close: '20:00', closed: false },
  { day: 'Friday', open: '10:00', close: '21:00', closed: false },
  { day: 'Saturday', open: '11:00', close: '21:00', closed: false },
  { day: 'Sunday', open: '11:00', close: '18:00', closed: false },
];

const DEFAULT_SETTINGS = {
  business_name: 'My Restaurant Name',
  tagline: 'Fresh food, fast service, real rewards.',
  phone: '',
  address: 'Your Address Here',
  logo_url: '',
  hero_image_url: '',
  background_image_url: '',
  overlay_color: '#000000',
  overlay_opacity: 0.5,
  business_hours: DEFAULT_HOURS,
};

const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function Home() {
  const [profile, setProfile] = useState({
    name: 'Customer',
    email: '',
    points_balance: 0,
    customer_id_code: '',
  });

  const [featuredItems, setFeaturedItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadingHome, setLoadingHome] = useState(true);

  const loadCustomerProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        setProfile({
          name: 'Customer',
          email: '',
          points_balance: 0,
          customer_id_code: '',
        });
        return;
      }

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, email, points_balance, customer_code, customer_id_code')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customerData) {
        setProfile({
          name: user.email?.split('@')[0] || 'Customer',
          email: user.email || '',
          points_balance: 0,
          customer_id_code: '',
        });
        return;
      }

      setProfile({
        name:
          customerData.name ||
          user.email?.split('@')[0] ||
          'Customer',
        email: customerData.email || user.email || '',
        points_balance: Number(customerData.points_balance || 0),
        customer_id_code:
          customerData.customer_code ||
          customerData.customer_id_code ||
          '',
      });
    } catch (error) {
      console.error('Could not load customer profile:', error);
      setProfile({
        name: 'Customer',
        email: '',
        points_balance: 0,
        customer_id_code: '',
      });
    }
  };

  const loadHomeData = async () => {
    setLoadingHome(true);

    try {
      const [
        { data: restaurantData, error: restaurantError },
        { data: itemData, error: itemError },
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle(),

        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('is_featured', true)
          .eq('is_available', true)
          .eq('is_sold_out', false)
          .order('sort_order', { ascending: true })
          .limit(6),
      ]);

      if (restaurantError) throw restaurantError;
      if (itemError) throw itemError;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(restaurantData || {}),
        business_name:
          restaurantData?.business_name ||
          restaurantData?.name ||
          DEFAULT_SETTINGS.business_name,
        business_hours:
          restaurantData?.business_hours?.length > 0
            ? restaurantData.business_hours
            : DEFAULT_HOURS,
      });

      setFeaturedItems(itemData || []);
    } catch (error) {
      console.error(error);

      setSettings(DEFAULT_SETTINGS);
      setFeaturedItems([]);
    } finally {
      setLoadingHome(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      loadCustomerProfile();
    };

    loadCustomerProfile();
    loadHomeData();

    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pitstop_checkout_rewards_updated', handleUpdate);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pitstop_checkout_rewards_updated', handleUpdate);
    };
  }, []);

  const handleRefresh = async () => {
    await Promise.all([loadCustomerProfile(), loadHomeData()]);
    return true;
  };

  if (loadingHome || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="pb-4">
      <div className="space-y-6">
        <HomeHero settings={settings} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5"
        >
          <Link to="/rewards" className="block">
            <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -right-2 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Gift className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-xs text-white/80">Your Points</p>
                    <p className="text-2xl font-display font-bold">
                      {profile.points_balance}
                    </p>
                    <p className="text-[10px] text-white/70 font-mono">
                      {profile.customer_id_code}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-white/60" />
              </div>
            </div>
          </Link>
        </motion.div>

        <QuickLinks />

        {featuredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-bold">
                  Featured Specials
                </h2>
              </div>

              <Link
                to="/menu"
                className="text-xs text-primary font-semibold flex items-center gap-1"
              >
                View Menu
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[270px] max-w-[270px] bg-card rounded-2xl border border-border overflow-hidden snap-start"
                >
                  <div className="h-44 bg-muted">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🍔
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-display font-bold text-base truncate">
                      {item.name}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
                      {item.description || 'No description available.'}
                    </p>

                    <p className="text-primary font-bold mt-3">
                      ${Number(item.price || 0).toFixed(2)}
                    </p>

                    <div className="mt-3">
                      <AddToCartButton menuItem={item} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {settings?.business_hours?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-5"
          >
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-display font-bold text-base mb-3">Hours</h3>

              <div className="space-y-2">
                {settings.business_hours.map((h) => {
                  const isToday =
                    h.day ===
                    new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                    });

                  return (
                    <div
                      key={h.day}
                      className={`flex justify-between text-sm ${
                        isToday
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span>{h.day}</span>
                      <span>
                        {h.closed
                          ? 'Closed'
                          : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </PullToRefresh>
  );
}