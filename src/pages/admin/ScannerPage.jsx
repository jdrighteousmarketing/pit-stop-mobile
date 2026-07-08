import { restaurantConfig } from '@/config/restaurantConfig';
import { useState } from 'react';
import {
  QrCode,
  ScanLine,
  User,
  Trophy,
  DollarSign,
  Gift,
  History,
} from 'lucide-react';
import QRScanner from '@/components/admin/QRScanner';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

function decodePart(value, fallback = '') {
  try {
    return decodeURIComponent(value || fallback);
  } catch {
    return value || fallback;
  }
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function parseCouponText(couponText) {
  if (!couponText) return null;

  const firstCoupon = couponText.split(',').filter(Boolean)[0];
  if (!firstCoupon) return null;

  const [
    checkoutDealId,
    promotionId,
    title,
    promoCode,
    discountType,
    discountValue,
  ] = firstCoupon.split('~');

  if (!checkoutDealId || !promotionId) return null;

  return {
    checkoutDealId: String(checkoutDealId),
    promotionId: String(promotionId),
    title: decodePart(title, 'Coupon Added'),
    promoCode: decodePart(promoCode, ''),
    discountType: decodePart(discountType, ''),
    discountValue: discountValue ? Number(discountValue) : null,
    status: 'pending',
  };
}

function parseRewardText(rewardText) {
  if (!rewardText) return null;

  return rewardText
    .split(',')
    .filter(Boolean)
    .map((rewardChunk) => {
      const [
        checkoutRewardId,
        rewardId,
        rewardName,
        rewardDescription,
        pointsRequired,
      ] = rewardChunk.split('~');

      if (!checkoutRewardId || !rewardId) return null;

      return {
        checkoutRewardId: String(checkoutRewardId),
        rewardId: String(rewardId),
        rewardName: decodePart(rewardName, 'Reward Added'),
        rewardDescription: decodePart(rewardDescription, ''),
        pointsRequired: pointsRequired ? Number(pointsRequired) : 0,
        status: 'pending',
      };
    })
    .filter(Boolean);
}

function parseShortPitStopQR(code) {
  const raw = code?.toString().trim();

  if (!raw) {
    throw new Error('Empty QR code');
  }

  if (raw.startsWith('PS-CHECKOUT|')) {
    const [, checkoutCode] = raw.split('|');

    return {
      qrType: 'checkout_session',
      checkoutCode: decodePart(checkoutCode, ''),
    };
  }

  if (raw.startsWith('PS-CUSTOMER|')) {
    const [, customerCode] = raw.split('|');

    return {
      qrType: 'customer',
      customerCode: decodePart(customerCode, ''),
    };
  }

  if (/^PIT-\d+/i.test(raw)) {
    return {
      qrType: 'customer',
      customerCode: raw,
    };
  }

  if (raw.startsWith('PS|')) {
    const parts = raw.split('|');

    if (parts.length < 8) {
      throw new Error('Short QR code is missing information');
    }

    const [
      ,
      customerCode,
      customerName,
      subtotal,
      taxAmount,
      total,
      pointsToEarn,
      itemText,
      couponText,
      rewardText,
    ] = parts;

    const items = itemText
      ? itemText
          .split(',')
          .filter(Boolean)
          .map((itemChunk, index) => {
            const [name, quantity, price] = itemChunk.split('~');

            return {
              id: `qr_item_${index}`,
              name: decodePart(name, 'Item'),
              quantity: Number(quantity || 1),
              price: Number(price || 0),
            };
          })
      : [];

    return {
      qrType: 'checkout',
      customerCode: decodePart(customerCode, 'PIT-CUSTOMER'),
      customerName: decodePart(customerName, 'Customer'),
      subtotal: Number(subtotal || 0),
      taxAmount: Number(taxAmount || 0),
      total: Number(total || 0),
      pointsToEarn: Number(pointsToEarn || 0),
      items,
      claimedCoupon: parseCouponText(couponText),
      claimedReward: parseRewardText(rewardText),
    };
  }

  const parsed = JSON.parse(raw);

  if (parsed?.type === 'pitstop_reward_checkout') {
    return {
      qrType: 'checkout',
      customerCode: parsed.customerCode || parsed.customerId || 'PIT-CUSTOMER',
      customerName: parsed.customerName || 'Customer',
      customerEmail: parsed.customerEmail || '',
      subtotal: Number(parsed.subtotal || 0),
      taxRate: Number(parsed.taxRate || 0),
      taxAmount: Number(parsed.taxAmount || 0),
      total: Number(parsed.total || 0),
      pointsToEarn: Number(parsed.pointsToEarn || 0),
      items: parsed.items || [],
      claimedCoupon: parsed.claimedCoupon || null,
      claimedReward: Array.isArray(parsed.claimedReward)
        ? parsed.claimedReward
        : parsed.claimedReward
          ? [parsed.claimedReward]
          : [],
    };
  }

  if (parsed?.t === 'ps_checkout') {
    return {
      qrType: 'checkout',
      customerCode: parsed.code || parsed.cid || 'PIT-CUSTOMER',
      customerName: parsed.name || 'Customer',
      subtotal: Number(parsed.sub || 0),
      taxAmount: Number(parsed.tax || 0),
      total: Number(parsed.total || 0),
      pointsToEarn: Number(parsed.pts || 0),
      items: (parsed.items || []).map((item, index) => ({
        id: `qr_item_${index}`,
        name: item.n || 'Item',
        quantity: Number(item.q || 1),
        price: Number(item.p || 0),
      })),
      claimedCoupon: parsed.coupon || null,
      claimedReward: Array.isArray(parsed.reward)
        ? parsed.reward
        : parsed.reward
          ? [parsed.reward]
          : [],
    };
  }

  throw new Error('Unsupported QR format');
}

export default function ScannerPage() {
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [updatingPoints, setUpdatingPoints] = useState(false);

  const openScanner = () => {
    setCustomer(null);
    setScanning(false);

    setTimeout(() => {
      setScannerKey((prev) => prev + 1);
      setScanning(true);
    }, 150);
  };

  const closeScanner = () => {
    setScanning(false);
    setScannerKey((prev) => prev + 1);
  };

  const loadCustomerByCode = async (customerCode) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('customer_code', customerCode)
      .single();

    if (error || !data) {
      console.error(error);
      throw new Error('Customer not found');
    }

    return data;
  };

  const loadCheckoutSession = async (checkoutCode) => {
    const { data, error } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('checkout_code', checkoutCode)
      .in('status', ['pending', 'scanned'])
      .single();

    if (error || !data) {
      console.error(error);
      throw new Error('Checkout session not found');
    }

    await supabase
      .from('checkout_sessions')
      .update({
        scanned_at: new Date().toISOString(),
        status: 'scanned',
      })
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('checkout_code', checkoutCode);

    return {
      customerCode: data.customer_code,
      customerName: data.customer_name || 'Customer',
      subtotal: Number(data.subtotal || 0),
      taxAmount: Number(data.tax_amount || 0),
      total: Number(data.total || 0),
      pointsToEarn: Number(data.points_to_earn || 0),
      items: Array.isArray(data.items) ? data.items : [],
      claimedCoupon: data.claimed_coupon || null,
      claimedReward: Array.isArray(data.claimed_rewards)
        ? data.claimed_rewards
        : data.claimed_reward
          ? [data.claimed_reward]
          : [],
      checkoutCode: data.checkout_code,
      checkoutSessionId: data.id,
      scannedAt: new Date().toISOString(),
    };
  };

  const handleScan = async (code) => {
    closeScanner();
    setLoading(true);

    try {
      const parsed = parseShortPitStopQR(code);

      if (parsed.qrType === 'customer') {
        const foundCustomer = await loadCustomerByCode(parsed.customerCode);

        setCustomer(foundCustomer);
        toast.success('Customer rewards QR scanned!');
        return;
      }

      if (parsed.qrType === 'checkout_session') {
        const checkoutData = await loadCheckoutSession(parsed.checkoutCode);

        toast.success('Checkout QR scanned successfully!');

        navigate('/admin/checkout-review', {
          state: { checkoutData },
          replace: true,
        });

        return;
      }

      if (parsed.qrType === 'checkout') {
        const checkoutData = {
          ...parsed,
          scannedAt: new Date().toISOString(),
        };

        toast.success('Checkout QR scanned successfully!');

        navigate('/admin/checkout-review', {
          state: { checkoutData },
          replace: true,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Invalid QR code, expired checkout, or customer not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!customer) return;

    const entered = window.prompt('How many points do you want to award?');
    if (!entered) return;

    const points = Number(entered);

    if (!points || points <= 0) {
      toast.error('Please enter a valid point amount.');
      return;
    }

    setUpdatingPoints(true);

    try {
      const newBalance = Number(customer.points_balance || 0) + points;
      const newLifetimePoints = Number(customer.lifetime_points || 0) + points;

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          points_balance: newBalance,
          lifetime_points: newLifetimePoints,
        })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customer.customer_code);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_code: customer.customer_code,
            transaction_type: 'earned',
            points_amount: points,
            note: 'Manual points awarded from QR customer profile',
            employee_name: 'Employee',
          },
        ]);

      if (transactionError) throw transactionError;

      setCustomer({
        ...customer,
        points_balance: newBalance,
        lifetime_points: newLifetimePoints,
      });

      toast.success(`Awarded ${points} points.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to award points.');
    } finally {
      setUpdatingPoints(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!customer) return;

    const entered = window.prompt('How many points do you want to redeem?');
    if (!entered) return;

    const points = Number(entered);
    const currentBalance = Number(customer.points_balance || 0);

    if (!points || points <= 0) {
      toast.error('Please enter a valid point amount.');
      return;
    }

    if (points > currentBalance) {
      toast.error('Customer does not have enough points.');
      return;
    }

    setUpdatingPoints(true);

    try {
      const newBalance = currentBalance - points;

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          points_balance: newBalance,
        })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customer.customer_code);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_code: customer.customer_code,
            transaction_type: 'redeemed',
            points_amount: -points,
            note: 'Manual points redeemed from QR customer profile',
            employee_name: 'Employee',
          },
        ]);

      if (transactionError) throw transactionError;

      setCustomer({
        ...customer,
        points_balance: newBalance,
      });

      toast.success(`Redeemed ${points} points.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to redeem points.');
    } finally {
      setUpdatingPoints(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">
          Rewards QR Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan checkout QR codes or customer rewards QR codes.
        </p>
      </div>

      <div className="max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="w-9 h-9 text-primary" />
          </div>

          <div className="text-center">
            <h2 className="font-display font-bold text-lg">Open Scanner</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Scan a cart checkout QR or a customer rewards QR.
            </p>
          </div>

          <button
            type="button"
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={openScanner}
            disabled={loading}
          >
            <ScanLine className="w-5 h-5" />
            <span>{loading ? 'Reading QR...' : 'Open Scanner'}</span>
          </button>
        </div>
      </div>

      {customer && (
        <div className="max-w-md mt-6 bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-lg">
            {customer.name || 'Unknown Customer'}
          </h2>

          <p className="text-xs text-muted-foreground">
            {customer.customer_code}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-primary">
                {Number(customer.points_balance || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Current Points</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">
                ${money(customer.lifetime_spend)}
              </p>
              <p className="text-xs text-muted-foreground">Lifetime Spend</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <User className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">
                {Number(customer.visit_count || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Visits</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <History className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">
                {Number(customer.lifetime_points || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Lifetime Points</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
              onClick={handleAwardPoints}
              disabled={updatingPoints}
            >
              + Award Points
            </button>

            <button
              type="button"
              className="w-full h-11 rounded-xl border border-border font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              onClick={handleRedeemPoints}
              disabled={updatingPoints}
            >
              <Gift className="w-4 h-4" />
              Redeem Points
            </button>

            <button
              type="button"
              className="w-full h-11 rounded-xl border border-border font-semibold"
              onClick={() => navigate('/admin/customers')}
            >
              View Customer Directory
            </button>
          </div>
        </div>
      )}

      {scanning && (
        <QRScanner
          key={scannerKey}
          onScan={handleScan}
          onClose={closeScanner}
        />
      )}
    </div>
  );
}