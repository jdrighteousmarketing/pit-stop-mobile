// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Gift,
  Tag,
  UtensilsCrossed,
  Settings,
  ScanLine,
  Star,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const managementTools = [
  {
    path: '/admin/menu',
    icon: UtensilsCrossed,
    label: 'Menu',
    desc: 'Add, edit & organize menu items',
    color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    path: '/admin/rewards',
    icon: Gift,
    label: 'Rewards',
    desc: 'Configure loyalty rewards & points',
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    path: '/admin/promotions',
    icon: Tag,
    label: 'Promotions',
    desc: 'Manage deals, coupons & offers',
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    path: '/admin/customers',
    icon: Users,
    label: 'Customers',
    desc: 'View profiles & loyalty data',
    color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    path: '/admin/scanner',
    icon: ScanLine,
    label: 'Scanner',
    desc: 'Scan QR codes & add points',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  {
    path: '/admin/settings',
    icon: Settings,
    label: 'Settings',
    desc: 'Business info, hours & branding',
    color: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30',
    iconColor: 'text-slate-400',
  },
];

function money(value) {
  return Number(value || 0).toFixed(2);
}

function formatOrderDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return format(date, 'MMM d • h:mm a');
}

function getCustomerDisplayName(order) {
  return (
    order.customer_name ||
    order.customer?.name ||
    order.customer?.email ||
    order.customer_code ||
    'Customer'
  );
}

export default function Dashboard() {
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data = {}, isLoading } = useQuery({
    queryKey: ['adminDashboardStats', RESTAURANT_ID, todayStart],
    queryFn: async () => {
      const [
        restaurantResult,
        customersResult,
        todayTransactionsResult,
        allTransactionsResult,
        ordersResult,
        menuItemsResult,
        rewardsResult,
        promotionsResult,
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select('business_name, name')
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle(),

        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('points_transactions')
          .select('points_amount, transaction_type, created_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('transaction_type', 'earned')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),

        supabase
          .from('points_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('orders')
          .select(
            'id, order_number, customer_code, customer_name, subtotal, tax_amount, total_amount, total, points_awarded, order_status, employee_name, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('menu_items')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('rewards')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('is_active', true),

        supabase
          .from('promotions')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('is_active', true),
      ]);

      if (restaurantResult.error) console.error('Restaurant error:', restaurantResult.error);
      if (customersResult.error) console.error('Customers error:', customersResult.error);
      if (todayTransactionsResult.error) console.error('Today transactions error:', todayTransactionsResult.error);
      if (allTransactionsResult.error) console.error('All transactions error:', allTransactionsResult.error);
      if (ordersResult.error) console.error('Orders error:', ordersResult.error);
      if (menuItemsResult.error) console.error('Menu items error:', menuItemsResult.error);
      if (rewardsResult.error) console.error('Rewards error:', rewardsResult.error);
      if (promotionsResult.error) console.error('Promotions error:', promotionsResult.error);

      const todayTransactions = todayTransactionsResult.data || [];

      const pointsIssuedToday = todayTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.points_amount || 0),
        0
      );

      const recentOrders = Array.isArray(ordersResult.data)
        ? ordersResult.data
        : [];

      const customerCodes = [
        ...new Set(
          recentOrders
            .map((order) => order.customer_code)
            .filter(Boolean)
        ),
      ];

      let customersByCode = {};

      if (customerCodes.length > 0) {
        const { data: customerRows, error: customerLookupError } = await supabase
          .from('customers')
          .select('customer_code, name, email')
          .eq('restaurant_id', RESTAURANT_ID)
          .in('customer_code', customerCodes);

        if (customerLookupError) {
          console.error('Recent order customer lookup error:', customerLookupError);
        }

        customersByCode = (Array.isArray(customerRows) ? customerRows : []).reduce(
          (groups, customer) => {
            groups[customer.customer_code] = customer;
            return groups;
          },
          {}
        );
      }

      const enrichedOrders = recentOrders.map((order) => ({
        ...order,
        customer: customersByCode[order.customer_code] || null,
      }));

      return {
        businessName:
          restaurantResult.data?.business_name ||
          restaurantResult.data?.name ||
          'Owner Dashboard',
        customersCount: customersResult.count || 0,
        pointsIssuedToday,
        orders: enrichedOrders,
        menuItemsCount: menuItemsResult.count || 0,
        rewardsCount: rewardsResult.count || 0,
        promotionsCount: promotionsResult.count || 0,
        transactionsCount: allTransactionsResult.count || 0,
      };
    },
  });

  const stats = [
    {
      label: 'Members',
      value: isLoading ? '...' : data.customersCount || 0,
      icon: Users,
      color: 'text-blue-400',
      path: '/admin/customers',
    },
    {
      label: 'Points Issued Today',
      value: isLoading ? '...' : Number(data.pointsIssuedToday || 0).toLocaleString(),
      icon: Star,
      color: 'text-amber-400',
      path: '/admin/customers',
    },
    {
      label: 'Active Promos',
      value: isLoading ? '...' : data.promotionsCount || 0,
      icon: Zap,
      color: 'text-emerald-400',
      path: '/admin/promotions',
    },
    {
      label: 'Menu Items',
      value: isLoading ? '...' : data.menuItemsCount || 0,
      icon: UtensilsCrossed,
      color: 'text-orange-400',
      path: '/admin/menu',
    },
  ];

  const orders = data.orders || [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1">
          Welcome back
        </p>

        <h1 className="text-3xl font-display font-bold tracking-wide">
          {data.businessName || 'Owner Dashboard'}
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color, path }) => (
          <Link key={label} to={path}>
            <Card className="border-border/60 hover:scale-[1.02] transition-transform duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>

                <div>
                  <p className="text-xl font-display font-bold leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-4">
          Management Tools
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {managementTools.map(({ path, icon: Icon, label, desc, color, iconColor }) => (
            <Link key={path} to={path}>
              <div className={`group relative p-5 rounded-2xl border bg-gradient-to-br ${color} hover:scale-[1.02] transition-all duration-200 cursor-pointer`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-background/40 backdrop-blur flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="font-display font-bold text-lg tracking-wide leading-none">
                  {label}
                </p>

                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                  {desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-3">
              Recent Orders
            </h2>

            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders scanned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const customerName = getCustomerDisplayName(order);
                  const customerCode = order.customer_code || 'No customer code';
                  const orderTotal = Number(order.total_amount || order.total || 0);
                  const orderDate = formatOrderDate(order.created_at);

                  return (
                    <div
                      key={order.id || order.order_number}
                      className="flex items-start justify-between gap-3 border-b border-border/50 pb-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {customerName}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {customerCode}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Order #{order.order_number || 'N/A'}
                        </p>

                        {orderDate && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {orderDate}
                          </p>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-primary shrink-0">
                        ${money(orderTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-3">
              Rewards Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available Rewards</span>
                <span className="font-semibold">
                  {isLoading ? '...' : data.rewardsCount || 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Point Transactions</span>
                <span className="font-semibold">
                  {isLoading ? '...' : data.transactionsCount || 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Recent Orders Shown</span>
                <span className="font-semibold">
                  {isLoading ? '...' : orders.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
