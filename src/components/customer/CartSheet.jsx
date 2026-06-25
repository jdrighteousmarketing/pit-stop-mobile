import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Ticket,
  X,
  Gift,
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

const RESTAURANT_ID = 'pit_stop_mobile';

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

export default function CartSheet() {
  const { data: customerProfile, isLoading } = useCustomerProfile();

  const { cart, removeFromCart, updateQuantity, clearCart } = useCart(
    customerProfile?.id
  );

  const [isOpen, setIsOpen] = useState(false);
  const [removingDealId, setRemovingDealId] = useState(null);
  const [removingRewardId, setRemovingRewardId] = useState(null);
  const [checkoutQrValue, setCheckoutQrValue] = useState('');
  const [checkoutCode, setCheckoutCode] = useState('');
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const creatingRef = useRef(false);

  const customerId = customerProfile?.id || null;

  const customerCode =
    customerProfile?.customer_id_code ||
    customerProfile?.customer_code ||
    'PIT-12345';

  const checkoutCustomerId = customerId || customerCode || 'guest-customer';

  const { data: pendingDeals = [], refetch: refetchPendingDeals } = useQuery({
    queryKey: [
      'customerCheckoutDealsForCart',
      RESTAURANT_ID,
      checkoutCustomerId,
      customerCode,
    ],
    enabled: !!checkoutCustomerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_checkout_deals')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending')
        .or(
          `customer_id.eq.${checkoutCustomerId},customer_code.eq.${customerCode}`
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load pending checkout deals:', error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    },
  });

  const { data: pendingRewards = [], refetch: refetchPendingRewards } = useQuery({
    queryKey: [
      'customerCheckoutRewardsForCart',
      RESTAURANT_ID,
      checkoutCustomerId,
      customerCode,
    ],
    enabled: !!checkoutCustomerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_checkout_rewards')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending')
        .or(
          `customer_id.eq.${checkoutCustomerId},customer_code.eq.${customerCode}`
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load pending checkout rewards:', error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    },
  });

  const businessSettings = useMemo(() => {
    const saved =
      localStorage.getItem('businessSettings') ||
      localStorage.getItem('pitstop_business_settings');

    if (!saved) return { taxRate: 6, pointsPerDollar: 1 };

    try {
      return JSON.parse(saved);
    } catch {
      return { taxRate: 6, pointsPerDollar: 1 };
    }
  }, []);

  const cartItems = cart?.items || [];

  const cartItemCount = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const pendingDealCount = pendingDeals.length;
  const pendingRewardCount = pendingRewards.length;
  const displayCount = cartItemCount + pendingDealCount + pendingRewardCount;

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  const taxRate = Number(
    businessSettings.taxRate || businessSettings.tax_rate || 6
  );

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const pointsPerDollar = Number(
    businessSettings.pointsPerDollar ||
      businessSettings.points_per_dollar ||
      1
  );

  const pointsToEarn = Math.floor(total * pointsPerDollar);

  const customerName =
    customerProfile?.full_name || customerProfile?.name || 'Customer';

  const checkoutItems = cartItems.map((item) => ({
    id: item.menu_item_id || item.id || null,
    name: item.name || 'Item',
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    category: item.category || item.category_name || null,
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
        status: 'pending',
      }
    : null;

  const claimedRewards = pendingRewards.map((reward) => ({
  checkoutRewardId: reward.id,
  rewardId: reward.reward_id,
  rewardName: reward.reward_name || 'Reward Added',
  rewardDescription: reward.reward_description || '',
  pointsRequired: Number(reward.points_required || 0),
  status: 'pending',
}));

  const hasCheckoutContent =
    cartItems.length > 0 || pendingDeals.length > 0 || pendingRewards.length > 0;

  const checkoutSignature = useMemo(
    () =>
      JSON.stringify({
        customerCode,
        cartItems: checkoutItems,
        pendingDeals: pendingDeals.map((d) => d.id),
        pendingRewards: pendingRewards.map((r) => r.id),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        pointsToEarn,
      }),
    [
      customerCode,
      checkoutItems,
      pendingDeals,
      pendingRewards,
      subtotal,
      taxAmount,
      total,
      pointsToEarn,
    ]
  );

  const createCheckoutQr = async () => {
    if (!hasCheckoutContent || creatingRef.current) return;

    creatingRef.current = true;
    setCreatingCheckout(true);

    try {
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

      setCheckoutCode(newCheckoutCode);
      setCheckoutQrValue(`PS-CHECKOUT|${newCheckoutCode}`);
    } catch (error) {
      console.error('Could not create checkout QR:', error);
      toast.error(error.message || 'Could not create checkout QR.');
    } finally {
      creatingRef.current = false;
      setCreatingCheckout(false);
    }
  };

  useEffect(() => {
    setCheckoutQrValue('');
    setCheckoutCode('');
  }, [checkoutSignature]);

  useEffect(() => {
    if (!isOpen) return;
    if (!hasCheckoutContent) return;
    if (checkoutQrValue) return;

    createCheckoutQr();
  }, [isOpen, hasCheckoutContent, checkoutQrValue, checkoutSignature]);

  useEffect(() => {
    const handleCheckoutUpdate = () => {
      refetchPendingDeals();
      refetchPendingRewards();
      setCheckoutQrValue('');
      setCheckoutCode('');
    };

    window.addEventListener(
      'pitstop_checkout_deals_updated',
      handleCheckoutUpdate
    );

    window.addEventListener(
      'pitstop_checkout_rewards_updated',
      handleCheckoutUpdate
    );

    window.addEventListener('focus', handleCheckoutUpdate);

    return () => {
      window.removeEventListener(
        'pitstop_checkout_deals_updated',
        handleCheckoutUpdate
      );

      window.removeEventListener(
        'pitstop_checkout_rewards_updated',
        handleCheckoutUpdate
      );

      window.removeEventListener('focus', handleCheckoutUpdate);
    };
  }, [refetchPendingDeals, refetchPendingRewards]);

  if (isLoading || !customerProfile) return null;

  const handleRemoveDeal = async (deal) => {
    setRemovingDealId(deal.id);
    setCheckoutQrValue('');
    setCheckoutCode('');

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
      console.error('Could not remove coupon:', error);
      toast.error(error.message || 'Could not remove coupon.');
    } finally {
      setRemovingDealId(null);
    }
  };

  const handleRemoveReward = async (reward) => {
    setRemovingRewardId(reward.id);
    setCheckoutQrValue('');
    setCheckoutCode('');

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
        .update({
          points_balance: newBalance,
        })
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
      console.error('Could not remove reward:', error);
      toast.error(error.message || 'Could not remove reward.');
    } finally {
      setRemovingRewardId(null);
    }
  };

  const handleClearCart = () => {
    clearCart();
    setCheckoutQrValue('');
    setCheckoutCode('');
    toast.success('Cart cleared.');
  };

  const handleCompletePurchase = () => {
    clearCart();
    setCheckoutQrValue('');
    setCheckoutCode('');
    setIsOpen(false);

    toast.success(
      'Purchase completed. Points will be awarded by an employee/admin after scanning your QR code.'
    );
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

        if (open) {
          refetchPendingDeals();
          refetchPendingRewards();
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
            {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in your
            order
            {pendingDealCount > 0
              ? ` • ${pendingDealCount} coupon${
                  pendingDealCount === 1 ? '' : 's'
                } added`
              : ''}
            {pendingRewardCount > 0
              ? ` • ${pendingRewardCount} reward${
                  pendingRewardCount === 1 ? '' : 's'
                } added`
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
                  key={item.menu_item_id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(item.price || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity({
                          menuItemId: item.menu_item_id,
                          quantity: Number(item.quantity || 0) - 1,
                        })
                      }
                    >
                      <Minus className="w-3 h-3" />
                    </Button>

                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>

                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity({
                          menuItemId: item.menu_item_id,
                          quantity: Number(item.quantity || 0) + 1,
                        })
                      }
                    >
                      <Plus className="w-3 h-3" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.menu_item_id)}
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
                    onClick={() => handleRemoveDeal(deal)}
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

                  {deal.notes && (
                    <p className="text-xs text-muted-foreground mt-1 pr-10">
                      {deal.notes}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2 pr-10">
                    Show this coupon at checkout. Employee/admin will confirm
                    redemption after scanning your QR code.
                  </p>
                </div>
              ))}

              {pendingRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 relative"
                >
                  <button
                    type="button"
                    aria-label="Remove reward"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-destructive"
                    disabled={removingRewardId === reward.id}
                    onClick={() => handleRemoveReward(reward)}
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

                  <p className="text-xs text-muted-foreground mt-2 pr-10">
                    Status: Pending Redemption. Employee/admin will confirm this
                    reward after scanning your QR code.
                  </p>
                </div>
              ))}
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

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
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
                Show this QR code to an employee or admin before tapping
                Complete Purchase.
              </p>

              {creatingCheckout && !checkoutQrValue ? (
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

              <p className="text-xs text-muted-foreground mt-3">
                Employee/Admin will scan this and tap Complete to award points,
                confirm coupons, and confirm rewards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearCart}
              >
                Clear Cart
              </Button>

              <Button className="w-full" onClick={handleCompletePurchase}>
                Complete Purchase
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}