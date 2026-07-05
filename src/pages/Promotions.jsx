import { useEffect, useMemo, useState } from 'react';
import { Tag, Clock, Ticket, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { toast } from 'sonner';

const RESTAURANT_ID = 'pit_stop_mobile';

const typeConfig = {
  promotion: {
    icon: Tag,
    label: 'Promotion',
    color: 'bg-primary/10 text-primary',
  },
  coupon: {
    icon: Ticket,
    label: 'Coupon',
    color: 'bg-violet-500/10 text-violet-600',
  },
  limited_time: {
    icon: Clock,
    label: 'Limited Time',
    color: 'bg-amber-500/10 text-amber-600',
  },
};

function getDiscountLabel(promo) {
  if (promo.discount_type === 'percentage') {
    return `${promo.discount_value || 0}% Off`;
  }

  if (promo.discount_type === 'fixed') {
    return `$${promo.discount_value || 0} Off`;
  }

  if (promo.discount_type === 'bogo') {
    return 'BOGO';
  }

  if (promo.discount_type === 'points') {
    return `${promo.discount_value || 2}X Points`;
  }

  if (promo.discount_type === 'free_item') {
    return 'Free Item';
  }

  return 'Special Offer';
}

function isPromoInDateRange(promo) {
  const now = new Date();

  if (promo.end_date) {
    const endDate = new Date(promo.end_date);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < now) return false;
  }

  if (promo.start_date) {
    const startDate = new Date(promo.start_date);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > now) return false;
  }

  return true;
}

export default function Promotions() {
  const queryClient = useQueryClient();
  const [redeemingId, setRedeemingId] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);

  const { data: customerProfile } = useCustomerProfile();

  const customerId = customerProfile?.id || null;
  const customerName = customerProfile?.name || 'Customer';
  const customerCode =
    customerProfile?.customer_id_code ||
    customerProfile?.customer_code ||
    null;

  const checkoutCustomerId = customerId || customerCode || 'guest-customer';

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery({
    queryKey: ['promotions', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load promotions:', error);
        throw error;
      }

      return Array.isArray(data) ? data : [];
    },
  });

  const { data: checkoutDeals = [], isLoading: checkoutDealsLoading } = useQuery({
    queryKey: ['customerCheckoutDeals', RESTAURANT_ID, checkoutCustomerId],
    enabled: !!checkoutCustomerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_checkout_deals')
        .select('promotion_id, status')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_id', checkoutCustomerId)
        .in('status', ['pending', 'redeemed']);

      if (error) {
        console.error('Could not load checkout deals:', error);
        throw error;
      }

      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    const handleDealUpdate = () => {
      queryClient.invalidateQueries({
        queryKey: ['customerCheckoutDeals', RESTAURANT_ID, checkoutCustomerId],
      });

      setJustAddedId(null);
    };

    window.addEventListener('pitstop_checkout_deals_updated', handleDealUpdate);
    window.addEventListener('focus', handleDealUpdate);

    return () => {
      window.removeEventListener('pitstop_checkout_deals_updated', handleDealUpdate);
      window.removeEventListener('focus', handleDealUpdate);
    };
  }, [queryClient, checkoutCustomerId]);

  const hiddenPromotionIds = useMemo(() => {
    return new Set([
      ...checkoutDeals.map((deal) => String(deal.promotion_id)),
      ...(justAddedId ? [String(justAddedId)] : []),
    ]);
  }, [checkoutDeals, justAddedId]);

  const activePromos = useMemo(() => {
    return promotions.filter((promo) => {
      if (hiddenPromotionIds.has(String(promo.id))) return false;
      if (!isPromoInDateRange(promo)) return false;
      return true;
    });
  }, [promotions, hiddenPromotionIds]);

  const handleRedeemDeal = async (promo) => {
    setRedeemingId(promo.id);

    try {
      const payload = {
        restaurant_id: RESTAURANT_ID,

        customer_id: checkoutCustomerId,
        customer_name: customerName || 'Customer',
        customer_code: customerCode || checkoutCustomerId,

        promotion_id: String(promo.id),
        promotion_title: promo.title,
        promotion_type: promo.promotion_type,
        promo_code: promo.promo_code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,

        minimum_order_amount:
        promo.minimum_order_amount ??
        promo.minimumOrderAmount ??
        promo.min_order_amount ??
        null,

        apply_to: promo.apply_to || 'entire_order',
        target_menu_item_id: promo.target_menu_item_id || null,
        target_category_id: promo.target_category_id || null,

        status: 'pending',
      };

      const { error } = await supabase
        .from('customer_checkout_deals')
        .insert([payload]);

      if (error) throw error;

      setJustAddedId(String(promo.id));

      window.dispatchEvent(new Event('pitstop_checkout_deals_updated'));

      await queryClient.invalidateQueries({
        queryKey: ['customerCheckoutDeals', RESTAURANT_ID, checkoutCustomerId],
      });

      toast.success('Deal added to checkout.');
    } catch (error) {
      console.error('Could not add deal to checkout:', error);
      toast.error(error.message || 'Could not add deal to checkout.');
    } finally {
      setRedeemingId(null);
    }
  };

  const isLoading = promotionsLoading || checkoutDealsLoading;

  return (
    <div className="pb-4">
      <div className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-display font-bold">Deals & Promotions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Don&apos;t miss out on these offers
        </p>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading promotions...
          </div>
        ) : activePromos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-muted-foreground"
          >
            <p className="text-4xl mb-3">🏷️</p>
            <p className="font-medium">No active promotions</p>
            <p className="text-sm mt-1">Check back soon for new deals!</p>
          </motion.div>
        ) : (
          activePromos.map((promo, i) => {
            const config =
              typeConfig[promo.promotion_type] || typeConfig.promotion;

            const Icon = config.icon;

            return (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {promo.image_url && (
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="w-full h-40 object-cover"
                  />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={`${config.color} border-0`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>

                    <div className="flex items-center gap-1 text-primary font-bold text-sm">
                      <Percent className="w-3.5 h-3.5" />
                      {getDiscountLabel(promo)}
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-base">
                    {promo.title}
                  </h3>

                  {promo.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {promo.description}
                    </p>
                  )}

                  <Button
                    type="button"
                    className="w-full mt-4"
                    disabled={redeemingId === promo.id}
                    onClick={() => handleRedeemDeal(promo)}
                  >
                    {redeemingId === promo.id
                      ? 'Added to Checkout'
                      : 'Add Deal to Checkout'}
                  </Button>

                  {promo.end_date && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {format(new Date(promo.end_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
