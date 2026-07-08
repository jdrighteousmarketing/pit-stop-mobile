// @ts-nocheck

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Gift, Ticket } from 'lucide-react';
import AddToCartButton from './AddToCartButton';

function itemAlreadyInCart(item, cartItems = []) {
  return cartItems.some(
    (cartItem) =>
      String(cartItem.menu_item_id || cartItem.id || '') === String(item.id)
  );
}

function getCartQuantityForItem(item, cartItems = []) {
  return cartItems
    .filter(
      (cartItem) =>
        String(cartItem.menu_item_id || cartItem.id || '') === String(item.id)
    )
    .reduce((sum, cartItem) => sum + Number(cartItem.quantity || 0), 0);
}

export default function RewardRequirementCard({
  type = 'reward',
  reward,
  deal,
  restaurantId,
  cartItems = [],
  onAdded,
}) {
  const source = type === 'deal' ? deal : reward;

  const rewardType = String(
    source?.reward_type ||
      source?.rewardType ||
      (source?.target_menu_item_id ? 'free_menu_item' : 'free_category')
  ).toLowerCase();

  const targetMenuItemId =
    source?.target_menu_item_id ||
    source?.targetMenuItemId ||
    null;

  const targetCategoryId =
    source?.target_category_id ||
    source?.targetCategoryId ||
    null;

  const isDeal = type === 'deal';
  const isBogoDeal =
  isDeal && String(source?.discount_type || '').toLowerCase() === 'bogo';
const requiredQuantity = isBogoDeal
  ? Number(source?.buy_quantity || 1) + Number(source?.get_quantity || 1)
  : 1;

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: [
      'checkoutRequirement',
      type,
      restaurantId,
      targetMenuItemId,
      targetCategoryId,
    ],
    enabled: !!restaurantId && (!!targetMenuItemId || !!targetCategoryId),
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select(`*, menu_categories(name)`)
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);

      if (targetMenuItemId) {
        query = query.eq('id', targetMenuItemId);
      } else if (targetCategoryId) {
        query = query.eq('category_id', targetCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });

  const eligibleItems = useMemo(() => {
  return menuItems
    .map((item) => {
      const currentQuantity = getCartQuantityForItem(item, cartItems);

      const quantityNeeded = isBogoDeal
  ? Math.max(requiredQuantity - currentQuantity, 0)
  : itemAlreadyInCart(item, cartItems)
  ? 0
  : 1;

      return {
        ...item,
        categoryName: item.menu_categories?.name || item.category_name || '',
        quantityNeeded,
      };
    })
    .filter((item) => item.quantityNeeded > 0);
}, [menuItems, cartItems, isBogoDeal, requiredQuantity]);

  if (isLoading) {
    return (
      <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 pr-10">
        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
          Finding required {isDeal ? 'coupon' : 'reward'} item...
        </p>
      </div>
    );
  }

  if (eligibleItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 pr-10 space-y-3">
      <div>
        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
          {isDeal ? 'Coupon not applied yet.' : 'Reward not applied yet.'}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          Add the required {isDeal ? 'coupon' : 'reward'} item below.
        </p>
      </div>

      {eligibleItems.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-border bg-background/80 p-3 space-y-3"
        >
          <div className="flex gap-3">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                🍽️
              </div>
            )}

            <div className="flex-1 min-w-0">
              <Badge className="mb-1">
                {isDeal ? (
                  <Ticket className="w-3 h-3 mr-1" />
                ) : (
                  <Gift className="w-3 h-3 mr-1" />
                )}
                {isDeal ? 'Coupon Item' : 'Reward Item'}
              </Badge>

              <p className="font-semibold leading-tight">{item.name}</p>

              {item.categoryName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.categoryName}
                </p>
              )}

              <p className="font-bold text-primary mt-1">
                ${Number(item.price || 0).toFixed(2)}
              </p>
            </div>
          </div>

            <AddToCartButton
           menuItem={item}
           quantity={item.quantityNeeded}
            onAdded={onAdded}
           />
        </div>
      ))}
    </div>
  );
}