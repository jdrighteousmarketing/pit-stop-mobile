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
};

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
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
      toast.error('Could not create promotion.');
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
      toast.error('Could not update promotion.');
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
      toast.error('Could not delete promotion.');
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
            discount_type: promo.discount_type || 'percentage',
            discount_value:
              promo.discount_value === null || promo.discount_value === undefined
                ? ''
                : String(promo.discount_value),
            start_date: toDateInput(promo.start_date),
            end_date: toDateInput(promo.end_date),
            is_active: promo.is_active ?? true,
            promotion_type: promo.promotion_type || 'promotion',
          }
        : emptyForm
    );

    setDialog(true);
  };

  const handleSave = () => {
    const discountValue =
      form.discount_value === '' || form.discount_value === null
        ? null
        : Number(form.discount_value);

    const data = {
      restaurant_id: RESTAURANT_ID,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      promo_code: form.promo_code?.trim() || null,
      discount_type: form.discount_type || 'percentage',
      discount_value: Number.isFinite(discountValue) ? discountValue : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active ?? true,
      promotion_type: form.promotion_type || 'promotion',
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
                value={form.discount_type || 'percentage'}
                onValueChange={(v) => setForm({ ...form, discount_type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  <SelectItem value="bogo">Buy One Get One</SelectItem>
                  <SelectItem value="free_item">Free Item</SelectItem>
                  <SelectItem value="points">Bonus Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Discount Value</Label>
              <Input
                type="number"
                value={form.discount_value || ''}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="mt-1"
              />
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