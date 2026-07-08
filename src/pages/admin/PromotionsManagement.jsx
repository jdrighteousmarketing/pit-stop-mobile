// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const APPLY_TO = {
  ENTIRE_ORDER: 'entire_order',
  MENU_ITEM: 'menu_item',
  CATEGORY: 'category',
};

const emptyForm = {
  title: '',
  description: '',
  promo_code: '',
  discount_type: 'percentage',
  discount_value: '',
  start_date: '',
  end_date: '',
  is_active: true,
  promotion_type: 'promotion',
  apply_to: APPLY_TO.ENTIRE_ORDER,
  target_menu_item_id: '',
target_category_id: '',
minimum_order_amount: '',
buy_quantity: '1',
get_quantity: '1',
};

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function normalizeDiscountType(type) {
  if (!type || type === 'points') return 'percentage';
  return type;
}

function getApplyToFromPromo(promo) {
  if (promo?.target_menu_item_id) return APPLY_TO.MENU_ITEM;
  if (promo?.target_category_id) return APPLY_TO.CATEGORY;
  return APPLY_TO.ENTIRE_ORDER;
}

export default function PromotionsManagement() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['adminPromosList', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['promotionMenuItems', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, category_id, is_available, sort_order')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    initialData: [],
  });

  const { data: menuCategories = [] } = useQuery({
    queryKey: ['promotionMenuCategories', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order, is_active')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    initialData: [],
  });

  const createPromo = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('promotions').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromosList', RESTAURANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['promotions', RESTAURANT_ID] });
      setDialog(false);
      toast.success('Promotion created!');
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Could not create promotion.');
    },
  });

  const updatePromo = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from('promotions')
        .update(data)
        .eq('id', id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromosList', RESTAURANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['promotions', RESTAURANT_ID] });
      setDialog(false);
      toast.success('Promotion updated!');
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Could not update promotion.');
    },
  });

  const deletePromo = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: false })
        .eq('id', id)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromosList', RESTAURANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['promotions', RESTAURANT_ID] });
      toast.success('Promotion deleted.');
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Could not delete promotion.');
    },
  });

  const openDialog = (promo = null) => {
    setEditing(promo);

    setForm(
      promo
        ? {
            title: promo.title || '',
            description: promo.description || '',
            promo_code: promo.promo_code || '',
            discount_type: normalizeDiscountType(promo.discount_type),
            discount_value:
              promo.discount_value === null || promo.discount_value === undefined
                ? ''
                : String(promo.discount_value),
            start_date: toDateInput(promo.start_date),
            end_date: toDateInput(promo.end_date),
            is_active: promo.is_active ?? true,
            promotion_type: promo.promotion_type || 'promotion',
            apply_to: getApplyToFromPromo(promo),
            target_menu_item_id: promo.target_menu_item_id || '',
            target_category_id: promo.target_category_id || '',
            minimum_order_amount:
            promo.minimum_order_amount === null ||
            promo.minimum_order_amount === undefined
              ? ''
              : String(promo.minimum_order_amount),

              buy_quantity: String(promo.buy_quantity ?? 1),
              get_quantity: String(promo.get_quantity ?? 1),
          }
        : { ...emptyForm }
    );

    setDialog(true);
  };

  const handleApplyToChange = (value) => {
    setForm({
      ...form,
      apply_to: value,
      target_menu_item_id: value === APPLY_TO.MENU_ITEM ? form.target_menu_item_id : '',
      target_category_id: value === APPLY_TO.CATEGORY ? form.target_category_id : '',
    });
  };

  const handleSave = () => {
    const discountValue =
      form.discount_value === '' || form.discount_value === null
        ? null
        : Number(form.discount_value);

    const applyTo = form.apply_to || APPLY_TO.ENTIRE_ORDER;
    const targetMenuItemId = applyTo === APPLY_TO.MENU_ITEM ? form.target_menu_item_id || null : null;
    const targetCategoryId = applyTo === APPLY_TO.CATEGORY ? form.target_category_id || null : null;

    if (applyTo === APPLY_TO.MENU_ITEM && !targetMenuItemId) {
      toast.error('Choose the menu item this promotion applies to.');
      return;
    }

    if (applyTo === APPLY_TO.CATEGORY && !targetCategoryId) {
      toast.error('Choose the menu category this promotion applies to.');
      return;
    }

    const data = {
      restaurant_id: RESTAURANT_ID,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      promo_code: form.promo_code?.trim() || null,
      discount_type: normalizeDiscountType(form.discount_type),
      discount_value: Number.isFinite(discountValue) ? discountValue : null,
      minimum_order_amount:
      form.minimum_order_amount === ''
      ? null
      : Number(form.minimum_order_amount),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active ?? true,
      promotion_type: form.promotion_type || 'promotion',
      target_menu_item_id: targetMenuItemId,
      target_category_id: targetCategoryId,
      buy_quantity: Number(form.buy_quantity || 1),
      get_quantity: Number(form.get_quantity || 1),

      image_url: null,
    };

    if (!data.title) {
      toast.error('Promotion title is required.');
      return;
    }

    if (editing) {
      updatePromo.mutate({ id: editing.id, data });
    } else {
      createPromo.mutate(data);
    }
  };

  const typeLabels = {
    promotion: 'Promotion',
    coupon: 'Coupon',
    limited_time: 'Limited Time',
  };

  const getTargetLabel = (promo) => {
    if (promo.target_menu_item_id) {
      const item = menuItems.find((menuItem) => menuItem.id === promo.target_menu_item_id);
      return item?.name ? `Item: ${item.name}` : 'Specific item';
    }

    if (promo.target_category_id) {
      const category = menuCategories.find((cat) => cat.id === promo.target_category_id);
      return category?.name ? `Category: ${category.name}` : 'Specific category';
    }

    return 'Entire order';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">
          Promotions Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage promotions, coupons, and limited-time offers
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Promotion
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading promotions...
            </CardContent>
          </Card>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No promotions yet
            </CardContent>
          </Card>
        ) : (
          promotions.map((promo) => (
            <Card key={promo.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{promo.title}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabels[promo.promotion_type] || 'Promotion'}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {getTargetLabel(promo)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {promo.promo_code && <span>Code: {promo.promo_code}</span>}
                    {promo.start_date && <span>From: {toDateInput(promo.start_date)}</span>}
                    {promo.end_date && <span>Until: {toDateInput(promo.end_date)}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openDialog(promo)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={deletePromo.isPending}
                    onClick={() => deletePromo.mutate(promo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Promotion' : 'Add Promotion'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title || ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={form.promotion_type || 'promotion'}
                onValueChange={(v) => setForm({ ...form, promotion_type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="coupon">Coupon</SelectItem>
                  <SelectItem value="limited_time">Limited Time Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Promo Code</Label>
              <Input
                value={form.promo_code || ''}
                onChange={(e) => setForm({ ...form, promo_code: e.target.value })}
                className="mt-1"
                placeholder="e.g. SAVE20"
              />
            </div>

            <div>
              <Label>Discount Type</Label>
              <Select
                value={normalizeDiscountType(form.discount_type)}
                onValueChange={(v) => setForm({ ...form, discount_type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  <SelectItem value="bogo">Buy X Get Y</SelectItem>
                  <SelectItem value="free_item">Free Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
  {normalizeDiscountType(form.discount_type) === 'bogo'
    ? 'Get Item Discount (%)'
    : normalizeDiscountType(form.discount_type) === 'fixed'
    ? 'Dollar Amount Off'
    : 'Percentage Off'}
</Label>
              <Input
  type="number"
  value={form.discount_value || ''}
  placeholder={
    normalizeDiscountType(form.discount_type) === 'bogo'
      ? '100 = FREE, 50 = Half Off'
      : normalizeDiscountType(form.discount_type) === 'fixed'
      ? '5.00'
      : '25'
  }
  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
  className="mt-1"
/>
            </div>

{normalizeDiscountType(form.discount_type) === 'bogo' && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <Label>Buy Quantity</Label>
      <Input
        type="number"
        min="1"
        value={form.buy_quantity}
        onChange={(e) =>
          setForm({
            ...form,
            buy_quantity: e.target.value,
          })
        }
        className="mt-1"
      />
    </div>

    <div>
      <Label>Get Quantity</Label>
      <Input
        type="number"
        min="1"
        value={form.get_quantity}
        onChange={(e) =>
          setForm({
            ...form,
            get_quantity: e.target.value,
          })
        }
        className="mt-1"
      />
    </div>
  </div>
)}

            <div>
               <Label>Minimum Order Amount</Label>
               <Input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank for no minimum"
                  value={form.minimum_order_amount || ''}
                  onChange={(e) =>
                  setForm({
                  ...form,
                  minimum_order_amount: e.target.value,
               })
            }
                  className="mt-1"
               />
           </div>
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div>
                <Label>Apply Promotion To</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entire order discounts apply to the full subtotal. Item and category discounts only apply to matching menu items.
                </p>
              </div>

              <Select
                value={form.apply_to || APPLY_TO.ENTIRE_ORDER}
                onValueChange={handleApplyToChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={APPLY_TO.ENTIRE_ORDER}>Entire Order</SelectItem>
                  <SelectItem value={APPLY_TO.MENU_ITEM}>Specific Menu Item</SelectItem>
                  <SelectItem value={APPLY_TO.CATEGORY}>Menu Category</SelectItem>
                </SelectContent>
              </Select>

              {form.apply_to === APPLY_TO.MENU_ITEM && (
                <div>
                  <Label>Menu Item</Label>
                  <Select
                    value={form.target_menu_item_id || ''}
                    onValueChange={(v) => setForm({ ...form, target_menu_item_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.length === 0 ? (
                        <SelectItem value="no-menu-items" disabled>
                          No menu items found
                        </SelectItem>
                      ) : (
                        menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.apply_to === APPLY_TO.CATEGORY && (
                <div>
                  <Label>Menu Category</Label>
                  <Select
                    value={form.target_category_id || ''}
                    onValueChange={(v) => setForm({ ...form, target_category_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuCategories.length === 0 ? (
                        <SelectItem value="no-categories" disabled>
                          No categories found
                        </SelectItem>
                      ) : (
                        menuCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date || ''}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.end_date || ''}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={!form.title || createPromo.isPending || updatePromo.isPending}
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
