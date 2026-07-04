// @ts-nocheck

function toMoneyNumber(value) {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100) / 100;
}

export function normalizeRoundingRule(value) {
  return value === 'up' ? 'up' : 'down';
}

export function calculateRewardPoints(orderTotal, pointsPerDollar = 1, roundingRule = 'down') {
  const rawPoints = Number(orderTotal || 0) * Number(pointsPerDollar || 1);
  if (!Number.isFinite(rawPoints) || rawPoints <= 0) return 0;

  return normalizeRoundingRule(roundingRule) === 'up'
    ? Math.ceil(rawPoints)
    : Math.floor(rawPoints);
}

export function calculateCartSubtotal(items = []) {
  return toMoneyNumber(
    items.reduce((sum, item) => {
      const price = Number(item.price || item.unit_price || 0);
      const quantity = Number(item.quantity || 0);
      return sum + price * quantity;
    }, 0)
  );
}

export function getCouponMinimumOrder(coupon) {
  if (!coupon) return 0;

  return Number(
    coupon.minimum_order_amount ??
      coupon.minimumOrderAmount ??
      coupon.min_order_amount ??
      coupon.minOrderAmount ??
      coupon.minimum_purchase ??
      coupon.minimumPurchase ??
      0
  );
}

export function getCouponDiscountType(coupon) {
  return String(coupon?.discountType || coupon?.discount_type || '').toLowerCase();
}

export function getCouponDiscountValue(coupon) {
  return Number(coupon?.discountValue ?? coupon?.discount_value ?? 0);
}

function getCouponApplyTo(coupon) {
  return String(coupon?.applyTo || coupon?.apply_to || 'entire_order');
}

function getCouponTargetMenuItemId(coupon) {
  return coupon?.targetMenuItemId || coupon?.target_menu_item_id || null;
}

function getCouponTargetCategoryId(coupon) {
  return coupon?.targetCategoryId || coupon?.target_category_id || null;
}

function getItemMenuItemId(item) {
  return item?.menu_item_id || item?.id || item?.item_id || null;
}

function getItemCategoryId(item) {
  return item?.category_id || item?.categoryId || null;
}

function calculateTargetSubtotal(items = [], coupon = null, orderSubtotal = 0) {
  const applyTo = getCouponApplyTo(coupon);
  const targetMenuItemId = getCouponTargetMenuItemId(coupon);
  const targetCategoryId = getCouponTargetCategoryId(coupon);

  if (applyTo === 'menu_item' && targetMenuItemId) {
    return calculateCartSubtotal(
      items.filter((item) => getItemMenuItemId(item) === targetMenuItemId)
    );
  }

  if (applyTo === 'category' && targetCategoryId) {
    return calculateCartSubtotal(
      items.filter((item) => getItemCategoryId(item) === targetCategoryId)
    );
  }

  return orderSubtotal;
}

export function calculateCouponDiscount({ subtotal = 0, coupon = null, items = [] } = {}) {
  const orderSubtotal = toMoneyNumber(subtotal);
  if (!coupon || orderSubtotal <= 0) return 0;

  const minimumOrder = getCouponMinimumOrder(coupon);
  if (minimumOrder > 0 && orderSubtotal < minimumOrder) return 0;

  const discountType = getCouponDiscountType(coupon);
  const discountValue = getCouponDiscountValue(coupon);
  const discountBase = calculateTargetSubtotal(items, coupon, orderSubtotal);

  if (discountBase <= 0) return 0;

  if (discountType === 'fixed') {
    return toMoneyNumber(Math.min(Math.max(discountValue, 0), discountBase));
  }

  if (discountType === 'percentage') {
    return toMoneyNumber(
      Math.min(discountBase * (Math.max(discountValue, 0) / 100), discountBase)
    );
  }

  return 0;
}

export function calculateCheckoutTotals({
  items = [],
  coupon = null,
  taxRate = 0,
  pointsPerDollar = 1,
  rewardRounding = 'down',
} = {}) {
  const subtotal = calculateCartSubtotal(items);
  const discountAmount = calculateCouponDiscount({ subtotal, coupon, items });
  const taxableAmount = toMoneyNumber(Math.max(subtotal - discountAmount, 0));
  const taxAmount = toMoneyNumber(taxableAmount * (Number(taxRate || 0) / 100));
  const total = toMoneyNumber(taxableAmount + taxAmount);
  const pointsToEarn = calculateRewardPoints(total, pointsPerDollar, rewardRounding);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    pointsToEarn,
  };
}