// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Search,
  Download,
  Users,
  Mail,
  Phone,
  Cake,
  MapPin,
  ReceiptText,
  PackageOpen,
  Coins,
  Store,
  Star,
  CalendarClock,
  DollarSign,
  ShoppingBag,
  Trophy,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const RESTAURANT_ID = 'pit_stop_mobile';

function money(value) {
  return Number(value || 0).toFixed(2);
}

function safeDate(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString();
}

function safeDateTime(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function safeBirthday(value) {
  if (!value) return 'Unknown';

  const parts = String(value).split('-').map(Number);

  if (parts.length < 3) return 'Unknown';

  const [year, month, day] = parts;

  if (!year || !month || !day) return 'Unknown';

  return `${month}/${day}/${year}`;
}

function birthdayInfo(customer) {
  if (!customer?.birthday) return null;

  const parts = customer.birthday.split('-').map(Number);

  if (parts.length < 3) return null;

  const [, month, day] = parts;

  if (!month || !day) return null;

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const nextBirthday = new Date(
    today.getFullYear(),
    month - 1,
    day
  );

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const daysUntil = Math.ceil(
    (nextBirthday.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return {
    ...customer,
    nextBirthday,
    daysUntil,
  };
}

function getCustomerCode(customer) {
  return customer?.customer_code || customer?.customer_id_code || '';
}

function getCustomerName(customer) {
  return customer?.name || customer?.full_name || customer?.email || 'Unknown';
}

function getInitial(customer) {
  return (getCustomerName(customer) || '?')[0].toUpperCase();
}

function getOrderTotal(order) {
  return Number(order?.total_amount ?? order?.total ?? 0);
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

function getVipLabel(summary) {
  const spent = Number(summary?.lifetimeSpend || 0);
  const orders = Number(summary?.ordersCount || 0);

  if (spent >= 500 || orders >= 25) return 'VIP Customer';
  if (spent >= 200 || orders >= 10) return 'Loyal Customer';
  if (orders >= 1) return 'Active Customer';

  return 'New Customer';
}

function getRelativeLastVisit(value) {
  if (!value) return 'No visits yet';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'No visits yet';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;

  return safeDate(value);
}

export default function CustomerManagement() {
  const [search, setSearch] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(null);
  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null);

  const { data = { customers: [], orders: [], orderItems: [] }, isLoading } = useQuery({
    queryKey: ['adminCustomersCRM', RESTAURANT_ID],
    queryFn: async () => {
      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .order('created_at', { ascending: false }),

        supabase
          .from('orders')
          .select(
            'id, order_number, customer_code, subtotal, tax_amount, total_amount, points_awarded, payment_method, order_status, employee_name, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID)
          .order('created_at', { ascending: false }),
      ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
      const orderNumbers = orders.map((order) => order.order_number).filter(Boolean);

      let orderItems = [];

      if (orderNumbers.length > 0) {
        const { data: itemRows, error: itemsError } = await supabase
          .from('order_items')
          .select(
            'id, order_number, item_name, category_name, quantity, unit_price, total_price, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID)
          .in('order_number', orderNumbers);

        if (itemsError) {
          throw itemsError;
        }

        orderItems = Array.isArray(itemRows) ? itemRows : [];
      }

      return {
        customers: customersResult.data || [],
        orders,
        orderItems,
      };
    },
    initialData: { customers: [], orders: [], orderItems: [] },
  });

  const customers = data.customers || [];
  const allOrders = data.orders || [];
  const allOrderItems = data.orderItems || [];

  const ordersByCustomerCode = useMemo(() => {
    return allOrders.reduce((groups, order) => {
      const code = order.customer_code;

      if (!code) return groups;

      if (!groups[code]) {
        groups[code] = [];
      }

      groups[code].push(order);

      return groups;
    }, {});
  }, [allOrders]);

  const itemsByOrderNumber = useMemo(() => {
    return allOrderItems.reduce((groups, item) => {
      const orderNumber = item.order_number;

      if (!orderNumber) return groups;

      if (!groups[orderNumber]) {
        groups[orderNumber] = [];
      }

      groups[orderNumber].push(item);

      return groups;
    }, {});
  }, [allOrderItems]);

  const customerSummaries = useMemo(() => {
    return customers.map((customer) => {
      const customerCode = getCustomerCode(customer);
      const customerOrders = ordersByCustomerCode[customerCode] || [];

      const ordersWithItems = customerOrders.map((order) => ({
        ...order,
        items: itemsByOrderNumber[order.order_number] || [],
      }));

      const orderBasedLifetimeSpend = ordersWithItems.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0
      );

      const lifetimeSpend =
        Number(customer.lifetime_spend || 0) || orderBasedLifetimeSpend;

      const ordersCount =
        ordersWithItems.length || Number(customer.visit_count || 0);

      const averageTicket = ordersCount > 0 ? lifetimeSpend / ordersCount : 0;

      const lastVisit =
        ordersWithItems[0]?.created_at || customer.last_visit_at || null;

      const itemCounts = {};
      const itemSpend = {};

      ordersWithItems.forEach((order) => {
        const items = Array.isArray(order.items) ? order.items : [];

        items.forEach((item) => {
          const itemName = item.item_name || 'Item';
          const quantity = Number(item.quantity || 1);

          itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
          itemSpend[itemName] =
            (itemSpend[itemName] || 0) + Number(item.total_price || 0);
        });
      });

      const favoriteItem =
        Object.entries(itemCounts).sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return (itemSpend[b[0]] || 0) - (itemSpend[a[0]] || 0);
        })[0]?.[0] || 'Not enough data yet';

      const summary = {
        customer,
        customerCode,
        orders: ordersWithItems,
        lifetimeSpend,
        ordersCount,
        averageTicket,
        lastVisit,
        favoriteItem,
      };

      return {
        ...summary,
        vipLabel: getVipLabel(summary),
      };
    });
  }, [customers, ordersByCustomerCode, itemsByOrderNumber]);

  const filteredSummaries = customerSummaries.filter(({ customer, customerCode }) => {
    if (!search) return true;

    const s = search.toLowerCase();

    return (
      (customer.name || '').toLowerCase().includes(s) ||
      (customer.full_name || '').toLowerCase().includes(s) ||
      (customer.email || '').toLowerCase().includes(s) ||
      (customer.phone || '').toLowerCase().includes(s) ||
      (customerCode || '').toLowerCase().includes(s)
    );
  });

  const sortedSummaries = [...filteredSummaries].sort((a, b) => {
    const dateA = new Date(a.customer.created_at || a.customer.created_date || 0).getTime();
    const dateB = new Date(b.customer.created_at || b.customer.created_date || 0).getTime();

    return dateB - dateA;
  });

  const selectedSummary =
    customerSummaries.find(
      (summary) => summary.customerCode === selectedCustomerCode
    ) || null;

  const upcomingBirthdays = customers
    .map(birthdayInfo)
    .filter(Boolean)
    .filter((c) => c.daysUntil >= 0 && c.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const exportCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Birthday',
      'Address',
      'Points Balance',
      'Lifetime Points',
      'Lifetime Spend',
      'Visit Count',
      'Average Ticket',
      'Favorite Item',
      'Last Visit',
      'Customer Code',
      'Join Date',
    ];

    const rows = customerSummaries.map((summary) => {
      const c = summary.customer;

      return [
        getCustomerName(c),
        c.email || '',
        c.phone || '',
        c.birthday || '',
        c.address || '',
        c.points_balance || 0,
        c.lifetime_points || c.total_points_earned || 0,
        summary.lifetimeSpend || 0,
        summary.ordersCount || 0,
        money(summary.averageTicket),
        summary.favoriteItem || '',
        summary.lastVisit ? safeDateTime(summary.lastVisit) : '',
        summary.customerCode || '',
        safeDate(c.created_at || c.created_date),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} total customers
          </p>
        </div>

        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Export Customers
        </Button>
      </div>

      {upcomingBirthdays.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-500" />
              Upcoming Birthdays
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcomingBirthdays.map((c) => (
                <div
                  key={c.id}
                  className="min-w-[180px] bg-pink-50 dark:bg-pink-950/20 rounded-xl p-3 border border-pink-200/50 dark:border-pink-800/30"
                >
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-pink-100">
                    {c.name || 'Unknown'}
                  </p>

                  <p className="text-xs text-gray-600 dark:text-pink-200 mt-1">
                    {safeBirthday(c.birthday)}
                  </p>

                  <Badge className="mt-2 text-[10px] bg-pink-500/10 text-pink-600 w-fit">
                    {c.daysUntil === 0 ? 'Today!' : `${c.daysUntil}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

        <Input
          placeholder="Search by name, email, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2 w-full min-w-0 overflow-x-hidden">
        {isLoading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-16 bg-card rounded-xl border animate-pulse"
              />
            ))
        ) : sortedSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No customers found
            </CardContent>
          </Card>
        ) : (
          sortedSummaries.map((summary) => {
            const c = summary.customer;

            return (
              <Card
                key={c.id || summary.customerCode}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedCustomerCode(summary.customerCode);
                  setExpandedOrderNumber(null);
                }}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {getInitial(c)}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getCustomerName(c)}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {c.email || 'No email'}
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        {summary.customerCode || 'No customer code'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant="outline">
                      {Number(c.points_balance || 0).toLocaleString()} pts
                    </Badge>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      ${money(summary.lifetimeSpend)} lifetime
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={!!selectedSummary}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCustomerCode(null);
            setExpandedOrderNumber(null);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-4xl max-h-[92dvh] overflow-y-auto overflow-x-hidden p-0 sm:p-6">
          <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
            <DialogTitle className="text-base sm:text-lg">Customer Business Profile</DialogTitle>
          </DialogHeader>

          {selectedSummary && (
            <CustomerBusinessProfile
              summary={selectedSummary}
              expandedOrderNumber={expandedOrderNumber}
              setExpandedOrderNumber={setExpandedOrderNumber}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerBusinessProfile({
  summary,
  expandedOrderNumber,
  setExpandedOrderNumber,
}) {
  const customer = summary.customer;

  return (
    <div className="space-y-4 w-full min-w-0 overflow-x-hidden px-4 pb-4 sm:px-0 sm:pb-0">
      <Card className="overflow-hidden border-primary/30 w-full min-w-0">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 sm:p-5 border-b border-border overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-xl font-display font-bold text-primary shrink-0">
                  {getInitial(customer)}
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-display font-bold break-words leading-tight">
                    {getCustomerName(customer)}
                  </h2>

                  <p className="text-xs text-muted-foreground break-all">
                    {summary.customerCode || 'No customer code'}
                  </p>

                  <p className="text-xs text-muted-foreground break-all">
                    {customer.email || 'No email'}
                  </p>
                </div>
              </div>

              <Badge className="shrink-0 gap-1 w-fit max-w-full">
                <Star className="w-3 h-3" />
                {summary.vipLabel}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm min-w-0">
              <ProfileLine icon={Mail} value={customer.email || 'No email'} />
              <ProfileLine icon={Phone} value={customer.phone || 'No phone'} />
              <ProfileLine
                icon={Cake}
                value={
                  customer.birthday
                    ? `Birthday ${safeBirthday(customer.birthday)}`
                    : 'No birthday'
                }
              />
              <ProfileLine
                icon={MapPin}
                value={customer.address || 'No address'}
              />
            </div>

            <div className="mt-3">
              <Badge variant="outline">
                Joined {safeDate(customer.created_at || customer.created_date)}
              </Badge>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
            <InsightTile
              icon={Coins}
              label="Current Points"
              value={Number(customer.points_balance || 0).toLocaleString()}
            />

            <InsightTile
              icon={DollarSign}
              label="Lifetime Spent"
              value={`$${money(summary.lifetimeSpend)}`}
            />

            <InsightTile
              icon={ShoppingBag}
              label="Orders"
              value={summary.ordersCount}
            />

            <InsightTile
              icon={ReceiptText}
              label="Avg Ticket"
              value={`$${money(summary.averageTicket)}`}
            />

            <InsightTile
              icon={Heart}
              label="Favorite Item"
              value={summary.favoriteItem}
              wide
            />

            <InsightTile
              icon={CalendarClock}
              label="Last Visit"
              value={getRelativeLastVisit(summary.lastVisit)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" />
            Full Order History
          </CardTitle>
        </CardHeader>

        <CardContent>
          {summary.orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <PackageOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">No orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Completed customer checkouts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.orders.map((order) => {
                const isExpanded = expandedOrderNumber === order.order_number;

                return (
                  <div
                    key={order.id || order.order_number}
                    className="rounded-2xl border border-border overflow-hidden bg-card"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderNumber(isExpanded ? null : order.order_number)
                      }
                      className="w-full p-4 text-left hover:bg-muted/40 transition-colors min-w-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                        <div>
                          <p className="font-display font-bold">
                            {order.order_number || 'Order'}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {safeDateTime(order.created_at)}
                          </p>
                        </div>

                        <div className="text-left sm:text-right min-w-0">
                          <p className="font-display font-bold text-primary">
                            ${money(getOrderTotal(order))}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {getOrderPoints(order)} pts earned
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground min-w-0">
                        <span>
                          {order.items?.length || 0}{' '}
                          {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                        </span>

                        <span className="flex items-center gap-1 w-fit">
                          {isExpanded ? 'Hide receipt' : 'View receipt'}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </span>
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
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileLine({ icon: Icon, value }) {
  return (
    <div className="flex items-start gap-2 min-w-0 text-muted-foreground overflow-hidden">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="min-w-0 break-words leading-snug">{value}</span>
    </div>
  );
}

function InsightTile({ icon: Icon, label, value, wide = false }) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-3 min-w-0 overflow-hidden ${
        wide ? 'lg:col-span-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary shrink-0" />

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="text-sm font-display font-bold break-words leading-snug">
        {value || '—'}
      </p>
    </div>
  );
}

function OrderDetails({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="p-3 sm:p-4 bg-muted/20 space-y-4 w-full min-w-0 overflow-x-hidden">
      <div className="rounded-xl bg-background border border-border p-3">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4 text-primary" />

          <p className="text-sm font-semibold">Receipt Details</p>
        </div>

        <div className="space-y-2 text-sm">
          <ReceiptRow label="Order Number" value={order.order_number || '—'} />
          <ReceiptRow label="Completed" value={safeDateTime(order.created_at)} />
          <ReceiptRow label="Employee" value={order.employee_name || 'Employee'} />
          <ReceiptRow label="Status" value={order.order_status || 'completed'} />
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
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 text-sm min-w-0"
              >
                <div>
                  <p className="font-medium break-words">
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

                <p className="font-semibold shrink-0">${money(item.total_price)}</p>
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
      className={`flex items-start justify-between gap-3 text-sm min-w-0 ${
        strong ? 'font-bold text-base' : ''
      }`}
    >
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-words min-w-0">{value || '—'}</span>
    </div>
  );
}
