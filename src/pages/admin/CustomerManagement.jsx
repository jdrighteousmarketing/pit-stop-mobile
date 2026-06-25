import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Download, Users, Mail, Phone, Cake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

function safeDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
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

export default function CustomerManagement() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['adminCustomersSupabase'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    initialData: [],
  });

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;

    const s = search.toLowerCase();

    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.phone || '').toLowerCase().includes(s) ||
      (c.customer_code || '').toLowerCase().includes(s) ||
      (c.customer_id_code || '').toLowerCase().includes(s)
    );
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dateA = new Date(a.created_at || a.created_date || 0).getTime();
    const dateB = new Date(b.created_at || b.created_date || 0).getTime();
    return dateB - dateA;
  });

  const upcomingBirthdays = customers
    .map(birthdayInfo)
    .filter(Boolean)
    .filter((c) => c.daysUntil <= 30)
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
      'Customer Code',
      'Join Date',
    ];

    const rows = customers.map((c) => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.birthday || '',
      c.address || '',
      c.points_balance || 0,
      c.lifetime_points || c.total_points_earned || 0,
      c.lifetime_spend || 0,
      c.visit_count || 0,
      c.customer_code || c.customer_id_code || '',
      safeDate(c.created_at || c.created_date),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
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

      <div className="space-y-2">
        {isLoading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-16 bg-card rounded-xl border animate-pulse"
              />
            ))
        ) : sortedCustomers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No customers found
            </CardContent>
          </Card>
        ) : (
          sortedCustomers.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCustomer(c)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(c.name || c.email || '?')[0].toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email || 'No email'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.customer_code || c.customer_id_code || 'No customer code'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge variant="outline">
                    {Number(c.points_balance || 0).toLocaleString()} pts
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Joined {safeDate(c.created_at || c.created_date)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {(selectedCustomer.name || selectedCustomer.email || '?')[0].toUpperCase()}
                </div>

                <div>
                  <p className="font-bold">{selectedCustomer.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedCustomer.customer_code || selectedCustomer.customer_id_code || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.email || '—'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.phone || '—'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-muted-foreground" />
                  {safeBirthday(selectedCustomer.birthday)}
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.address || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">
                    {Number(selectedCustomer.points_balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Current Points</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">
                    {Number(
                      selectedCustomer.lifetime_points ||
                        selectedCustomer.total_points_earned ||
                        0
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Lifetime Points</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">
                    ${Number(selectedCustomer.lifetime_spend || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lifetime Spend</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">
                    {Number(selectedCustomer.visit_count || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}