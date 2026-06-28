import { useEffect, useMemo, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Cake,
  ChevronRight,
  LogOut,
  Clock,
  Gift,
  ShieldCheck,
  Trash2,
  ReceiptText,
  PackageOpen,
  Coins,
  Store,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import CustomerQRCode from '@/components/customer/CustomerQRCode';
import NativeHeader from '@/components/customer/NativeHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const RESTAURANT_ID = 'pit_stop_mobile';
const CUSTOMER_ORDER_HISTORY_DAYS = 14;

function money(value) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value) {
  if (!value) return 'Unknown date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return 'Unknown time';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getOrderTotal(order) {
  return Number(order?.total_amount ?? 0);
}

function getOrderSubtotal(order) {
  return Number(order?.subtotal ?? order?.subtotal_amount ?? 0);
}

function getOrderTax(order) {
  return Number(order?.tax_amount ?? 0);
}

function getOrderPoints(order) {
  return Number(order?.points_awarded ?? order?.points_to_earn ?? 0);
}

function normalizeProfileFromUser(user) {
  const profile = user?.profile || {};
  const role = user?.role || profile?.role || 'customer';

  return {
    id: profile.id || user?.id || '',
    auth_user_id: user?.auth_user_id || user?.id || profile.auth_user_id || '',
    name:
      profile.name ||
      profile.full_name ||
      user?.name ||
      user?.full_name ||
      user?.email?.split('@')[0] ||
      'Customer',
    email: profile.email || user?.email || '',
    phone: profile.phone || '',
    birthday: profile.birthday || '',
    address: profile.address || '',
    role,
    restaurant_id: profile.restaurant_id || user?.restaurant_id || RESTAURANT_ID,
    customer_id_code:
      profile.customer_id_code ||
      profile.customer_code ||
      user?.customer_id_code ||
      user?.customer_code ||
      '',
    customer_code:
      profile.customer_code ||
      profile.customer_id_code ||
      user?.customer_code ||
      user?.customer_id_code ||
      '',
    points_balance: Number(profile.points_balance || user?.points_balance || 0),
    lifetime_points: Number(
      profile.lifetime_points ||
        profile.total_points_earned ||
        user?.lifetime_points ||
        user?.total_points_earned ||
        0
    ),
  };
}

export default function Account() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, logout, checkUserAuth } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null);
  const [profile, setProfile] = useState(() => normalizeProfileFromUser(user));

  const isEmployee = profile?.role === 'employee';
  const isAdmin = profile?.role === 'admin';

  const customerCode =
    profile.customer_id_code || profile.customer_code || '';

  const expandedOrder = useMemo(
    () =>
      orders.find((order) => order.order_number === expandedOrderNumber) ||
      null,
    [orders, expandedOrderNumber]
  );

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  useEffect(() => {
    if (!user) return;

    setProfile(normalizeProfileFromUser(user));
  }, [user]);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;
    if (isEmployee || isAdmin || !customerCode) return;

    loadCustomerOrders(customerCode);
  }, [isLoadingAuth, isAuthenticated, isEmployee, isAdmin, customerCode]);

  const loadCustomerOrders = async (code) => {
    setOrdersLoading(true);

    try {
      const historySince = new Date();
      historySince.setDate(historySince.getDate() - CUSTOMER_ORDER_HISTORY_DAYS);

      const { data: orderRows, error: ordersError } = await supabase
        .from('orders')
        .select(
          'id, order_number, subtotal, tax_amount, total_amount, points_awarded, payment_method, order_status, employee_name, created_at'
        )
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', code)
        .eq('order_status', 'completed')
        .gte('created_at', historySince.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const safeOrders = Array.isArray(orderRows) ? orderRows : [];
      const orderNumbers = safeOrders
        .map((order) => order.order_number)
        .filter(Boolean);

      let itemsByOrderNumber = {};

      if (orderNumbers.length > 0) {
        const { data: itemRows, error: itemsError } = await supabase
          .from('order_items')
          .select(
            'id, order_number, item_name, category_name, quantity, unit_price, total_price, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID)
          .in('order_number', orderNumbers);

        if (itemsError) throw itemsError;

        itemsByOrderNumber = (Array.isArray(itemRows) ? itemRows : []).reduce(
          (groups, item) => {
            const orderNumber = item.order_number;

            if (!groups[orderNumber]) {
              groups[orderNumber] = [];
            }

            groups[orderNumber].push(item);

            return groups;
          },
          {}
        );
      }

      setOrders(
        safeOrders.map((order) => ({
          ...order,
          items: itemsByOrderNumber[order.order_number] || [],
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Could not load order history.');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isEmployee || isAdmin) {
      toast.error('Only customer accounts can be deleted here.');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser?.id) {
        throw new Error('Could not find logged-in auth user.');
      }

      const { error: customerDeleteError } = await supabase
        .from('customers')
        .delete()
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('auth_user_id', authUser.id);

      if (customerDeleteError) {
        throw customerDeleteError;
      }

      const response = await fetch('/.netlify/functions/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authUser.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete auth user.');
      }

      await supabase.auth.signOut();
      localStorage.removeItem('pitStopScannedCheckout');

      toast.success('Account permanently deleted.');

      navigate('/register', { replace: true });
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete account.');
    }
  };

  const startEditing = () => {
    setForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      birthday: profile?.birthday || '',
      address: profile?.address || '',
    });

    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        throw new Error('Could not find logged-in auth user.');
      }

      const updatedProfile = {
        ...profile,
        ...form,
      };

      if (isEmployee) {
        const { error } = await supabase
          .from('employees')
          .update({
            full_name: updatedProfile.name,
            phone: updatedProfile.phone || null,
            address: updatedProfile.address || null,
          })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('auth_user_id', authUser.id);

        if (error) throw error;
      } else if (isAdmin) {
        const { error } = await supabase
          .from('admins')
          .update({
            full_name: updatedProfile.name,
          })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('auth_user_id', authUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .update({
            name: updatedProfile.name,
            phone: updatedProfile.phone || null,
            birthday: updatedProfile.birthday || null,
            address: updatedProfile.address || null,
          })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('auth_user_id', authUser.id);

        if (error) throw error;
      }

      setProfile(updatedProfile);
      await checkUserAuth();

      setEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      console.error(error);
      toast.error('Could not update profile in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (isEmployee) {
      await logout(false);
      navigate('/employee-login', { replace: true });
      return;
    }

    if (isAdmin) {
      await logout(false);
      navigate('/admin-login', { replace: true });
      return;
    }

    await logout(false);
    navigate('/login', { replace: true });
  };

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="pb-4">
      {editing ? (
        <NativeHeader title="Edit Profile" backTo="/account" />
      ) : (
        <div className="px-5 pt-12 pb-2">
          <h1 className="text-2xl font-display font-bold">My Account</h1>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-4 bg-card rounded-2xl border border-border p-5"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>

          <div>
            <h2 className="font-display font-bold">
              {profile?.name || 'Customer'}
            </h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 h-11"
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 h-11"
                disabled={isAdmin}
              />
            </div>

            {!isAdmin && (
              <div>
                <Label className="text-sm text-muted-foreground">Birthday</Label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={(e) =>
                    setForm({ ...form, birthday: e.target.value })
                  }
                  className="mt-1 h-11"
                  disabled={isEmployee}
                />
              </div>
            )}

            {!isAdmin && (
              <div>
                <Label className="text-sm text-muted-foreground">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 h-11"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1 h-11"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                className="flex-1 h-11"
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={profile?.email} />
            <InfoRow icon={Phone} label="Phone" value={profile?.phone} />

            {!isAdmin && (
              <InfoRow
                icon={Cake}
                label="Birthday"
                value={
                  profile?.birthday
                    ? (() => {
                        const [y, m, d] = profile.birthday.split('-');
                        return new Date(y, m - 1, d).toLocaleDateString();
                      })()
                    : null
                }
              />
            )}

            {!isAdmin && (
              <InfoRow icon={MapPin} label="Address" value={profile?.address} />
            )}

            <Button
              variant="outline"
              className="w-full mt-3 h-11"
              onClick={startEditing}
            >
              Edit Profile
            </Button>
          </div>
        )}
      </motion.div>

      {!isEmployee && !isAdmin && (
        <CustomerQRCode customerIdCode={profile?.customer_id_code} />
      )}

      {!isEmployee && !isAdmin && (
        <div className="grid grid-cols-2 gap-3 px-5 mt-4">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <Gift className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-display font-bold">
              {profile?.points_balance || 0}
            </p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-display font-bold">
              {ordersLoading ? '...' : orders.length}
            </p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
        </div>
      )}

      {!isEmployee && !isAdmin && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-display font-bold">Order History</h2>
              <p className="text-xs text-muted-foreground">
                Showing your last 14 days of completed orders.
              </p>
            </div>

            <ReceiptText className="w-5 h-5 text-primary" />
          </div>

          <div className="space-y-3">
            {ordersLoading ? (
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-sm text-muted-foreground">
                  Loading order history...
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-5 text-center">
                <PackageOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold">No orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed checkouts from the last 14 days will appear here.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderNumber === order.order_number;

                return (
                  <div
                    key={order.id || order.order_number}
                    className="bg-card rounded-2xl border border-border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderNumber(isExpanded ? null : order.order_number)
                      }
                      className="w-full p-4 text-left hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display font-bold">
                            {order.order_number || 'Order'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-display font-bold text-primary">
                            ${money(getOrderTotal(order))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getOrderPoints(order)} pts earned
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {order.items?.length || 0}{' '}
                          {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                        </span>

                        <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t border-border"
                        >
                          <OrderDetails order={order} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="px-5 mt-6 space-y-2">
        <LinkRow label="Privacy Policy" href="#" />
        <LinkRow label="Terms of Service" href="#" />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full p-3 bg-card rounded-xl border border-border text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>

        {!isEmployee && !isAdmin && (
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-3 w-full p-3 bg-card rounded-xl border border-border text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Delete Account</span>
          </button>
        )}
      </div>
    </div>
  );
}

function OrderDetails({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="p-4 bg-muted/20 space-y-4">
      <div className="rounded-xl bg-background border border-border p-3">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Receipt Details</p>
        </div>

        <div className="space-y-2 text-sm">
          <ReceiptRow label="Order Number" value={order.order_number || '—'} />
          <ReceiptRow label="Completed" value={formatDateTime(order.created_at)} />
          <ReceiptRow
            label="Employee"
            value={order.employee_name || 'Employee'}
          />
          <ReceiptRow
            label="Status"
            value={order.order_status || 'completed'}
          />
        </div>
      </div>

      <div className="rounded-xl bg-background border border-border p-3">
        <div className="flex items-center gap-2 mb-3">
          <PackageOpen className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Items Ordered</p>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No item details were saved for this order.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id || `${item.order_number}-${item.item_name}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {Number(item.quantity || 1)}× {item.item_name || 'Item'}
                  </p>

                  {item.category_name && (
                    <p className="text-xs text-muted-foreground">
                      {item.category_name}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    ${money(item.unit_price)} each
                  </p>
                </div>

                <p className="font-semibold">${money(item.total_price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-background border border-border p-3 space-y-2">
        <ReceiptRow label="Subtotal" value={`$${money(getOrderSubtotal(order))}`} />
        <ReceiptRow label="Tax" value={`$${money(getOrderTax(order))}`} />

        <div className="h-px bg-border my-2" />

        <ReceiptRow
          label="Total"
          value={`$${money(getOrderTotal(order))}`}
          strong
        />

        <div className="flex items-center justify-between pt-2 text-sm text-primary font-semibold">
          <span className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Points Earned
          </span>
          <span>{getOrderPoints(order)} pts</span>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, strong = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 text-sm ${
        strong ? 'font-bold text-base' : ''
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 min-h-[52px]">
      <Icon className="w-5 h-5 text-muted-foreground" />

      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

function LinkRow({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between min-h-[52px] px-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>

      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </a>
  );
}
