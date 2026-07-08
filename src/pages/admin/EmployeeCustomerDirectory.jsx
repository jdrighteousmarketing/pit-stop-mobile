import { restaurantConfig } from '@/config/restaurantConfig';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Cake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

function safeDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
}

function safeBirthday(value) {
  if (!value) return '—';

  const parts = String(value).split('-').map(Number);

  if (parts.length < 3) return '—';

  const [year, month, day] = parts;

  if (!year || !month || !day) return '—';

  return `${month}/${day}/${year}`;
}

function getBirthdayInfo(customer) {
  if (!customer?.birthday) return null;

  const parts = String(customer.birthday).split('-').map(Number);

  if (parts.length < 3) return null;

  const [, month, day] = parts;

  if (!month || !day) return null;

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const birthdayThisYear = new Date(
    today.getFullYear(),
    month - 1,
    day
  );

  if (Number.isNaN(birthdayThisYear.getTime())) return null;

  if (birthdayThisYear < today) {
    birthdayThisYear.setFullYear(today.getFullYear() + 1);
  }

  return {
    ...customer,
    nextBirthday: birthdayThisYear,
    daysUntil: Math.ceil(
      (birthdayThisYear - today) / (1000 * 60 * 60 * 24)
    ),
  };
}

export default function EmployeeCustomerDirectory() {
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['employeeCustomersDirectory', RESTAURANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load customers:', error);
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

  const upcomingBirthdays = customers
  .map(getBirthdayInfo)
  .filter(Boolean)
  .filter((c) => c.daysUntil >= 0 && c.daysUntil <= 30)
  .sort((a, b) => a.daysUntil - b.daysUntil)
  .slice(0, 5);

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dateA = new Date(a.created_at || a.created_date || 0).getTime();
    const dateB = new Date(b.created_at || b.created_date || 0).getTime();

    return dateB - dateA;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Customer Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} total customers
          </p>
        </div>
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
                  className="min-w-[180px] bg-pink-50 dark:bg-pink-950/20 rounded-xl p-3 border border-pink-200/50 dark:border-pink-800/30 flex flex-col"
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
            <Card key={c.id}>
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
                      {c.customer_code ||
                        c.customer_id_code ||
                        'No customer code'}
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
    </div>
  );
}