// @ts-nocheck
import { restaurantConfig } from '@/config/restaurantConfig';
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { MobileSelect } from '@/components/ui/mobile-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const RESTAURANT_ID = restaurantConfig.id;

const createBlankSize = () => ({
  id: crypto.randomUUID(),
  name: '',
  price: '',
});

const normalizeSizes = (sizes) => {
  if (!Array.isArray(sizes)) return [];

  return sizes.map((size) => ({
    id: size.id || crypto.randomUUID(),
    name: size.name || '',
    price:
      size.price === 0 || size.price
        ? String(size.price)
        : '',
  }));
};

const cleanSizesForSave = (sizes) => {
  if (!Array.isArray(sizes)) return [];

  return sizes
    .map((size) => ({
      id: size.id || crypto.randomUUID(),
      name: String(size.name || '').trim(),
      price: parseFloat(size.price) || 0,
    }))
    .filter((size) => size.name && size.price > 0);
};

function SortableCategoryCard({
  cat,
  catItems,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <Card className="hover:bg-secondary/50 transition-colors" onClick={onToggle}>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="pt-0.5 cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>

            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
            )}

            <div>
              <h3 className="font-semibold text-sm">{cat.name}</h3>

              {cat.description && (
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              )}

              <p className="text-xs text-muted-foreground mt-0.5">
                {catItems.length} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}

export default function MenuManagement() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [itemDialog, setItemDialog] = useState(false);
  const [catDialog, setCatDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [itemForm, setItemForm] = useState({});
  const [catForm, setCatForm] = useState({});
  const [imageUploading, setImageUploading] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [loading, setLoading] = useState(true);

  const imageInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadMenuData = async () => {
    setLoading(true);

    try {
      const [{ data: categoryData, error: categoryError }, { data: itemData, error: itemError }] =
        await Promise.all([
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
      toast.error(error.message || 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, []);

  const sortedItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const sortedCategories = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const getDisplayPrice = (item) => {
    if (item.has_size_options && Array.isArray(item.sizes) && item.sizes.length > 0) {
      const prices = item.sizes
        .map((size) => Number(size.price || 0))
        .filter((price) => price > 0);

      if (prices.length === 0) return '$0.00';

      const lowest = Math.min(...prices);
      return `From $${lowest.toFixed(2)}`;
    }

    return `$${Number(item.price || 0).toFixed(2)}`;
  };

  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sortedCategories.findIndex((cat) => cat.id === active.id);
    const newIndex = sortedCategories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedCategories, oldIndex, newIndex).map((cat, index) => ({
      ...cat,
      sort_order: index + 1,
    }));

    setCategories(reordered);

    try {
      await Promise.all(
        reordered.map((cat) =>
          supabase
            .from('menu_categories')
            .update({ sort_order: cat.sort_order })
            .eq('id', cat.id)
            .eq('restaurant_id', RESTAURANT_ID)
        )
      );

      toast.success('Categories reordered');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to reorder categories');
      loadMenuData();
    }
  };

  const openItemDialog = (item = null) => {
    setEditingItem(item);

    setItemForm(
      item
        ? {
            ...item,
            price:
              item.price === 0 || item.price
                ? String(item.price)
                : '',
            has_size_options: item.has_size_options ?? false,
            sizes: normalizeSizes(item.sizes),
          }
        : {
            name: '',
            description: '',
            price: '',
            image_url: '',
            category_id: '',
            is_available: true,
            is_sold_out: false,
            is_featured: false,
            sort_order: 0,
            has_size_options: false,
            sizes: [],
          }
    );

    setItemDialog(true);
  };

  const openCatDialog = (cat = null) => {
    setEditingCat(cat);
    setCatForm(
      cat
        ? { ...cat }
        : {
            name: '',
            description: '',
            sort_order: 0,
            is_active: true,
          }
    );
    setCatDialog(true);
  };

  const handleSaveCat = async () => {
    const data = {
      restaurant_id: RESTAURANT_ID,
      name: catForm.name || '',
      description: catForm.description || '',
      sort_order: parseInt(catForm.sort_order, 10) || 0,
      is_active: catForm.is_active ?? true,
    };

    try {
      if (editingCat) {
        const { error } = await supabase
          .from('menu_categories')
          .update(data)
          .eq('id', editingCat.id)
          .eq('restaurant_id', RESTAURANT_ID);

        if (error) throw error;
        toast.success('Category updated!');
      } else {
        const { error } = await supabase.from('menu_categories').insert(data);

        if (error) throw error;
        toast.success('Category created!');
      }

      setCatDialog(false);
      setEditingCat(null);
      setCatForm({});
      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save category');
    }
  };

  const handleSaveItem = async () => {
    const cleanedSizes = cleanSizesForSave(itemForm.sizes);
    const hasSizeOptions = itemForm.has_size_options ?? false;

    if (hasSizeOptions && cleanedSizes.length === 0) {
      toast.error('Add at least one size with a name and price.');
      return;
    }

    const fallbackPrice = hasSizeOptions
      ? cleanedSizes[0]?.price || 0
      : parseFloat(itemForm.price) || 0;

    const data = {
      restaurant_id: RESTAURANT_ID,
      name: itemForm.name || '',
      description: itemForm.description || '',
      price: fallbackPrice,
      image_url: itemForm.image_url || '',
      category_id: itemForm.category_id || null,
      is_available: itemForm.is_available ?? true,
      is_sold_out: itemForm.is_sold_out ?? false,
      is_featured: itemForm.is_featured ?? false,
      sort_order: parseInt(itemForm.sort_order, 10) || 0,
      has_size_options: hasSizeOptions,
      sizes: hasSizeOptions ? cleanedSizes : [],
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(data)
          .eq('id', editingItem.id)
          .eq('restaurant_id', RESTAURANT_ID);

        if (error) throw error;
        toast.success('Item updated!');
      } else {
        const { error } = await supabase.from('menu_items').insert(data);

        if (error) throw error;
        toast.success('Item created!');
      }

      setItemDialog(false);
      setEditingItem(null);
      setItemForm({});
      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save item');
    }
  };

  const deleteItem = async (id) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) throw error;

      toast.success('Item deleted');
      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const deleteCat = async (id) => {
    try {
      const { error: itemError } = await supabase
        .from('menu_items')
        .update({ category_id: null })
        .eq('category_id', id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (itemError) throw itemError;

      const { error: categoryError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (categoryError) throw categoryError;

      toast.success('Category deleted');
      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const toggleSoldOut = async (item) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_sold_out: !item.is_sold_out })
        .eq('id', item.id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) throw error;

      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update sold out status');
    }
  };

  const toggleAvailable = async (item) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) throw error;

      await loadMenuData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const getCategoryName = (id) => {
    return categories.find((c) => c.id === id)?.name || 'Uncategorized';
  };

  const readImageAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageUploading(true);

    try {
      const imageUrl = await readImageAsDataUrl(file);

      setItemForm((prev) => ({
        ...prev,
        image_url: imageUrl,
      }));

      toast.success('Image uploaded!');
    } catch (error) {
      console.error(error);
      toast.error('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const addSizeRow = () => {
    setItemForm((prev) => ({
      ...prev,
      sizes: [...(prev.sizes || []), createBlankSize()],
    }));
  };

  const updateSizeRow = (id, field, value) => {
    setItemForm((prev) => ({
      ...prev,
      sizes: (prev.sizes || []).map((size) =>
        size.id === id ? { ...size, [field]: value } : size
      ),
    }));
  };

  const removeSizeRow = (id) => {
    setItemForm((prev) => ({
      ...prev,
      sizes: (prev.sizes || []).filter((size) => size.id !== id),
    }));
  };

  const handleToggleSizeOptions = (checked) => {
    setItemForm((prev) => ({
      ...prev,
      has_size_options: checked,
      sizes: checked
        ? prev.sizes?.length
          ? prev.sizes
          : [createBlankSize()]
        : [],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your categories, prices, size options, availability, and featured items.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => openCatDialog()} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>

          <Button onClick={() => openItemDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="items">Menu Items ({items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="space-y-2">
            {categories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No categories yet. Add your first category!
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={sortedCategories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedCategories.map((cat) => {
                    const catItems = sortedItems.filter((i) => i.category_id === cat.id);
                    const isExpanded = expandedCat === cat.id;

                    return (
                      <SortableCategoryCard
                        key={cat.id}
                        cat={cat}
                        catItems={catItems}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedCat(isExpanded ? null : cat.id)}
                        onEdit={() => openCatDialog(cat)}
                        onDelete={() => deleteCat(cat.id)}
                      >
                        {isExpanded && (
                          <div className="mt-2 space-y-2 ml-4 border-l-2 border-border pl-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 w-full justify-start"
                              onClick={() => {
                                setEditingItem(null);
                                setItemForm({
                                  name: '',
                                  description: '',
                                  price: '',
                                  image_url: '',
                                  category_id: cat.id,
                                  is_available: true,
                                  is_sold_out: false,
                                  is_featured: false,
                                  sort_order: 0,
                                  has_size_options: false,
                                  sizes: [],
                                });
                                setItemDialog(true);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                              Add Item
                            </Button>

                            {catItems.map((item) => (
                              <Card key={item.id} className="bg-card">
                                <CardContent className="p-3 flex items-center gap-3">
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt={item.name}
                                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">
                                      🍽️
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm">{item.name}</h3>

                                    <p className="text-xs text-muted-foreground truncate">
                                      {item.description || 'No description'}
                                    </p>

                                    <p className="text-sm font-bold text-primary mt-0.5">
                                      {getDisplayPrice(item)}
                                    </p>

                                    {item.has_size_options && (
                                      <p className="text-[11px] text-muted-foreground">
                                        Size options enabled
                                      </p>
                                    )}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openItemDialog(item)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </SortableCategoryCard>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </TabsContent>

        <TabsContent value="items">
          <div className="space-y-2">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No menu items yet. Add your first item!
                </CardContent>
              </Card>
            ) : (
              sortedItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0">
                        🍽️
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{item.name}</h3>

                        <Badge variant="outline" className="text-[10px]">
                          {getCategoryName(item.category_id)}
                        </Badge>

                        {item.has_size_options && (
                          <Badge variant="outline" className="text-[10px]">
                            Sizes
                          </Badge>
                        )}

                        {item.is_featured && (
                          <Badge className="text-[10px] bg-primary/10 text-primary">
                            Featured
                          </Badge>
                        )}

                        {item.is_sold_out && (
                          <Badge variant="destructive" className="text-[10px]">
                            Sold Out
                          </Badge>
                        )}

                        {!item.is_available && (
                          <Badge variant="secondary" className="text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {item.description || 'No description'}
                      </p>

                      <p className="text-sm font-bold text-primary mt-0.5">
                        {getDisplayPrice(item)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleSoldOut(item)}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            item.is_sold_out ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleAvailable(item)}
                      >
                        {item.is_available ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openItemDialog(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={itemForm.name || ''}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={itemForm.description || ''}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Has Size Options</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this for drinks, appetizers, sides, or anything with custom sizes.
                </p>
              </div>

              <Switch
                checked={itemForm.has_size_options ?? false}
                onCheckedChange={handleToggleSizeOptions}
              />
            </div>

            {!itemForm.has_size_options && (
              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.price || ''}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            {itemForm.has_size_options && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Size Options *</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size names and prices are entered by the owner, not hardcoded.
                    </p>
                  </div>

                  <Button type="button" size="sm" variant="outline" onClick={addSizeRow}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {(itemForm.sizes || []).map((size) => (
                  <div key={size.id} className="grid grid-cols-[1fr_100px_36px] gap-2 items-end">
                    <div>
                      <Label className="text-xs">Size Name</Label>
                      <Input
                        value={size.name || ''}
                        placeholder="Small, Large, 12 oz..."
                        onChange={(e) => updateSizeRow(size.id, 'name', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={size.price || ''}
                        placeholder="0.00"
                        onChange={(e) => updateSizeRow(size.id, 'price', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => removeSizeRow(size.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Image</Label>

              <div className="mt-2 flex items-center gap-4">
                {itemForm.image_url && (
                  <div className="relative">
                    <img
                      src={itemForm.image_url}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover border border-border"
                    />

                    <button
                      type="button"
                      onClick={() => setItemForm((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {imageUploading
                    ? 'Uploading...'
                    : itemForm.image_url
                    ? 'Replace Image'
                    : 'Upload Image'}
                </Button>
              </div>
            </div>

            <div>
              <Label>Category</Label>

              <MobileSelect
                value={itemForm.category_id || ''}
                onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
                options={[
                  { value: '', label: 'No category' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Select category"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={itemForm.sort_order || 0}
                onChange={(e) => setItemForm({ ...itemForm, sort_order: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Available</Label>
              <Switch
                checked={itemForm.is_available ?? true}
                onCheckedChange={(v) => setItemForm({ ...itemForm, is_available: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Sold Out</Label>
              <Switch
                checked={itemForm.is_sold_out ?? false}
                onCheckedChange={(v) => setItemForm({ ...itemForm, is_sold_out: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Featured Special</Label>
              <Switch
                checked={itemForm.is_featured ?? false}
                onCheckedChange={(v) => setItemForm({ ...itemForm, is_featured: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>
              Cancel
            </Button>

            <Button onClick={handleSaveItem} disabled={!itemForm.name}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={catForm.name || ''}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={catForm.description || ''}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={catForm.sort_order || 0}
                onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={catForm.is_active ?? true}
                onCheckedChange={(v) => setCatForm({ ...catForm, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>
              Cancel
            </Button>

            <Button onClick={handleSaveCat} disabled={!catForm.name}>
              {editingCat ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}