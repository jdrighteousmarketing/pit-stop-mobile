import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import ImageModal from './ImageModal';
import AddToCartButton from './AddToCartButton';

export default function MenuItemCard({ item, index }) {
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState(
    item.has_size_options && Array.isArray(item.sizes) && item.sizes.length > 0
      ? item.sizes[0]
      : null
  );

  const hasSizeOptions =
    item.has_size_options && Array.isArray(item.sizes) && item.sizes.length > 0;

  const displayPrice = hasSizeOptions
    ? selectedSize?.price
      ? Number(selectedSize.price).toFixed(2)
      : Number(item.sizes[0]?.price || 0).toFixed(2)
    : Number(item.price || 0).toFixed(2);

  const cartItem = hasSizeOptions
    ? {
        ...item,
        price: Number(selectedSize?.price || item.sizes[0]?.price || 0),
        selected_size: selectedSize?.name || item.sizes[0]?.name || '',
        selected_size_id: selectedSize?.id || item.sizes[0]?.id || '',
        display_name: `${selectedSize?.name || item.sizes[0]?.name || ''} ${item.name}`,
      }
    : item;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex gap-3 bg-card rounded-2xl border border-border p-3 hover:shadow-md transition-shadow"
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            onClick={() => setImageOpen(true)}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
            🍽️
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>

            {item.is_sold_out && (
              <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                Sold Out
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}

          {hasSizeOptions && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Choose Option</p>

              <div className="flex flex-wrap gap-1.5">
                {item.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;

                  return (
                    <Button
                      key={size.id}
                      type="button"
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-8 px-2 text-xs rounded-full"
                      disabled={item.is_sold_out}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size.name} · ${Number(size.price || 0).toFixed(2)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <p
            className={`font-bold text-sm mt-1.5 ${
              item.is_sold_out
                ? 'text-muted-foreground line-through'
                : 'text-primary'
            }`}
          >
            ${displayPrice}
          </p>

          <div className="mt-2">
            <AddToCartButton menuItem={cartItem} />
          </div>
        </div>
      </motion.div>

      <ImageModal
        imageUrl={item.image_url}
        open={imageOpen}
        onOpenChange={setImageOpen}
      />
    </>
  );
}
