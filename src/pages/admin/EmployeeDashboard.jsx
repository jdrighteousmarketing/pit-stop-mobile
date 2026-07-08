import { restaurantConfig } from '@/config/restaurantConfig';
import { Users, ScanLine, ArrowRight, User, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

const employeeTools = [
  {
    path: '/admin/scanner',
    icon: ScanLine,
    label: 'Scanner',
    desc: 'Scan QR codes & add points',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  {
    path: '/admin/customer-directory',
    icon: Users,
    label: 'Customers',
    desc: 'View customer profiles',
    color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    path: '/admin/employee-account',
    icon: User,
    label: 'Account',
    desc: 'View and update your employee info',
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
];

function safeDate(value) {
  if (!value) return '--';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return format(date, 'MMM d');
}

function castDate(value) {
  return value || null;
}

export default function EmployeeDashboard() {
  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (error) {
        console.error(error);
        return null;
      }

      return data;
    },
    initialData: null,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['employeeCustomers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return [];
      }

      return data || [];
    },
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['employeeTransactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error(error);
        return [];
      }

      return data || [];
    },
    initialData: [],
  });

  const recentCustomers = [...customers]
    .filter((c) => c.created_at || c.created_date)
    .sort((a, b) => {
      const dateA = new Date(castDate(a.created_at || a.created_date)).getTime();
      const dateB = new Date(castDate(b.created_at || b.created_date)).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p
          className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Employee Portal
        </p>

        <h1 className="text-3xl font-display font-bold tracking-wide">
          {settings?.name || settings?.business_name || 'Dashboard'}
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>

            <div>
              <p className="text-xl font-display font-bold leading-none">
                {customers.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Members</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5 text-rose-400" />
            </div>

            <div>
              <p className="text-xl font-display font-bold leading-none">
                {transactions.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recent Activity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2
          className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Quick Access
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {employeeTools.map(
            ({ path, icon: Icon, label, desc, color, iconColor }, i) => (
              <motion.div
                key={path}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={path}>
                  <div
                    className={`group relative p-5 rounded-2xl border bg-gradient-to-br ${color} hover:scale-[1.02] transition-all duration-200 cursor-pointer`}
                  >
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
              </motion.div>
            )
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-semibold tracking-widest uppercase text-muted-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Recent Members
          </h2>

          <Link
            to="/admin/customer-directory"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-0">
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No members yet
              </p>
            ) : (
              <div>
                {recentCustomers.map((c, i) => (
                  <div
                    key={c.id || c.customer_code || i}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i !== recentCustomers.length - 1
                        ? 'border-b border-border/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>

                      <div>
                        <p className="text-sm font-medium leading-none">
                          {c.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.email || 'No email'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-primary">
                        {Number(c.points_balance || 0).toLocaleString()} pts
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {safeDate(c.created_at || c.created_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
