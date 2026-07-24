// @ts-nocheck
import { restaurantConfig } from '@/config/restaurantConfig';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, CheckCircle, Ticket, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentStaff } from '@/lib/currentStaff';
import { calculateCheckoutTotals } from "@/components/businessInsights/utils/checkoutPricing";

const RESTAURANT_ID = restaurantConfig.id;

function money(value) {
  return Number(value || 0).toFixed(2);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function getDiscountLabel(coupon) {
  if (!coupon) return 'Special Offer';
  const discountType = coupon.discountType || coupon.discount_type;
  const discountValue = coupon.discountValue ?? coupon.discount_value;

  if (discountType === 'percentage') return `${discountValue || 0}% Off`;
  if (discountType === 'fixed') return `$${discountValue || 0} Off`;
  if (discountType === 'bogo') return 'BOGO';
  if (discountType === 'points') return `${discountValue || 2}X Points`;
  if (discountType === 'free_item') return 'Free Item';
  return 'Special Offer';
}

function normalizeRewards(claimedReward) {
  if (!claimedReward) return [];
  if (Array.isArray(claimedReward)) return claimedReward;
  return [claimedReward];
}

function getRewardName(reward) {
  return (
    reward?.rewardName ||
    reward?.reward_name ||
    reward?.name ||
    reward?.title ||
    'Birthday Reward'
  );
}

function getRewardPointsRequired(reward) {
  return Number(
    reward?.pointsRequired ??
      reward?.points_required ??
      reward?.points ??
      0
  );
}

function isBirthdayReward(reward) {
  return (
    reward?.is_birthday_reward === true ||
    reward?.isBirthdayReward === true ||
    String(reward?.rewardType || reward?.reward_type || '')
      .toLowerCase()
      .includes('birthday') ||
    getRewardPointsRequired(reward) === 0
  );
}


function normalizeRoundingRule(value) {
  return value === 'up' ? 'up' : 'down';
}

function calculateRewardPoints(orderTotal, pointsPerDollar, roundingRule) {
  const rawPoints = Number(orderTotal || 0) * Number(pointsPerDollar || 1);

  if (!Number.isFinite(rawPoints) || rawPoints <= 0) {
    return 0;
  }

  return normalizeRoundingRule(roundingRule) === 'up'
    ? Math.ceil(rawPoints)
    : Math.floor(rawPoints);
}

function getRoundingLabel(roundingRule) {
  return normalizeRoundingRule(roundingRule) === 'up'
    ? 'Round Up'
    : 'Round Down';
}

export default function CheckoutReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [awarding, setAwarding] = useState(false);
    const [rewardSettings, setRewardSettings] = useState({
    pointsPerDollar: 1,
    maxPointsPerCustomer: 500,
    rewardRounding: null,
  });

  const [liveCoupon, setLiveCoupon] = useState(null);
  const [liveRewards, setLiveRewards] = useState([]);
  const [liveCheckoutLoading, setLiveCheckoutLoading] = useState(true);

  const checkoutData = useMemo(() => {
    const stateData = location.state?.checkoutData;
    if (stateData?.customerCode) return stateData;
    return safeJsonParse(localStorage.getItem('pitStopScannedCheckout'), {});
  }, [location.state]);

    const items = checkoutData.items || [];
  const customerCode = checkoutData.customerCode;

  const loadLiveCheckoutSelections = async () => {
    if (!customerCode) {
      return {
        coupon: null,
        rewards: [],
      };
    }

    const [
      { data: pendingDeals, error: dealsError },
      { data: pendingRewards, error: rewardsError },
    ] = await Promise.all([
      supabase
        .from('customer_checkout_deals')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('customer_checkout_rewards')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (dealsError) throw dealsError;
    if (rewardsError) throw rewardsError;

    const currentCoupon =
      Array.isArray(pendingDeals) && pendingDeals.length > 0
        ? pendingDeals[0]
        : null;

    const checkoutRewards = Array.isArray(pendingRewards)
  ? pendingRewards
  : [];

const rewardIds = checkoutRewards
  .map((reward) => reward.reward_id)
  .filter(Boolean);

let currentRewards = checkoutRewards;

if (rewardIds.length > 0) {
  const { data: rewardDetails, error: rewardDetailsError } = await supabase
    .from('rewards')
    .select(
      'id, reward_type, target_menu_item_id, target_category_id, discount_type, discount_value'
    )
    .eq('restaurant_id', RESTAURANT_ID)
    .in('id', rewardIds);

  if (rewardDetailsError) throw rewardDetailsError;

  const rewardDetailsById = new Map(
    (rewardDetails || []).map((reward) => [
      String(reward.id),
      reward,
    ])
  );

  currentRewards = checkoutRewards.map((checkoutReward) => {
    const rewardDetail = rewardDetailsById.get(
      String(checkoutReward.reward_id)
    );

    return {
      ...checkoutReward,

      reward_type:
        checkoutReward.reward_type ||
        rewardDetail?.reward_type ||
        'points_reward',

      target_menu_item_id:
        checkoutReward.target_menu_item_id ||
        rewardDetail?.target_menu_item_id ||
        null,

      target_category_id:
        checkoutReward.target_category_id ||
        rewardDetail?.target_category_id ||
        null,

      discount_type:
        checkoutReward.discount_type ||
        rewardDetail?.discount_type ||
        null,

      discount_value:
        checkoutReward.discount_value ??
        rewardDetail?.discount_value ??
        0,
    };
  });
}

return {
  coupon: currentCoupon,
  rewards: currentRewards,
};
  };

  useEffect(() => {
    let isMounted = true;

    const loadCurrentCheckout = async () => {
      setLiveCheckoutLoading(true);

      try {
        const currentSelections = await loadLiveCheckoutSelections();

        if (!isMounted) return;

        setLiveCoupon(currentSelections.coupon);
        setLiveRewards(currentSelections.rewards);
      } catch (error) {
        console.error('Could not load live checkout selections:', error);

        if (isMounted) {
          toast.error('Could not load the customer’s current coupon or rewards.');
          setLiveCoupon(null);
          setLiveRewards([]);
        }
      } finally {
        if (isMounted) {
          setLiveCheckoutLoading(false);
        }
      }
    };

    loadCurrentCheckout();

    return () => {
      isMounted = false;
    };
  }, [customerCode]);

  const claimedCoupon = liveCoupon;
const claimedRewards = liveRewards;

const pricingCoupon = claimedCoupon
  ? {
      ...claimedCoupon,

      discountType:
        claimedCoupon.discountType ||
        claimedCoupon.discount_type ||
        '',

      discountValue: Number(
        claimedCoupon.discountValue ??
        claimedCoupon.discount_value ??
        0
      ),

      applyTo:
        claimedCoupon.target_menu_item_id ||
        claimedCoupon.targetMenuItemId
          ? 'menu_item'
          : claimedCoupon.target_category_id ||
            claimedCoupon.targetCategoryId
            ? 'category'
            : claimedCoupon.applyTo ||
              claimedCoupon.apply_to ||
              'entire_order',

      targetMenuItemId:
        claimedCoupon.targetMenuItemId ||
        claimedCoupon.target_menu_item_id ||
        null,

      targetCategoryId:
        claimedCoupon.targetCategoryId ||
        claimedCoupon.target_category_id ||
        null,

      minimumOrderAmount: Number(
        claimedCoupon.minimumOrderAmount ??
        claimedCoupon.minimum_order_amount ??
        claimedCoupon.min_order_amount ??
        0
      ),

      buyQuantity: Number(
        claimedCoupon.buyQuantity ??
        claimedCoupon.buy_quantity ??
        1
      ),

      getQuantity: Number(
        claimedCoupon.getQuantity ??
        claimedCoupon.get_quantity ??
        1
      ),
    }
  : null;

const pricingRewards = claimedRewards.map((reward) => ({
  ...reward,

  rewardType:
    reward.rewardType ||
    reward.reward_type ||
    'points_reward',

  discountType:
    reward.discountType ||
    reward.discount_type ||
    '',

  discountValue: Number(
    reward.discountValue ??
    reward.discount_value ??
    0
  ),

  targetMenuItemId:
    reward.targetMenuItemId ||
    reward.target_menu_item_id ||
    null,

  targetCategoryId:
    reward.targetCategoryId ||
    reward.target_category_id ||
    null,
}));

  const checkoutTotals = calculateCheckoutTotals({
  items,
  coupon: pricingCoupon,
  rewards: pricingRewards,
  taxRate: 6,
  pointsPerDollar: rewardSettings.pointsPerDollar,
  rewardRounding: rewardSettings.rewardRounding || 'down',
});



  const checkoutSubtotal = Number(checkoutTotals.subtotal ?? checkoutData.subtotal ?? 0);
  const checkoutCouponDiscountAmount = Number(checkoutTotals.couponDiscountAmount || 0);
  const checkoutRewardDiscountAmount = Number(checkoutTotals.rewardDiscountAmount || 0);
  const checkoutDiscountAmount = Number(checkoutTotals.discountAmount || 0);
  const checkoutTaxableAmount = Number(checkoutTotals.taxableAmount ?? Math.max(checkoutSubtotal - checkoutDiscountAmount, 0));
  const checkoutTaxAmount = Number(checkoutTotals.taxAmount ?? checkoutData.taxAmount ?? checkoutData.tax_amount ?? 0);
  const checkoutTotal = Number(checkoutTotals.total ?? checkoutData.total ?? checkoutData.total_amount ?? 0);

  useEffect(() => {
    const loadRewardSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle();

        if (error) throw error;

        setRewardSettings({
          pointsPerDollar: Number(data?.points_per_dollar || 1),
          maxPointsPerCustomer: Number(data?.max_points_per_customer || 500),
          rewardRounding: normalizeRoundingRule(
            data?.reward_rounding || 'down'
          ),
        });
      } catch (error) {
        console.error(error);
        toast.error('Could not load reward settings. Using default rewards.');
      }
    };

    loadRewardSettings();
  }, []);

  const orderTotal = checkoutTotal;
  const settingsReady = rewardSettings.rewardRounding !== null;

const previewPointsToAward = settingsReady
  ? calculateRewardPoints(
      orderTotal,
      rewardSettings.pointsPerDollar,
      rewardSettings.rewardRounding
    )
  : null;

  const handleCompleteAward = async () => {
    setAwarding(true);

    try {
            const customerCode = checkoutData.customerCode;

      if (!customerCode) {
        toast.error('Missing customer code. Cannot award points.');
        return;
      }

      // Reload the customer's current selections immediately before checkout.
      // This prevents a removed or swapped coupon from being redeemed if the
      // customer changes the cart after the employee opens this screen.
      const currentSelections = await loadLiveCheckoutSelections();
      const currentCoupon = currentSelections.coupon;
      const currentRewards = currentSelections.rewards;

      setLiveCoupon(currentCoupon);
      setLiveRewards(currentRewards);

      const currentPricingCoupon = currentCoupon
  ? {
      ...currentCoupon,

      discountType:
        currentCoupon.discountType ||
        currentCoupon.discount_type ||
        '',

      discountValue: Number(
        currentCoupon.discountValue ??
        currentCoupon.discount_value ??
        0
      ),

      applyTo:
        currentCoupon.target_menu_item_id ||
        currentCoupon.targetMenuItemId
          ? 'menu_item'
          : currentCoupon.target_category_id ||
            currentCoupon.targetCategoryId
            ? 'category'
            : currentCoupon.applyTo ||
              currentCoupon.apply_to ||
              'entire_order',

      targetMenuItemId:
        currentCoupon.targetMenuItemId ||
        currentCoupon.target_menu_item_id ||
        null,

      targetCategoryId:
        currentCoupon.targetCategoryId ||
        currentCoupon.target_category_id ||
        null,

      minimumOrderAmount: Number(
        currentCoupon.minimumOrderAmount ??
        currentCoupon.minimum_order_amount ??
        currentCoupon.min_order_amount ??
        0
      ),

      buyQuantity: Number(
        currentCoupon.buyQuantity ??
        currentCoupon.buy_quantity ??
        1
      ),

      getQuantity: Number(
        currentCoupon.getQuantity ??
        currentCoupon.get_quantity ??
        1
      ),
    }
  : null;

const currentPricingRewards = currentRewards.map((reward) => ({
  ...reward,

  rewardType:
    reward.rewardType ||
    reward.reward_type ||
    'points_reward',

  discountType:
    reward.discountType ||
    reward.discount_type ||
    '',

  discountValue: Number(
    reward.discountValue ??
    reward.discount_value ??
    0
  ),

  targetMenuItemId:
    reward.targetMenuItemId ||
    reward.target_menu_item_id ||
    null,

  targetCategoryId:
    reward.targetCategoryId ||
    reward.target_category_id ||
    null,
}));

const currentCheckoutTotals = calculateCheckoutTotals({
  items,
  coupon: currentPricingCoupon,
  rewards: currentPricingRewards,
  taxRate: 6,
  pointsPerDollar: rewardSettings.pointsPerDollar,
  rewardRounding: rewardSettings.rewardRounding || 'down',
});

      const finalSubtotal = Number(
        currentCheckoutTotals.subtotal ?? checkoutData.subtotal ?? 0
      );

      const finalTaxAmount = Number(
        currentCheckoutTotals.taxAmount ??
          checkoutData.taxAmount ??
          checkoutData.tax_amount ??
          0
      );

      const finalOrderTotal = Number(
        currentCheckoutTotals.total ??
          checkoutData.total ??
          checkoutData.total_amount ??
          0
      );

      const { data: settings, error: settingsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (settingsError) throw settingsError;

      const pointsPerDollar = Number(settings?.points_per_dollar || 1);
      const maxPointsPerCustomer = Number(settings?.max_points_per_customer || 500);
      const rewardRounding = normalizeRoundingRule(
        settings?.reward_rounding || 'down'
      );

            const requestedPoints = calculateRewardPoints(
        finalOrderTotal,
        pointsPerDollar,
        rewardRounding
      );

      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode)
        .single();

      if (fetchError || !customer) {
        toast.error('Customer not found in Supabase.');
        return;
      }

      const currentBalance = Number(customer.points_balance || 0);
      const availableRoom = Math.max(maxPointsPerCustomer - currentBalance, 0);
      const actualPointsAwarded = Math.min(requestedPoints, availableRoom);

      const newPointsBalance = currentBalance + actualPointsAwarded;
      const newLifetimePoints = Number(customer.lifetime_points || 0) + actualPointsAwarded;
            const newLifetimeSpend =
        Number(customer.lifetime_spend || 0) + finalOrderTotal;
      const newVisitCount = Number(customer.visit_count || 0) + 1;
      const orderNumber = `ORD-${Date.now()}`;
      const completedAt = new Date().toISOString();

const completedDate = new Date(completedAt);

const [, birthdayMonth, birthdayDay] = String(customer.birthday || '')
  .split('-')
  .map(Number);

let birthdayYear = completedDate.getFullYear();

if (birthdayMonth && birthdayDay) {
  const completedDay = new Date(
    completedDate.getFullYear(),
    completedDate.getMonth(),
    completedDate.getDate()
  );

  const possibleYears = [
    completedDate.getFullYear() - 1,
    completedDate.getFullYear(),
    completedDate.getFullYear() + 1,
  ];

  const matchingBirthdayYear = possibleYears.find((year) => {
    const birthdayDate = new Date(
      year,
      birthdayMonth - 1,
      birthdayDay
    );

    if (
      Number.isNaN(birthdayDate.getTime()) ||
      birthdayDate.getMonth() !== birthdayMonth - 1 ||
      birthdayDate.getDate() !== birthdayDay
    ) {
      return false;
    }

    const windowStart = new Date(birthdayDate);
    windowStart.setDate(windowStart.getDate() - 15);

    const windowEnd = new Date(birthdayDate);
    windowEnd.setDate(windowEnd.getDate() + 15);

    return completedDay >= windowStart && completedDay <= windowEnd;
  });

  if (matchingBirthdayYear) {
    birthdayYear = matchingBirthdayYear;
  }
}

      const activeCheckoutCode =
        checkoutData.checkoutCode || checkoutData.checkout_code || null;

        const staffUser = await getCurrentStaff();

console.log('Current staff completing checkout:', staffUser);

      const completeCustomerCheckoutSession = async () => {
        const sessionUpdate = {
          status: 'completed',
          completed_at: completedAt,
          order_number: orderNumber,
          points_awarded: actualPointsAwarded,
        };

        if (activeCheckoutCode) {
          const { data: updatedSessions, error: checkoutSessionError } =
            await supabase
              .from('checkout_sessions')
              .update(sessionUpdate)
              .eq('restaurant_id', RESTAURANT_ID)
              .eq('checkout_code', activeCheckoutCode)
              .select('id');

          if (checkoutSessionError) throw checkoutSessionError;
          if (Array.isArray(updatedSessions) && updatedSessions.length > 0) return;
        }

        // Fallback for edge cases where the scanner/checkout data is missing
        // the exact checkout code. Complete the newest pending session for this
        // customer so the customer's phone receives the completion event.
        const { data: latestSessions, error: latestSessionError } = await supabase
          .from('checkout_sessions')
          .select('id')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('customer_code', customerCode)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestSessionError) throw latestSessionError;

        const latestSession = Array.isArray(latestSessions) ? latestSessions[0] : null;
        if (!latestSession?.id) return;

        const { error: fallbackCheckoutSessionError } = await supabase
          .from('checkout_sessions')
          .update(sessionUpdate)
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('id', latestSession.id);

        if (fallbackCheckoutSessionError) throw fallbackCheckoutSessionError;
      };

      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          points_balance: newPointsBalance,
          lifetime_points: newLifetimePoints,
          lifetime_spend: newLifetimeSpend,
          visit_count: newVisitCount,
        })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerCode);

      if (customerUpdateError) throw customerUpdateError;

      const { error: orderInsertError } = await supabase.from('orders').insert([
        {
          restaurant_id: RESTAURANT_ID,
          customer_code: customerCode,
          order_number: orderNumber,
          subtotal: finalSubtotal,
          tax_amount: finalTaxAmount,
          total_amount: finalOrderTotal,
          points_awarded: actualPointsAwarded,
          payment_method: 'outside_app',
          order_status: 'completed',
          employee_name:
  staffUser?.name ||
  staffUser?.email ||
  'Employee',
        },
      ]);

      if (orderInsertError) throw orderInsertError;

      if (items.length > 0) {
        const orderItems = items.map((item) => ({
          restaurant_id: RESTAURANT_ID,
          order_number: orderNumber,
          customer_code: customerCode,
          item_name: item.name || 'Item',
          category_name:
         item.categoryName ||
         item.category_name ||
         item.category ||
         null,
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.price || 0),
          total_price: Number(item.price || 0) * Number(item.quantity || 1),
        }));

        const { error: orderItemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (orderItemsError) throw orderItemsError;
      }


      if (actualPointsAwarded > 0) {
        const { error: pointsError } = await supabase
          .from('points_transactions')
          .insert([
            {
              restaurant_id: RESTAURANT_ID,
              customer_code: customerCode,
              order_number: orderNumber,
              transaction_type: 'earned',
              points_amount: actualPointsAwarded,
                            note: `Earned ${actualPointsAwarded} points from a $${money(finalOrderTotal)} purchase.`,
              employee_name: staffUser?.name || staffUser?.email || 'Employee',
              awarded_by_employee_id: staffUser?.id || null,
              awarded_by_employee_auth_id: staffUser?.auth_user_id || null,
              awarded_by_employee_name: staffUser?.name || 'Employee',
              awarded_by_employee_email: staffUser?.email || null,
            },
          ]);

        if (pointsError) throw pointsError;
      }

      // Complete the checkout session before coupon/reward cleanup so the
      // customer's phone always receives the success event, including
      // reward-only and birthday reward checkouts.
      await completeCustomerCheckoutSession();

            const checkoutDealId =
        currentCoupon?.checkoutDealId ||
        currentCoupon?.checkout_deal_id ||
        currentCoupon?.id;

      if (checkoutDealId) {
        const { error: couponError } = await supabase
          .from('customer_checkout_deals')
          .update({
            status: 'redeemed',
            redeemed_at: completedAt,
            notes: `Redeemed during order ${orderNumber}`,
          })
          .eq('id', checkoutDealId)
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('status', 'pending');

        if (couponError) throw couponError;
      }

      // Fallback: if the checkout data did not include the exact coupon id,
      // clear any pending checkout coupon for this customer so it disappears from the cart.
            if (!checkoutDealId && currentCoupon) {
        const { error: pendingCouponError } = await supabase
          .from('customer_checkout_deals')
          .update({
            status: 'redeemed',
            redeemed_at: completedAt,
            notes: `Redeemed during order ${orderNumber}`,
          })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('customer_code', customerCode)
          .eq('status', 'pending');

        if (pendingCouponError) throw pendingCouponError;
      }

            if (currentRewards.length > 0) {
        const rewardIds = currentRewards
          .map(
            (reward) =>
              reward.checkoutRewardId ||
              reward.checkout_reward_id ||
              reward.id
          )
          .filter(Boolean);

        if (rewardIds.length > 0) {
          const { error: rewardsError } = await supabase
            .from('customer_checkout_rewards')
            .update({
              status: 'redeemed',
              redeemed_at: completedAt,
              notes: `Redeemed during order ${orderNumber}`,
            })
            .in('id', rewardIds)
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('status', 'pending');

          if (rewardsError) throw rewardsError;

          const birthdayRewardsUsed = currentRewards.filter(isBirthdayReward);

if (birthdayRewardsUsed.length > 0) {
            

            const birthdayRedemptionRows = birthdayRewardsUsed.map((reward) => ({
              restaurant_id: RESTAURANT_ID,
              customer_id: customer.id || null,
              customer_code: customerCode,
              customer_name: customer.name || checkoutData.customerName || null,
              customer_email: customer.email || null,
              reward_name: getRewardName(reward),
              redeemed_by: staffUser?.name || staffUser?.email || 'Employee',
              redeemed_at: completedAt,
              birthday_year: birthdayYear,
            }));

            const { error: birthdayRedemptionError } = await supabase
              .from('birthday_reward_redemptions')
              .insert(birthdayRedemptionRows);

            if (birthdayRedemptionError) {
              console.warn('Birthday redemption history could not be saved:', birthdayRedemptionError);
            }
          }
        }
      }

      // Fallback: if the checkout data had rewards but did not include exact ids,
      // clear any pending checkout rewards for this customer so they disappear from the cart.
      if (
        currentRewards.length > 0 &&
        currentRewards.every(
          (reward) =>
            !reward.checkoutRewardId &&
            !reward.checkout_reward_id &&
            !reward.id
        )
      ) {
        const { error: pendingRewardsError } = await supabase
          .from('customer_checkout_rewards')
          .update({
            status: 'redeemed',
            redeemed_at: completedAt,
            notes: `Redeemed during order ${orderNumber}`,
          })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('customer_code', customerCode)
          .eq('status', 'pending');

        if (pendingRewardsError) throw pendingRewardsError;

        const birthdayRewardsUsed = currentRewards.filter(isBirthdayReward);

        if (birthdayRewardsUsed.length > 0) {

          const birthdayRedemptionRows = birthdayRewardsUsed.map((reward) => ({
            restaurant_id: RESTAURANT_ID,
            customer_id: customer.id || null,
            customer_code: customerCode,
            customer_name: customer.name || checkoutData.customerName || null,
            customer_email: customer.email || null,
            reward_name: getRewardName(reward),
            redeemed_by: staffUser?.name || staffUser?.email || 'Employee',
            redeemed_at: completedAt,
            birthday_year: birthdayYear,
          }));

          const { error: birthdayRedemptionError } = await supabase
            .from('birthday_reward_redemptions')
            .insert(birthdayRedemptionRows);

          if (birthdayRedemptionError) {
            console.warn('Birthday redemption history could not be saved:', birthdayRedemptionError);
          }
        }
      }

      // Checkout session was completed earlier so the customer success
      // overlay is triggered even if reward cleanup takes a moment.

      const savedUser = safeJsonParse(localStorage.getItem('pitstop_demo_user'), {});
      const savedCode = savedUser.customer_id_code || savedUser.customer_code;

      if (savedCode === customerCode) {
        localStorage.setItem(
          'pitstop_demo_user',
          JSON.stringify({
            ...savedUser,
            points_balance: newPointsBalance,
            lifetime_points: newLifetimePoints,
            total_points_earned: newLifetimePoints,
          })
        );
      }

      localStorage.removeItem('pitStopScannedCheckout');

      if (actualPointsAwarded < requestedPoints) {
        toast.success(
          `Customer reached the ${maxPointsPerCustomer} point limit. Awarded ${actualPointsAwarded} of ${requestedPoints} points.`
        );
      } else {
        toast.success(
          `Awarded ${actualPointsAwarded} points to ${checkoutData.customerName}!`
        );
      }

      navigate('/admin/scanner', { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to complete checkout.');
    } finally {
      setAwarding(false);
    }
  };

  if (!checkoutData.customerCode) {
    return (
      <div className="p-6">
        <p>No checkout found.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/scanner')}>
          Back to Scanner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-display font-bold">Checkout Found</h1>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div>
          <p className="font-bold">{checkoutData.customerName}</p>
          <p className="text-sm text-muted-foreground">
            Code: {checkoutData.customerCode}
          </p>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" />
            Items Purchased
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No menu items included. Coupon/reward-only checkout.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}× {item.name}</span>
                <span>${money(Number(item.price || 0) * Number(item.quantity || 1))}</span>
              </div>
            ))
          )}
        </div>

        {claimedCoupon && (
          <div className="rounded-xl border-2 border-primary/50 bg-primary/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              <p className="text-lg font-display font-bold text-primary">
                COUPON ADDED
              </p>
            </div>

            <p className="font-bold text-base">
              {claimedCoupon.title || claimedCoupon.promotion_title || 'Promotion'}
            </p>

            <p className="text-sm">
              <span className="font-semibold">Discount:</span>{' '}
              {getDiscountLabel(claimedCoupon)}
            </p>
          </div>
        )}

        {claimedRewards.length > 0 &&
          claimedRewards.map((reward, index) => (
            <div
              key={reward.checkoutRewardId || reward.checkout_reward_id || reward.id || index}
              className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-500" />
                <p className="text-lg font-display font-bold text-emerald-500">
                  REWARD ADDED
                </p>
              </div>

              <p className="font-bold text-base">
                {reward.rewardName || reward.reward_name || 'Reward'}
              </p>

              <p className="text-sm">
                <span className="font-semibold">Points Cost:</span>{' '}
                {reward.pointsRequired || reward.points_required || 0}
              </p>
            </div>
          ))}

        <div className="border-t border-border pt-3 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${money(checkoutSubtotal)}</span>
          </div>

          {checkoutDiscountAmount > 0 && (
            <>
              {checkoutCouponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-${money(checkoutCouponDiscountAmount)}</span>
                </div>
              )}

              {checkoutRewardDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-semibold">
                  <span>Reward Discount</span>
                  <span>-${money(checkoutRewardDiscountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Discounted Subtotal</span>
                <span>${money(checkoutTaxableAmount)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span>Tax</span>
            <span>${money(checkoutTaxAmount)}</span>
          </div>

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${money(orderTotal)}</span>
          </div>

          <div className="flex justify-between text-primary font-bold">
            <span>Points to Award</span>
           {settingsReady ? previewPointsToAward + ' pts' : 'Loading...'}
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {rewardSettings.pointsPerDollar} point(s) per $1 •{' '}
            {getRoundingLabel(rewardSettings.rewardRounding)}
          </p>
        </div>

        <button
          type="button"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={handleCompleteAward}
                    disabled={awarding || liveCheckoutLoading}
        >
          <CheckCircle className="w-4 h-4" />
                    {liveCheckoutLoading
            ? 'Loading Current Checkout...'
            : awarding
              ? 'Completing...'
              : 'Complete Checkout'}
        </button>
      </div>
    </div>
  );
}