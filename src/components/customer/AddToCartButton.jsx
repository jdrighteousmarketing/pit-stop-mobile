import { useState } from 'react';
import { Check, Plus, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AddToCartButton({ menuItem, quantity = 1, onAdded }) {
  const navigate = useNavigate();
  const { data: customerProfile, isLoading } = useCustomerProfile();
  const { addToCart, isAdding } = useCart(customerProfile?.id);

  const [added, setAdded] = useState(false);

  const isDisabled = menuItem.is_sold_out || menuItem.is_available === false;
  const hasCustomerProfile = Boolean(customerProfile?.id);

  const handleAddToCart = () => {
    if (isLoading) {
      toast.message('Loading your account...');
      return;
    }

    if (!hasCustomerProfile) {
      toast.error('Please log in to add items to your cart.');
      navigate('/login');
      return;
    }

    if (added || isAdding || isDisabled) return;

    addToCart(menuItem, {
  quantity,
      onSuccess: () => {
  setAdded(true);

  toast.success(
    quantity > 1
      ? `${quantity} ${menuItem.display_name || menuItem.name} added to cart!`
      : `${menuItem.display_name || menuItem.name} added to cart!`
  );

  if (onAdded) {
    onAdded();
  }

  setTimeout(() => {
    setAdded(false);
  }, 1000);
},
      onError: (error) => {
        console.error(error);
        toast.error('Failed to add item');
      },
    });
  };

  const buttonLabel = (() => {
    if (isLoading) return 'Loading...';
    if (!hasCustomerProfile) return 'Log In to Order';
    if (isDisabled) return 'Unavailable';
    return 'Add to Cart';
  })();

  return (
    <motion.div
      className="w-full"
      animate={
        added
          ? {
              scale: [1, 1.06, 1],
              y: [0, -2, 0],
            }
          : {
              scale: 1,
              y: 0,
            }
      }
      transition={{ duration: 0.35 }}
    >
      <Button
        size="sm"
        variant={added ? 'secondary' : 'default'}
        className={`relative w-full h-9 gap-2 overflow-hidden transition-all duration-300 ${
          added ? 'shadow-[0_0_22px_rgba(34,197,94,0.55)]' : ''
        }`}
        onClick={handleAddToCart}
        disabled={isDisabled || isAdding || isLoading}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isAdding ? (
            <motion.span
              key="loading"
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
            />
          ) : added ? (
            <motion.span
              key="added"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.85 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="w-4 h-4" />
              Added!
            </motion.span>
          ) : (
            <motion.span
              key="normal"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {!hasCustomerProfile && !isLoading ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {buttonLabel}
            </motion.span>
          )}
        </AnimatePresence>

        {added && (
          <motion.span
            className="absolute inset-0 bg-emerald-400/20"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.45 }}
          />
        )}
      </Button>
    </motion.div>
  );
}
