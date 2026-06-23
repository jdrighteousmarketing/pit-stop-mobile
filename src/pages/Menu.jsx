import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import MenuItemCard from '@/components/customer/MenuItemCard';
import { motion } from 'framer-motion';
import PullToRefresh from '@/components/customer/PullToRefresh';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const RESTAURANT_ID = 'pit_stop_mobile';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMenuData = async () => {
    setIsLoading(true);

    try {
      const [
        { data: categoryData, error: categoryError },
        { data: itemData, error: itemError },
      ] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .order('sort_order', { ascending: true }),

        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .order('sort_order', { ascending: true }),
      ]);

      if (categoryError) throw categoryError;
      if (itemError) throw itemError;

      setCategories(categoryData || []);
      setItems(itemData || []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load menu');
      setCategories([]);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, []);

  const handleRefresh = async () => {
    await loadMenuData();
    return true;
  };

  const sortedCategories = [...categories]
    .filter((cat) => cat.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const visibleItems = [...items]
    .filter((item) => item.is_available !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const searchTerm = search.trim().toLowerCase();

  const matchesSearch = (item) => {
    return (
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm)
    );
  };

  const filteredItems = visibleItems.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' || item.category_id === activeCategory;

    return matchesCategory && matchesSearch(item);
  });

  const hasMenuData = sortedCategories.length > 0 || visibleItems.length > 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-4">
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-2xl font-display font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore our delicious options
          </p>
        </div>

        <div className="px-5 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card border-border"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="px-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <p className="text-4xl mb-3">🍔</p>
              <p className="font-medium">Loading menu...</p>
              <p className="text-sm mt-1">Please wait one moment.</p>
            </motion.div>
          </div>
        ) : (
          <>
            {hasMenuData && (
              <>
                <div className="px-5 pb-2">
                  <div className="flex items-center gap-3 text-primary font-semibold">
                    <span className="text-sm">
                      Scroll this way to see more!
                    </span>

                    <span
                      className="text-4xl font-black animate-bounce leading-none"
                      style={{ animationDuration: '0.8s' }}
                    >
                      →
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto px-5 pb-3 -mx-0 scrollbar-hide">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all select-none-touch',
                      activeCategory === 'all'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All
                  </button>

                  {sortedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all select-none-touch',
                        activeCategory === cat.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {!hasMenuData ? (
              <div className="px-5">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <p className="text-4xl mb-3">🍽️</p>
                  <p className="font-medium">Menu coming soon</p>
                  <p className="text-sm mt-1">
                    Check back soon for updated food options.
                  </p>
                </motion.div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-5">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-medium">No items found</p>
                  <p className="text-sm mt-1">
                    Try a different category or search term.
                  </p>
                </motion.div>
              </div>
            ) : (
              <div className="px-5 space-y-3">
                {filteredItems.map((item, i) => (
                  <MenuItemCard key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}