import { restaurantConfig } from '@/config/restaurantConfig';
import { useEffect, useMemo, useState } from 'react';
import { Heart, GripVertical, Search, Loader2 } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

function sortFeaturedItems(items) {
  return [...items]
    .filter((item) => item.is_featured)
    .sort((a, b) => {
      const aOrder = Number(a.featured_order ?? 999999);
      const bOrder = Number(b.featured_order ?? 999999);

      if (aOrder !== bOrder) return aOrder - bOrder;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

export default function FeaturedSpecials() {
  const [menuItems, setMenuItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const loadItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setMenuItems([]);
      setFeaturedItems([]);
    } else {
      const items = data || [];
      setMenuItems(items);
      setFeaturedItems(sortFeaturedItems(items));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return menuItems;

    return menuItems.filter((item) => {
      return (
        item.name?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    });
  }, [menuItems, searchTerm]);

  const saveFeaturedOrder = async (itemsToSave) => {
    setSavingOrder(true);

    try {
      const updates = itemsToSave.map((item, index) =>
        supabase
          .from('menu_items')
          .update({ featured_order: index + 1 })
          .eq('id', item.id)
          .eq('restaurant_id', RESTAURANT_ID)
      );

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);

      if (failed?.error) throw failed.error;

      setMenuItems((prev) =>
        prev.map((item) => {
          const featuredIndex = itemsToSave.findIndex((x) => x.id === item.id);

          if (featuredIndex === -1) return item;

          return {
            ...item,
            featured_order: featuredIndex + 1,
          };
        })
      );
    } catch (error) {
      console.error(error);
      alert('Could not save the Featured Specials order.');
      await loadItems();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleReorder = (newOrder) => {
    const orderedItems = newOrder.map((item, index) => ({
      ...item,
      featured_order: index + 1,
    }));

    setFeaturedItems(orderedItems);
  };

  const handleReorderComplete = async () => {
    await saveFeaturedOrder(featuredItems);
  };

  const toggleFeatured = async (item) => {
    setSavingId(item.id);

    try {
      if (item.is_featured) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            is_featured: false,
            featured_order: null,
          })
          .eq('id', item.id)
          .eq('restaurant_id', RESTAURANT_ID);

        if (error) throw error;

        const remainingFeatured = featuredItems.filter((x) => x.id !== item.id);
        const reorderedRemaining = remainingFeatured.map((x, index) => ({
          ...x,
          featured_order: index + 1,
        }));

        setFeaturedItems(reorderedRemaining);

        setMenuItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, is_featured: false, featured_order: null }
              : x
          )
        );

        await saveFeaturedOrder(reorderedRemaining);
      } else {
        const nextOrder = featuredItems.length + 1;

        const { error } = await supabase
          .from('menu_items')
          .update({
            is_featured: true,
            featured_order: nextOrder,
          })
          .eq('id', item.id)
          .eq('restaurant_id', RESTAURANT_ID);

        if (error) throw error;

        const featuredItem = {
          ...item,
          is_featured: true,
          featured_order: nextOrder,
        };

        setFeaturedItems((prev) => [...prev, featuredItem]);

        setMenuItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, is_featured: true, featured_order: nextOrder }
              : x
          )
        );
      }
    } catch (error) {
      console.error(error);
      alert('Could not update Featured Specials.');
      await loadItems();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1">
          Owner Admin
        </p>

        <h1 className="text-3xl font-display font-bold">
          Featured Specials
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Heart menu items to feature them on the homepage. Drag the handle to control the carousel order.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search menu items..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border border-border rounded-xl p-3"
              >
                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍔
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.category || item.description || 'Menu item'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFeatured(item)}
                  disabled={savingId === item.id || savingOrder}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition disabled:opacity-60"
                >
                  {savingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 ${
                        item.is_featured
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display font-bold text-xl">
                Homepage Carousel Order
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Drag an item up or down. This saves automatically when you let go.
              </p>
            </div>

            {savingOrder && (
              <div className="flex items-center gap-2 text-xs text-primary font-semibold shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </div>
            )}
          </div>

          {featuredItems.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl py-16 text-center text-muted-foreground">
              No featured specials yet.
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={featuredItems}
              onReorder={handleReorder}
              className="space-y-3"
            >
              {featuredItems.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  onDragEnd={handleReorderComplete}
                  className="flex items-center gap-3 border border-border rounded-xl p-3 bg-background cursor-grab active:cursor-grabbing shadow-sm"
                >
                  <div className="text-sm font-bold text-primary w-6">
                    {index + 1}
                  </div>

                  <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />

                  <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🍔
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Featured order #{index + 1}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFeatured(item);
                    }}
                    disabled={savingId === item.id || savingOrder}
                    className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition disabled:opacity-60"
                  >
                    {savingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-5 h-5 fill-primary text-primary" />
                    )}
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
}
