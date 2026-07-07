// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';

const CART_STORAGE_KEY = 'pitStopActiveCart';
const CART_UPDATED_EVENT = 'pitstop-cart-updated';

function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function getCartItemKey(menuItem) {
  const itemId = menuItem?.id || menuItem?.menu_item_id;
  const sizeId = menuItem?.selected_size_id || 'regular';

  return `${itemId}__${sizeId}`;
}

function getStoredCart(customerProfileId) {
  if (!customerProfileId) return null;

  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    if (parsed?.customer_profile_id !== customerProfileId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveStoredCart(cart) {
  if (!cart) {
    localStorage.removeItem(CART_STORAGE_KEY);
    notifyCartUpdated();
    return;
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  notifyCartUpdated();
}

function getBusinessSettings() {
  try {
    const saved =
      localStorage.getItem('businessSettings') ||
      localStorage.getItem('pitstop_business_settings');

    if (!saved) {
      return {
        tax_rate: 6,
        points_per_dollar: 1,
      };
    }

    const parsed = JSON.parse(saved);

    return {
      tax_rate: Number(parsed.tax_rate ?? parsed.taxRate ?? 6),
      points_per_dollar: Number(
        parsed.points_per_dollar ?? parsed.pointsPerDollar ?? 1
      ),
    };
  } catch {
    return {
      tax_rate: 6,
      points_per_dollar: 1,
    };
  }
}

function calculateCart(items) {
  const settings = getBusinessSettings();

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  const taxAmount = subtotal * (settings.tax_rate / 100);
  const total = subtotal + taxAmount;
  const pointsToEarn = Math.floor(total * settings.points_per_dollar);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax_rate: settings.tax_rate,
    tax_amount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
    points_to_earn: pointsToEarn,
  };
}

function createCart(customerProfileId, items = []) {
  const totals = calculateCart(items);

  return {
    id: `cart_${Date.now()}`,
    customer_profile_id: customerProfileId,
    status: 'active',
    items,
    ...totals,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function useCart(customerProfileId) {
  const [cart, setCart] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const syncCart = () => {
      const storedCart = getStoredCart(customerProfileId);
      setCart(storedCart);
    };

    syncCart();

    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener('storage', syncCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, [customerProfileId]);

  const isLoading = useMemo(() => false, []);

  const updateCart = (nextCart) => {
    setCart(nextCart);
    saveStoredCart(nextCart);
  };

  const addToCart = (menuItem, options) => {
    if (!customerProfileId || !menuItem) return;

    setIsAdding(true);

    try {
      const latestCart = getStoredCart(customerProfileId);
      const currentItems = latestCart?.items || cart?.items || [];
      const cartItemKey = getCartItemKey(menuItem);

      const existingItem = currentItems.find(
        (item) => item.cart_item_key === cartItemKey
      );

      let newItems;

      if (existingItem) {
        newItems = currentItems.map((item) =>
          item.cart_item_key === cartItemKey
            ? {
    ...item,
    quantity:
      Number(item.quantity || 0) +
      Number(options?.quantity || 1),
  }
            : item
        );
      } else {
        const categoryName =
          menuItem.categoryName ||
          menuItem.category_name ||
          menuItem.category ||
          null;

        const categoryId =
          menuItem.category_id ||
          menuItem.categoryId ||
          menuItem.menu_category_id ||
          null;

        newItems = [
          ...currentItems,
          {
            cart_item_key: cartItemKey,
            menu_item_id: menuItem.id || menuItem.menu_item_id || null,
            name: menuItem.name,
            display_name:
              menuItem.display_name ||
              (menuItem.selected_size
                ? `${menuItem.selected_size} ${menuItem.name}`
                : menuItem.name),
            categoryName,
            category_name: categoryName,
            category_id: categoryId,
            menu_category_id: categoryId,
            selected_size: menuItem.selected_size || null,
            selected_size_id: menuItem.selected_size_id || null,
            price: Number(menuItem.price || 0),
            quantity: Number(options?.quantity || 1),
          },
        ];
      }

      const nextCart = {
        ...(latestCart || cart || createCart(customerProfileId)),
        customer_profile_id: customerProfileId,
        status: 'active',
        items: newItems,
        ...calculateCart(newItems),
        updated_at: new Date().toISOString(),
      };

      updateCart(nextCart);

      if (options?.onSuccess) {
        options.onSuccess(nextCart);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);

      if (options?.onError) {
        options.onError(error);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const removeFromCart = (cartItemKeyOrMenuItemId) => {
    const latestCart = getStoredCart(customerProfileId) || cart;
    if (!latestCart) return;

    const newItems = latestCart.items.filter((item) => {
      const itemKey = item.cart_item_key || `${item.menu_item_id}__regular`;
      return (
        itemKey !== cartItemKeyOrMenuItemId &&
        item.menu_item_id !== cartItemKeyOrMenuItemId
      );
    });

    if (newItems.length === 0) {
      updateCart(null);
      return;
    }

    const nextCart = {
      ...latestCart,
      items: newItems,
      ...calculateCart(newItems),
      updated_at: new Date().toISOString(),
    };

    updateCart(nextCart);
  };

  const updateQuantity = ({ menuItemId, cartItemKey, quantity }) => {
    const latestCart = getStoredCart(customerProfileId) || cart;
    if (!latestCart) return;

    const targetKey = cartItemKey || menuItemId;

    if (quantity <= 0) {
      removeFromCart(targetKey);
      return;
    }

    const newItems = latestCart.items.map((item) => {
      const itemKey = item.cart_item_key || `${item.menu_item_id}__regular`;

      return itemKey === targetKey || item.menu_item_id === targetKey
        ? { ...item, quantity }
        : item;
    });

    const nextCart = {
      ...latestCart,
      items: newItems,
      ...calculateCart(newItems),
      updated_at: new Date().toISOString(),
    };

    updateCart(nextCart);
  };

  const clearCart = () => {
    updateCart(null);
  };

  const completeCart = () => {
    const latestCart = getStoredCart(customerProfileId) || cart;
    if (!latestCart) return null;

    const completedCart = {
      ...latestCart,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    const history = JSON.parse(localStorage.getItem('pitStopCompletedCarts') || '[]');

    localStorage.setItem(
      'pitStopCompletedCarts',
      JSON.stringify([completedCart, ...history])
    );

    updateCart(null);

    return completedCart;
  };

  return {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    completeCart,
    clearCart,
    isAdding,
    addToCartError: null,
  };
}
