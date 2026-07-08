import RewardRequirementCard from '@/components/customer/RewardRequirementCard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Ticket,
  X,
  Gift,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { calculateCheckoutTotals } from "@/components/businessInsights/utils/checkoutPricing";

const RESTAURANT_ID = 'pit_stop_mobile';
const TAX_RATE = 6;

const CONFETTI = Array.from({ length: 52 }).map((_, index) => {
  const angle = (index / 52) * Math.PI * 2;
  const distance = 140 + Math.random() * 260;

  return {
    id: index,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    delay: Math.random() * 0.25,
    duration: 1.8 + Math.random() * 1.2,
    size: 7 + Math.random() * 12,
    rotate: Math.random() * 360,
    color: index % 2 === 0 ? '#22c55e' : '#facc15',
  };
});

function getDiscountLabel(deal) {
  if (deal.discount_type === 'percentage') return `${deal.discount_value || 0}% Off`;
  if (deal.discount_type === 'fixed') return `$${deal.discount_value || 0} Off`;
  if (deal.discount_type === 'bogo') return 'BOGO';
  if (deal.discount_type === 'points') return `${deal.discount_value || 2}X Points`;
  if (deal.discount_type === 'free_item') return 'Free Item';
  return 'Special Offer';
}

function makeCheckoutCode() {
  return `CHK-${Date.now().toString().slice(-8)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function getCartItemDisplayName(item) {
  if (item.display_name) return item.display_name;
  if (item.selected_size) return `${item.selected_size} ${item.name}`;
  return item.name || 'Item';
}


function getRewardType(reward) {
  return String(reward?.rewardType || reward?.reward_type || 'points_reward').toLowerCase();
}

function getRewardDiscountType(reward) {
  return String(reward?.discountType || reward?.discount_type || '').toLowerCase();
}

function getRewardTargetMenuItemId(reward) {
  return reward?.targetMenuItemId || reward?.target_menu_item_id || null;
}

function getRewardTargetCategoryId(reward) {
  return reward?.targetCategoryId || reward?.target_category_id || null;
}

function getItemMenuItemId(item) {
  return item?.menu_item_id || item?.id || item?.item_id || null;
}

function getItemCategoryId(item) {
  return item?.category_id || item?.categoryId || item?.menu_category_id || null;
}

function rewardNeedsMatchingCartItem(reward) {
  const rewardType = getRewardType(reward);
  const discountType = getRewardDiscountType(reward);

  return (
    rewardType === 'free_menu_item' ||
    rewardType === 'free_category' ||
    discountType === 'free_item' ||
    discountType === 'free_category'
  );
}

function rewardHasMatchingCartItem(reward, items = []) {
  const rewardType = getRewardType(reward);
  const discountType = getRewardDiscountType(reward);
  const targetMenuItemId = getRewardTargetMenuItemId(reward);
  const targetCategoryId = getRewardTargetCategoryId(reward);

  if (rewardType === 'free_menu_item' || discountType === 'free_item') {
    if (!targetMenuItemId) return false;

    return items.some(
      (item) => String(getItemMenuItemId(item) || '') === String(targetMenuItemId)
    );
  }

  if (rewardType === 'free_category' || discountType === 'free_category') {
    if (!targetCategoryId) return false;

    return items.some(
      (item) => String(getItemCategoryId(item) || '') === String(targetCategoryId)
    );
  }

  return true;
}

function dealNeedsMatchingCartItem(deal) {
  return Boolean(deal?.target_menu_item_id || deal?.target_category_id);
}

function dealHasMatchingCartItem(deal, items = []) {
  const targetMenuItemId = deal?.target_menu_item_id || null;
  const targetCategoryId = deal?.target_category_id || null;

  if (targetMenuItemId) {
    const matchingQuantity = items
      .filter(
        (item) =>
          String(getItemMenuItemId(item) || '') ===
          String(targetMenuItemId)
      )
      .reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );

    if (String(deal?.discount_type || '').toLowerCase() === 'bogo') {
  const buyQuantity = Number(deal?.buy_quantity || 1);
  const getQuantity = Number(deal?.get_quantity || 1);

  return matchingQuantity >= buyQuantity + getQuantity;
}

    return matchingQuantity >= 1;
  }

  if (targetCategoryId) {
    return items.some(
      (item) =>
        String(getItemCategoryId(item) || '') ===
        String(targetCategoryId)
    );
  }

  return true;
}

function CustomerSuccessOverlay({ show, onContinue }) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, index) => ({
        id: index,
        left: `${12 + Math.random() * 76}%`,
        top: `${18 + Math.random() * 58}%`,
        delay: Math.random() * 1.1,
        duration: 1.1 + Math.random() * 1.1,
        size: 4 + Math.random() * 5,
      })),
    []
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/82 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onContinue}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.24),rgba(0,0,0,0.88)_64%)]" />

          <div className="absolute left-1/2 top-1/2">
            {CONFETTI.map((piece) => (
              <motion.span
                key={piece.id}
                className="absolute rounded-sm"
                style={{
                  width: piece.size,
                  height: piece.size * 1.75,
                  backgroundColor: piece.color,
                  boxShadow: `0 0 18px ${piece.color}`,
                }}
                initial={{ x: 0, y: 0, scale: 0, rotate: piece.rotate, opacity: 0 }}
                animate={{
                  x: [0, piece.x, piece.x * 1.08],
                  y: [0, piece.y, piece.y + 80],
                  scale: [0, 1.3, 0.85],
                  rotate: piece.rotate + 720,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  repeat: Infinity,
                  repeatDelay: 1.25,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {sparkles.map((spark) => (
            <motion.span
              key={spark.id}
              className="absolute rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,1)]"
              style={{
                left: spark.left,
                top: spark.top,
                width: spark.size,
                height: spark.size,
              }}
              animate={{ scale: [0.2, 1.7, 0.2], opacity: [0.15, 1, 0.15] }}
              transition={{ duration: spark.duration, repeat: Infinity, delay: spark.delay }}
            />
          ))}

          <motion.div
            className="relative mx-5 w-[92vw] max-w-[405px] rounded-[2.4rem] border-2 border-emerald-400/90 bg-black/90 px-5 py-8 text-center shadow-[0_0_42px_rgba(34,197,94,0.9),0_0_110px_rgba(34,197,94,0.42)]"
            initial={{ scale: 0.72, y: 34, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 185, damping: 14 }}
          >
            <motion.div
              className="absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.38),rgba(0,0,0,0)_58%)]"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.7, repeat: Infinity }}
            />

            <motion.div
              className="absolute -inset-1 rounded-[2.5rem] border border-yellow-300/20"
              animate={{
                boxShadow: [
                  '0 0 18px rgba(34,197,94,0.55)',
                  '0 0 36px rgba(250,204,21,0.45)',
                  '0 0 18px rgba(34,197,94,0.55)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />

            <div className="relative z-10">
              <motion.div
                className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_38px_rgba(34,197,94,1),0_0_95px_rgba(34,197,94,0.9)]"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 230, damping: 11 }}
              >
                <CheckCircle className="h-16 w-16 text-white" />
              </motion.div>

              <motion.h2
                className="text-[3.25rem] leading-none font-display font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(34,197,94,1)]"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.32 }}
              >
                Completed!
              </motion.h2>

              <motion.p
                className="mt-4 text-[1.75rem] leading-tight font-display font-black text-yellow-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.95)]"
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.48 }}
              >
                Points on the Way!
              </motion.p>

              <motion.div
                className="mx-auto mt-5 text-5xl text-yellow-300 drop-shadow-[0_0_22px_rgba(250,204,21,1)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.15, 1], opacity: 1 }}
                transition={{ delay: 0.65, duration: 0.45 }}
              >
                ♡
              </motion.div>

              <motion.p
                className="mt-7 text-base font-semibold text-white/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ delay: 1, duration: 1.6, repeat: Infinity }}
              >
                Tap anywhere to continue
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function CartSheet() {
  const navigate = useNavigate();
  const { data: customerProfile, isLoading } = useCustomerProfile();

  const { cart, removeFromCart, updateQuantity, clearCart } = useCart(
    customerProfile?.id
  );

  const [isOpen, setIsOpen] = useState(false);
  const [removingDealId, setRemovingDealId] = useState(null);
  const [removingRewardId, setRemovingRewardId] = useState(null);
  const [checkoutQrValue, setCheckoutQrValue] = useState('');
  const [checkoutCode, setCheckoutCode] = useState('');
  const [checkoutStartedAt, setCheckoutStartedAt] = useState('');
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [waitingForCompletion, setWaitingForCompletion] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const creatingRef = useRef(false);
  const completedRef = useRef(false);

  const { data: restaurantSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['cartRestaurantSettings', RESTAURANT_ID],
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('points_per_dollar, reward_rounding')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (error) throw error;
      return data || { points_per_dollar: 1, reward_rounding: 'down' };
    },
  });

  const customerCode =
    customerProfile?.customer_id_code ||
    customerProfile?.customer_code ||
    'PIT-12345';

  const customerId = customerProfile?.id || null;
  const checkoutCustomerId = customerId || customerCode || 'guest-customer';

  const { data: pendingDeals = [], refetch: refetchPendingDeals } = useQuery({
    queryKey: ['customerCheckoutDealsForCart', RESTAURANT_ID, checkoutCustomerId, customerCode],
    enabled: !!checkoutCustomerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_checkout_deals')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending')
        .or(`customer_id.eq.${checkoutCustomerId},customer_code.eq.${customerCode}`)
        .order('created_at', { ascending: false });

      if (error) return [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: pendingRewards = [], refetch: refetchPendingRewards } = useQuery({
    queryKey: ['customerCheckoutRewardsForCart', RESTAURANT_ID, checkoutCustomerId, customerCode],
    enabled: !!checkoutCustomerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_checkout_rewards')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending')
        .or(`customer_id.eq.${checkoutCustomerId},customer_code.eq.${customerCode}`)
        .order('created_at', { ascending: false });

      if (error) return [];

      const checkoutRewards = Array.isArray(data) ? data : [];
      const rewardIds = checkoutRewards
        .map((reward) => reward.reward_id)
        .filter(Boolean);

      if (rewardIds.length === 0) return checkoutRewards;

      const { data: rewardDetails, error: rewardDetailsError } = await supabase
        .from('rewards')
        .select('id, reward_type, target_menu_item_id, target_category_id, discount_type, discount_value')
        .eq('restaurant_id', RESTAURANT_ID)
        .in('id', rewardIds);

      if (rewardDetailsError) return checkoutRewards;

      const rewardDetailsById = new Map(
        (rewardDetails || []).map((reward) => [String(reward.id), reward])
      );

      return checkoutRewards.map((checkoutReward) => {
        const rewardDetail = rewardDetailsById.get(String(checkoutReward.reward_id));

        return {
          ...checkoutReward,
          reward_type: checkoutReward.reward_type || rewardDetail?.reward_type || 'points_reward',
          target_menu_item_id:
            checkoutReward.target_menu_item_id || rewardDetail?.target_menu_item_id || null,
          target_category_id:
            checkoutReward.target_category_id || rewardDetail?.target_category_id || null,
          discount_type:
            checkoutReward.discount_type || rewardDetail?.discount_type || null,
          discount_value:
            checkoutReward.discount_value ?? rewardDetail?.discount_value ?? 0,
        };
      });
    },
  });

  const cartItems = cart?.items || [];
  const cartItemCount = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const pendingDealCount = pendingDeals.length;
  const pendingRewardCount = pendingRewards.length;
  const displayCount = cartItemCount + pendingDealCount + pendingRewardCount;

  const taxRate = TAX_RATE;
  const pointsPerDollar = Number(restaurantSettings?.points_per_dollar || 1);
  const rewardRounding = restaurantSettings?.reward_rounding === 'up' ? 'up' : 'down';

const pricingCoupon = pendingDeals[0]
  ? {
      ...pendingDeals[0],
      applyTo: pendingDeals[0].target_menu_item_id
  ? 'menu_item'
  : pendingDeals[0].target_category_id
  ? 'category'
  : pendingDeals[0].apply_to || 'entire_order',
      targetMenuItemId: pendingDeals[0].target_menu_item_id || null,
      targetCategoryId: pendingDeals[0].target_category_id || null,
      buy_quantity: Number(pendingDeals[0].buy_quantity || 1),
get_quantity: Number(pendingDeals[0].get_quantity || 1),

// Keep camelCase too for compatibility with other code
buyQuantity: Number(pendingDeals[0].buy_quantity || 1),
getQuantity: Number(pendingDeals[0].get_quantity || 1),
    }
  : null;

  const pricingRewards = pendingRewards.map((reward) => ({
    ...reward,
    rewardType: reward.reward_type || 'points_reward',
    discountType: reward.discount_type || '',
    discountValue: Number(reward.discount_value || 0),
    targetMenuItemId: reward.target_menu_item_id || null,
    targetCategoryId: reward.target_category_id || null,
  }));

  const checkoutTotals = useMemo(
    () =>
      calculateCheckoutTotals({
        items: cartItems,
        coupon: pricingCoupon,
        rewards: pricingRewards,
        taxRate,
        pointsPerDollar,
        rewardRounding,
      }),
    [
  cartItems,
  pricingCoupon,
  pricingRewards,
  taxRate,
  pointsPerDollar,
  rewardRounding,
]
  );

  const subtotal = checkoutTotals.subtotal;
  const discountAmount = checkoutTotals.discountAmount;
  const couponDiscountAmount = checkoutTotals.couponDiscountAmount || 0;
  const rewardDiscountAmount = checkoutTotals.rewardDiscountAmount || 0;
  const taxableAmount = checkoutTotals.taxableAmount;
  const taxAmount = checkoutTotals.taxAmount;
  const total = checkoutTotals.total;
  const pointsToEarn = checkoutTotals.pointsToEarn;
  const minimumOrderAmount = checkoutTotals.minimumOrderAmount || 0;
  const minimumOrderRemaining = checkoutTotals.minimumOrderRemaining || 0;
  const couponMinimumNotMet = checkoutTotals.couponMinimumNotMet || false;


  const unappliedRewardIds = useMemo(() => {
    return pendingRewards
      .filter(
        (reward) =>
          rewardNeedsMatchingCartItem(reward) &&
          !rewardHasMatchingCartItem(reward, cartItems)
      )
      .map((reward) => reward.id);
  }, [pendingRewards, cartItems]);

  const hasUnappliedRewards = unappliedRewardIds.length > 0;

const unappliedDealIds = useMemo(() => {
  return pendingDeals
    .filter(
      (deal) =>
        dealNeedsMatchingCartItem(deal) &&
        !dealHasMatchingCartItem(deal, cartItems)
    )
    .map((deal) => deal.id);
}, [pendingDeals, cartItems]);

const hasUnappliedDeals = unappliedDealIds.length > 0;
const hasBlockedCheckoutRequirements =
  hasUnappliedRewards || hasUnappliedDeals || couponMinimumNotMet;

  const customerName =
    customerProfile?.full_name || customerProfile?.name || 'Customer';

  const checkoutItems = cartItems.map((item) => ({
    id: item.menu_item_id || item.id || null,
    menu_item_id: item.menu_item_id || item.id || null,
    cart_item_key: item.cart_item_key || null,
    name: getCartItemDisplayName(item),
    base_name: item.name || 'Item',
    selected_size: item.selected_size || null,
    selected_size_id: item.selected_size_id || null,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    category: item.category || item.category_name || null,
    category_id: item.category_id || item.menu_category_id || null,
  }));

  const claimedCoupon = pendingDeals[0]
    ? {
        checkoutDealId: pendingDeals[0].id,
        promotionId: pendingDeals[0].promotion_id,
        title: pendingDeals[0].promotion_title || 'Coupon Added',
        promoCode: pendingDeals[0].promo_code || '',
        discountType: pendingDeals[0].discount_type || '',
        discountValue:
          pendingDeals[0].discount_value !== undefined
            ? Number(pendingDeals[0].discount_value)
            : null,
        minimumOrderAmount:
          pendingDeals[0].minimum_order_amount !== undefined
            ? Number(pendingDeals[0].minimum_order_amount)
            : pendingDeals[0].min_order_amount !== undefined
            ? Number(pendingDeals[0].min_order_amount)
            : null,
        applyTo: pendingDeals[0].target_menu_item_id
  ? 'menu_item'
  : pendingDeals[0].target_category_id
  ? 'category'
  : pendingDeals[0].apply_to || 'entire_order',
        targetMenuItemId:
          pendingDeals[0].target_menu_item_id ||
          pendingDeals[0].targetMenuItemId ||
          null,
        targetCategoryId:
          pendingDeals[0].target_category_id ||
          pendingDeals[0].targetCategoryId ||
          null,
        discountAmount,
        status: 'pending',
        buy_quantity: Number(pendingDeals[0].buy_quantity || 1),
get_quantity: Number(pendingDeals[0].get_quantity || 1),

buyQuantity: Number(pendingDeals[0].buy_quantity || 1),
getQuantity: Number(pendingDeals[0].get_quantity || 1),
      }
    : null;

  const claimedRewards = pendingRewards.map((reward) => ({
    checkoutRewardId: reward.id,
    rewardId: reward.reward_id,
    rewardName: reward.reward_name || 'Reward Added',
    rewardDescription: reward.reward_description || '',
    pointsRequired: Number(reward.points_required || 0),
    rewardType: reward.reward_type || 'points_reward',
    discountType: reward.discount_type || '',
    discountValue: Number(reward.discount_value || 0),
    targetMenuItemId: reward.target_menu_item_id || null,
    targetCategoryId: reward.target_category_id || null,
    discountAmount: Number(reward.reward_discount_amount || 0),
    status: 'pending',
  }));

  const hasCheckoutContent =
    cartItems.length > 0 || pendingDeals.length > 0 || pendingRewards.length > 0;

  const checkoutSignature = useMemo(
    () =>
      JSON.stringify({
        customerCode,
        cartItems: checkoutItems,
        pendingDeals: pendingDeals.map((d) => ({
          id: d.id,
          apply_to: d.apply_to || 'entire_order',
          target_menu_item_id: d.target_menu_item_id || null,
          target_category_id: d.target_category_id || null,
        })),
        pendingRewards: pendingRewards.map((r) => ({
          id: r.id,
          reward_id: r.reward_id,
          reward_type: r.reward_type || 'points_reward',
          target_menu_item_id: r.target_menu_item_id || null,
          target_category_id: r.target_category_id || null,
          discount_type: r.discount_type || null,
        })),
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponDiscountAmount: couponDiscountAmount.toFixed(2),
        rewardDiscountAmount: rewardDiscountAmount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        taxRate,
        pointsPerDollar,
        rewardRounding,
        pointsToEarn,
      }),
    [
      customerCode,
      checkoutItems,
      pendingDeals,
      pendingRewards,
      subtotal,
      discountAmount,
      couponDiscountAmount,
      rewardDiscountAmount,
      taxableAmount,
      taxAmount,
      total,
      taxRate,
      pointsPerDollar,
      rewardRounding,
      pointsToEarn,
    ]
  );

  const triggerCompletedOverlay = () => {
    if (completedRef.current) return;

    completedRef.current = true;

    // Close the cart sheet first so it cannot intercept taps or drag gestures.
    setWaitingForCompletion(false);
    setIsOpen(false);

    // Give the sheet one frame to close, then show the success overlay.
    requestAnimationFrame(() => {
      setShowSuccessOverlay(true);
    });
  };

  const checkSpecificCheckoutStatus = async (code) => {
    if (!code || completedRef.current) return;

    const { data, error } = await supabase
      .from('checkout_sessions')
      .select('status, checkout_code, completed_at')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('checkout_code', code)
      .maybeSingle();

    if (error) {
      console.error('Could not check checkout status:', error);
      return;
    }

    if (data?.status === 'completed') {
      triggerCompletedOverlay();
    }
  };

  const checkLatestCompletedCheckout = async () => {
    if (!waitingForCompletion || completedRef.current || !customerCode) return;

    let query = supabase
      .from('checkout_sessions')
      .select('id, checkout_code, status, completed_at, created_at')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('customer_code', customerCode)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);

    if (checkoutStartedAt) {
      query = query.gte('created_at', checkoutStartedAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Could not check latest completed checkout:', error);
      return;
    }

    const completedCheckout = Array.isArray(data) ? data[0] : null;

    if (!completedCheckout) return;

    if (!checkoutCode || completedCheckout.checkout_code === checkoutCode) {
      triggerCompletedOverlay();
    }
  };

  const createCheckoutQr = async () => {
    if (!hasCheckoutContent || creatingRef.current || !restaurantSettings) return;

    creatingRef.current = true;
    setCreatingCheckout(true);
    completedRef.current = false;
    setShowSuccessOverlay(false);

    try {
      const now = new Date().toISOString();
      const newCheckoutCode = makeCheckoutCode();

      const checkoutSession = {
        restaurant_id: RESTAURANT_ID,
        checkout_code: newCheckoutCode,
        customer_code: customerCode,
        customer_name: customerName,
        subtotal: Number(subtotal.toFixed(2)),
        tax_amount: Number(taxAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
        points_to_earn: pointsToEarn,
        items: checkoutItems,
        claimed_coupon: claimedCoupon,
        claimed_rewards: claimedRewards,
        status: 'pending',
      };

      const { error } = await supabase
        .from('checkout_sessions')
        .insert([checkoutSession]);

      if (error) throw error;

      setCheckoutStartedAt(now);
      setCheckoutCode(newCheckoutCode);
      setCheckoutQrValue(`PS-CHECKOUT|${newCheckoutCode}`);
      setWaitingForCompletion(true);
    } catch (error) {
      console.error('Could not create checkout QR:', error);
      toast.error(error.message || 'Could not create checkout QR.');
    } finally {
      creatingRef.current = false;
      setCreatingCheckout(false);
    }
  };

  useEffect(() => {
    if (waitingForCompletion || completedRef.current) return;

    setCheckoutQrValue('');
    setCheckoutCode('');
    setCheckoutStartedAt('');
    completedRef.current = false;
  }, [checkoutSignature, waitingForCompletion]);

  useEffect(() => {
    if (!isOpen) return;
    if (!hasCheckoutContent) return;
    if (checkoutQrValue) return;
    if (settingsLoading || !restaurantSettings) return;
    if (hasBlockedCheckoutRequirements) return;

    createCheckoutQr();
  }, [
    isOpen,
    hasCheckoutContent,
    checkoutQrValue,
    checkoutSignature,
    settingsLoading,
    restaurantSettings,
    hasBlockedCheckoutRequirements,
  ]);

  useEffect(() => {
    if (!waitingForCompletion) return;

    checkSpecificCheckoutStatus(checkoutCode);
    checkLatestCompletedCheckout();

    const interval = setInterval(() => {
      checkSpecificCheckoutStatus(checkoutCode);
      checkLatestCompletedCheckout();
    }, 1200);

    return () => clearInterval(interval);
  }, [waitingForCompletion, checkoutCode, checkoutStartedAt, customerCode]);

  useEffect(() => {
    if (!customerCode || !waitingForCompletion) return;

    const realtimeFilter = checkoutCode
      ? `checkout_code=eq.${checkoutCode}`
      : `customer_code=eq.${customerCode}`;

    const channel = supabase
      .channel(`checkout-completed-${checkoutCode || customerCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_sessions',
          filter: realtimeFilter,
        },
        (payload) => {
          const updated = payload?.new;

          if (updated?.status !== 'completed') return;
          if (checkoutCode && updated?.checkout_code !== checkoutCode) return;

          if (!checkoutCode && checkoutStartedAt && updated?.created_at) {
            const updatedCreatedAt = new Date(updated.created_at).getTime();
            const startedAt = new Date(checkoutStartedAt).getTime();

            if (updatedCreatedAt < startedAt) return;
          }

          triggerCompletedOverlay();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerCode, checkoutCode, waitingForCompletion, checkoutStartedAt]);

  useEffect(() => {
    const handleCheckoutUpdate = () => {
      refetchPendingDeals();
      refetchPendingRewards();

      if (!waitingForCompletion && !completedRef.current) {
        setCheckoutQrValue('');
        setCheckoutCode('');
        setCheckoutStartedAt('');
      }
    };

    window.addEventListener('pitstop_checkout_deals_updated', handleCheckoutUpdate);
    window.addEventListener('pitstop_checkout_rewards_updated', handleCheckoutUpdate);

    return () => {
      window.removeEventListener('pitstop_checkout_deals_updated', handleCheckoutUpdate);
      window.removeEventListener('pitstop_checkout_rewards_updated', handleCheckoutUpdate);
    };
  }, [refetchPendingDeals, refetchPendingRewards, waitingForCompletion]);

  if (isLoading || settingsLoading || !customerProfile) return null;

  const resetActiveCheckoutSession = () => {
    setCheckoutQrValue('');
    setCheckoutCode('');
    setCheckoutStartedAt('');
    setWaitingForCompletion(false);
    completedRef.current = false;
  };

  const handleRemoveDeal = async (deal) => {
    setRemovingDealId(deal.id);
    resetActiveCheckoutSession();

    try {
      const { error } = await supabase
        .from('customer_checkout_deals')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: 'Removed from customer cart.',
        })
        .eq('id', deal.id)
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending');

      if (error) throw error;

      await refetchPendingDeals();
      window.dispatchEvent(new Event('pitstop_checkout_deals_updated'));
      toast.success('Coupon removed.');
    } catch (error) {
      toast.error(error.message || 'Could not remove coupon.');
    } finally {
      setRemovingDealId(null);
    }
  };

  const handleRemoveReward = async (reward) => {
    setRemovingRewardId(reward.id);
    resetActiveCheckoutSession();

    try {
      const pointsToRefund = Number(reward.points_required || 0);

      const { data: customer, error: customerFetchError } = await supabase
        .from('customers')
        .select('points_balance')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode)
        .maybeSingle();

      if (customerFetchError) throw customerFetchError;

      const currentBalance = Number(customer?.points_balance || 0);
      const newBalance = currentBalance + pointsToRefund;

      const { error: rewardUpdateError } = await supabase
        .from('customer_checkout_rewards')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: 'Removed from customer cart. Points refunded.',
        })
        .eq('id', reward.id)
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending');

      if (rewardUpdateError) throw rewardUpdateError;

      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({ points_balance: newBalance })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode);

      if (customerUpdateError) throw customerUpdateError;

      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_code: customerCode,
            transaction_type: 'refund',
            points_amount: pointsToRefund,
            note: `Refunded reward: ${reward.reward_name || 'Reward'}`,
            employee_name: null,
          },
        ]);

      if (transactionError) throw transactionError;

      await refetchPendingRewards();
      window.dispatchEvent(new Event('pitstop_checkout_rewards_updated'));
      toast.success('Reward removed and points refunded.');
    } catch (error) {
      toast.error(error.message || 'Could not remove reward.');
    } finally {
      setRemovingRewardId(null);
    }
  };

  const handleClearCart = () => {
    clearCart();
    resetActiveCheckoutSession();
    toast.success('Cart cleared.');
  };

  const handleSuccessContinue = () => {
    clearCart();
    setCheckoutQrValue('');
    setCheckoutCode('');
    setCheckoutStartedAt('');
    setWaitingForCompletion(false);
    setShowSuccessOverlay(false);
    setIsOpen(false);
    completedRef.current = false;

    // Navigate home after the overlay is tapped.
    navigate('/', { replace: true });
  };

  return (
    <>
      <CustomerSuccessOverlay
        show={showSuccessOverlay}
        onContinue={handleSuccessContinue}
      />

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);

          if (open && !waitingForCompletion && !completedRef.current) {
            refetchPendingDeals();
            refetchPendingRewards();
            setCheckoutQrValue('');
            setCheckoutCode('');
            setCheckoutStartedAt('');
          }
        }}
      >
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="w-5 h-5" />

            {displayCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs">
                {displayCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in your order
              {pendingDealCount > 0
                ? ` • ${pendingDealCount} coupon${pendingDealCount === 1 ? '' : 's'} added`
                : ''}
              {pendingRewardCount > 0
                ? ` • ${pendingRewardCount} reward${pendingRewardCount === 1 ? '' : 's'} added`
                : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {!hasCheckoutContent ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={
                      item.cart_item_key ||
                      `${item.menu_item_id}-${item.selected_size_id || 'regular'}`
                    }
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{getCartItemDisplayName(item)}</p>

                      {item.selected_size && (
                        <p className="text-xs text-muted-foreground">
                          Size: {item.selected_size}
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground">
                        ${Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => {
                          resetActiveCheckoutSession();
                          updateQuantity({
                            cartItemKey: item.cart_item_key,
                            quantity: Number(item.quantity || 0) - 1,
                          });
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>

                      <span className="w-8 text-center text-sm">{item.quantity}</span>

                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => {
                          resetActiveCheckoutSession();
                          updateQuantity({
                            cartItemKey: item.cart_item_key,
                            quantity: Number(item.quantity || 0) + 1,
                          });
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          resetActiveCheckoutSession();
                          removeFromCart(item.cart_item_key);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {pendingDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-xl border-2 border-primary/50 bg-primary/10 p-4 relative"
                  >
                    <button
                      type="button"
                      aria-label="Remove coupon"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-destructive"
                      disabled={removingDealId === deal.id}
                      onClick={() => {
                        resetActiveCheckoutSession();
                        handleRemoveDeal(deal);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 pr-10">
                      <Ticket className="w-5 h-5 text-primary" />
                      <p className="text-lg font-display font-bold text-primary">
                        COUPON ADDED
                      </p>
                    </div>

                    <p className="mt-2 font-bold pr-10">
                      {deal.promotion_title || 'Promotion'}
                    </p>

                    <p className="text-sm text-muted-foreground mt-1 pr-10">
                      {deal.promo_code ? `Code: ${deal.promo_code} • ` : ''}
                      {getDiscountLabel(deal)}
                    </p>

                    {couponMinimumNotMet && deal.id === pendingDeals[0]?.id && (
                      <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 pr-10">
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                          Minimum order of ${minimumOrderAmount.toFixed(2)} required.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add ${minimumOrderRemaining.toFixed(2)} more to use this coupon.
                        </p>
                      </div>
                    )}
                    {unappliedDealIds.includes(deal.id) && (
  <RewardRequirementCard
    type="deal"
    deal={deal}
    restaurantId={RESTAURANT_ID}
    cartItems={cartItems}
    onAdded={async () => {
      resetActiveCheckoutSession();
      await refetchPendingDeals();
    }}
  />
)}
                  </div>
                ))}

                {pendingRewards.map((reward) => {
                  const rewardNotApplied = unappliedRewardIds.includes(reward.id);

                  return (
                    <div
                      key={reward.id}
                      className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 relative"
                    >
                    <button
                      type="button"
                      aria-label="Remove reward"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-destructive"
                      disabled={removingRewardId === reward.id}
                      onClick={() => {
                        resetActiveCheckoutSession();
                        handleRemoveReward(reward);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 pr-10">
                      <Gift className="w-5 h-5 text-emerald-500" />
                      <p className="text-lg font-display font-bold text-emerald-500">
                        REWARD ADDED
                      </p>
                    </div>

                    <p className="mt-2 font-bold pr-10">
                      {reward.reward_name || 'Reward'}
                    </p>

                    {reward.reward_description && (
                      <p className="text-sm text-muted-foreground mt-1 pr-10">
                        {reward.reward_description}
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground mt-1 pr-10">
                      {Number(reward.points_required || 0)} pts redeemed
                    </p>

                    {rewardNotApplied && (
                      <RewardRequirementCard
                        reward={reward}
                        restaurantId={RESTAURANT_ID}
                        cartItems={cartItems}
                        onAdded={async () => {
                          resetActiveCheckoutSession();
                          await refetchPendingRewards();
                        }}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasCheckoutContent && (
            <div className="mt-6 space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {couponMinimumNotMet && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                    <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                      Coupon not applied yet.
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Minimum order of ${minimumOrderAmount.toFixed(2)} required. Add ${minimumOrderRemaining.toFixed(2)} more.
                    </p>
                  </div>
                )}

                {discountAmount > 0 && (
                  <>
                    {couponDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-500 font-medium">
                        <span>Coupon Discount</span>
                        <span>-${couponDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {rewardDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-500 font-medium">
                        <span>Reward Discount</span>
                        <span>-${rewardDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discounted Subtotal</span>
                      <span>${taxableAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>

                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Final Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-primary font-medium">
                  <span>Points to earn</span>
                  <span>{pointsToEarn} pts</span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 font-semibold">
                  <QrCode className="w-4 h-4" />
                  Rewards Checkout QR
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  Show this QR code to an employee or admin to finish checkout.
                </p>

                {hasBlockedCheckoutRequirements ? (
  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-sm">
    <p className="font-semibold text-yellow-700 dark:text-yellow-300">
      Add the required reward/coupon item before checkout.
    </p>

    <p className="text-muted-foreground mt-1">
      Your QR code will appear after all rewards and coupons apply.
    </p>
  </div>
) : creatingCheckout && !checkoutQrValue ? (
  <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
    Preparing QR...
  </div>
) : checkoutQrValue ? (
  <>
    <div className="flex justify-center bg-white rounded-xl p-5">
      <QRCodeSVG
        value={checkoutQrValue}
        size={260}
        level="H"
        includeMargin
      />
    </div>

    <p className="text-xs text-muted-foreground mt-3">
      Checkout Code: {checkoutCode}
    </p>
  </>
) : (
  <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
    QR will appear automatically.
  </div>
)}
                

                {waitingForCompletion ? (
                  <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <p className="text-sm font-semibold text-emerald-500">
                      Waiting for employee/admin to complete checkout...
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">
                    Employee/Admin will scan this and tap Complete to award points,
                    confirm coupons, and confirm rewards.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClearCart}
                  disabled={waitingForCompletion}
                >
                  Clear Cart
                </Button>

                <Button className="w-full" disabled>
                  {waitingForCompletion ? 'Waiting...' : 'Show QR'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}