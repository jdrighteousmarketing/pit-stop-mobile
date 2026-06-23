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
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const managementTools = [
  { path: '/admin/menu', icon: UtensilsCrossed, label: 'Menu', desc: 'Add, edit & organize menu items', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30', iconColor: 'text-orange-400' },
  { path: '/admin/rewards', icon: Gift, label: 'Rewards', desc: 'Configure loyalty rewards & points', color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30', iconColor: 'text-violet-400' },
  { path: '/admin/promotions', icon: Tag, label: 'Promotions', desc: 'Manage deals, coupons & offers', color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30', iconColor: 'text-emerald-400' },
  { path: '/admin/customers', icon: Users, label: 'Customers', desc: 'View profiles & loyalty data', color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30', iconColor: 'text-blue-400' },
  { path: '/admin/scanner', icon: ScanLine, label: 'Scanner', desc: 'Scan QR codes & add points', color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30', iconColor: 'text-rose-400' },
  { path: '/admin/settings', icon: Settings, label: 'Settings', desc: 'Business info, hours & branding', color: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30', iconColor: 'text-slate-400' },
];

export default function Dashboard() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ['adminDashboardStats', RESTAURANT_ID],
    queryFn: async () => {
      const [
        restaurantResult,
        customersResult,
        transactionsResult,
        ordersResult,
        menuItemsResult,
        rewardsResult,
        promotionsResult,
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select('business_name, businessName')
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle(),

        supabase
  .from('customers')
  .select('id', { count: 'exact', head: true })
  .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('point_transactions')
          .select('points, type')
          .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('orders')
          .select('*')
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
      if (transactionsResult.error) console.error('Transactions error:', transactionsResult.error);
      if (ordersResult.error) console.error('Orders error:', ordersResult.error);
      if (menuItemsResult.error) console.error('Menu items error:', menuItemsResult.error);
      if (rewardsResult.error) console.error('Rewards error:', rewardsResult.error);
      if (promotionsResult.error) console.error('Promotions error:', promotionsResult.error);

      const transactions = transactionsResult.data || [];

      const totalPointsIssued = transactions
        .filter((t) => t.type === 'earned' || t.type === 'birthday_bonus')
        .reduce((sum, t) => sum + Number(t.points || 0), 0);

      return {
        businessName:
          restaurantResult.data?.business_name ||
          restaurantResult.data?.businessName ||
          'Owner Dashboard',
        customersCount: customersResult.count || 0,
        totalPointsIssued,
        orders: ordersResult.data || [],
        menuItemsCount: menuItemsResult.count || 0,
        rewardsCount: rewardsResult.count || 0,
        promotionsCount: promotionsResult.count || 0,
        transactionsCount: transactions.length,
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
      label: 'Points Issued',
      value: isLoading ? '...' : Number(data.totalPointsIssued || 0).toLocaleString(),
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
                {orders.map((order) => (
                  <div key={order.id} className="flex justify-between border-b border-border/50 pb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} items
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-primary">
                      ${Number(order.total || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
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
                <span className="text-muted-foreground">Orders Completed</span>
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