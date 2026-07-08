// @ts-nocheck
import { restaurantConfig } from '@/config/restaurantConfig';
import { useMemo, useState } from 'react';
import CustomerAnalyticsCard from '@/components/businessInsights/cards/CustomerAnalyticsCard';
import MenuPerformanceCard from '@/components/businessInsights/cards/MenuPerformanceCard';
import RewardsAnalyticsCard from '@/components/businessInsights/cards/RewardsAnalyticsCard';
import SalesAnalyticsCard from '@/components/businessInsights/cards/SalesAnalyticsCard';
import TopCustomersCard from '@/components/businessInsights/cards/TopCustomersCard';
import Section from '@/components/businessInsights/cards/Section';
import { useQuery } from '@tanstack/react-query';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Activity,
  BarChart3,
  LineChart as LineChartIcon,
  Repeat2,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';

import { money, number } from '@/components/businessInsights/utils/formatters';

import {
  getOrderTotal,
  getPointAmount,
  isInRange,
} from '@/components/businessInsights/utils/calculations';
import { Card, CardContent } from '@/components/ui/card';
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isSameMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

const CHART_COLORS = {
  gold: '#f59e0b',
  goldSoft: '#fbbf24',
  green: '#22c55e',
  purple: '#8b5cf6',
  mutedBar: '#e7ded4',
};

const BUSY_DAY_COLORS = {
  busiest: CHART_COLORS.gold,
  normal: 'rgba(231, 222, 212, 0.72)',
};

function EmptyChartState({ message = 'No chart data yet.' }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function ChartCard({ icon: Icon, title, subtitle, children }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/90 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-muted-foreground">
          {item.name}: ${money(item.value)}
        </p>
      ))}
    </div>
  );
}

function NumberTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-muted-foreground">
          {item.name}: {number(item.value)}
        </p>
      ))}
    </div>
  );
}

function hasChartData(rows, keys = ['value']) {
  return rows?.some((row) => keys.some((key) => Number(row?.[key] || 0) > 0));
}

function buildDailySalesTrend(orders, startDate, endDate) {
  return eachDayOfInterval({ start: startDate, end: endDate }).map((day) => {
    const dayStart = startOfDay(day).toISOString();
    const dayEnd = endOfDay(day).toISOString();
    const dayOrders = orders.filter((order) => isInRange(order.created_at, dayStart, dayEnd));

    return {
      label: format(day, 'MMM d'),
      sales: dayOrders.reduce((sum, order) => sum + getOrderTotal(order), 0),
      orders: dayOrders.length,
    };
  });
}

function buildCustomerGrowth(customers, startDate, endDate) {
  return eachDayOfInterval({ start: startDate, end: endDate }).map((day) => {
    const dayEnd = endOfDay(day);
    const total = customers.filter((customer) => {
      if (!customer.created_at) return false;
      const createdAt = new Date(customer.created_at);
      return !Number.isNaN(createdAt.getTime()) && createdAt <= dayEnd;
    }).length;

    return {
      label: format(day, 'MMM d'),
      customers: total,
    };
  });
}

function buildBusyDays(orders) {
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totals = weekdayOrder.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});

  orders.forEach((orderRow) => {
    if (!orderRow.created_at) return;
    const day = format(new Date(orderRow.created_at), 'EEE');
    totals[day] = (totals[day] || 0) + 1;
  });

  return weekdayOrder.map((day) => ({ label: day, orders: totals[day] || 0 }));
}


function getMonthKey(date) {
  return format(date, 'yyyy-MM');
}

const ANALYTICS_START_YEAR = 2026;

function getAnalyticsPeriodOptions(now) {
  const currentMonthStart = startOfMonth(now);
  const currentYear = now.getFullYear();
  const options = [];

  for (let year = currentYear; year >= ANALYTICS_START_YEAR; year -= 1) {
    const isCurrentYear = year === currentYear;
    const latestMonthIndex = isCurrentYear ? currentMonthStart.getMonth() : 11;

    for (let monthIndex = latestMonthIndex; monthIndex >= 0; monthIndex -= 1) {
      const monthDate = new Date(year, monthIndex, 1);
      const isCurrentMonth = isSameMonth(monthDate, now);

      options.push({
        value: getMonthKey(monthDate),
        label: isCurrentMonth
          ? `Current Month - ${format(monthDate, 'MMMM yyyy')}`
          : format(monthDate, 'MMMM yyyy'),
      });
    }

    options.push({
      value: `year-total-${year}`,
      label: `${year} Year Total`,
    });
  }

  return options;
}

function getAnalyticsPeriod(value, now) {
  if (value.startsWith('year-total')) {
    const selectedYear = Number(value.replace('year-total-', '')) || now.getFullYear();
    const selectedYearDate = new Date(selectedYear, 0, 1);

    return {
      value,
      label: `${selectedYear} Year Total`,
      shortLabel: `${selectedYear} Year Total`,
      rangeStart: startOfYear(selectedYearDate),
      rangeEnd: selectedYear === now.getFullYear() ? endOfDay(now) : endOfYear(selectedYearDate),
      isYearTotal: true,
      isCurrentMonth: false,
      isCurrentYear: selectedYear === now.getFullYear(),
    };
  }

  const [year, month] = value.split('-').map(Number);
  const selectedMonth = new Date(year, month - 1, 1);
  const isCurrentMonth = isSameMonth(selectedMonth, now);

  return {
    value,
    label: isCurrentMonth
      ? `Current Month - ${format(selectedMonth, 'MMMM yyyy')}`
      : format(selectedMonth, 'MMMM yyyy'),
    shortLabel: isCurrentMonth ? 'Current Month' : format(selectedMonth, 'MMMM yyyy'),
    rangeStart: startOfMonth(selectedMonth),
    rangeEnd: isCurrentMonth ? endOfDay(now) : endOfMonth(selectedMonth),
    isYearTotal: false,
    isCurrentMonth,
    isCurrentYear: year === now.getFullYear(),
  };
}

function buildMenuPerformance(orderItems = []) {
  const itemTotals = {};
  const categoryTotals = {};

  orderItems.forEach((item) => {
    const itemName = item.item_name || 'Unknown Item';
    const categoryName = item.category_name || null;
    const quantity = Number(item.quantity || 0);
    const revenue = Number(item.total_price || 0);

    if (!itemTotals[itemName]) {
      itemTotals[itemName] = {
        itemName,
        quantity: 0,
        revenue: 0,
      };
    }

    itemTotals[itemName].quantity += quantity;
    itemTotals[itemName].revenue += revenue;

    if (categoryName) {
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = {
          categoryName,
          quantity: 0,
          revenue: 0,
        };
      }

      categoryTotals[categoryName].quantity += quantity;
      categoryTotals[categoryName].revenue += revenue;
    }
  });

  const topSellingItems = Object.values(itemTotals)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 7);

  const topRevenueItems = Object.values(itemTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const salesByCategory = Object.values(categoryTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const totalItemsSold = Object.values(itemTotals).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const menuRevenue = Object.values(itemTotals).reduce(
    (sum, item) => sum + Number(item.revenue || 0),
    0
  );

  return {
    topSellingItems,
    topRevenueItems,
    salesByCategory,
    totalItemsSold,
    menuRevenue,
    uniqueItemsSold: Object.keys(itemTotals).length,
    uniqueCategoriesSold: Object.keys(categoryTotals).length,
  };
}

export default function BusinessInsights() {
  const now = new Date();
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(now), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => getMonthKey(now));
  const analyticsPeriod = useMemo(
    () => getAnalyticsPeriod(selectedPeriod, now),
    [selectedPeriod]
  );

  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const selectedYearDate = analyticsPeriod.rangeStart;
  const yearStart = startOfYear(selectedYearDate).toISOString();
  const yearEnd = endOfYear(selectedYearDate).toISOString();
  const rangeStart = analyticsPeriod.rangeStart.toISOString();
  const rangeEnd = analyticsPeriod.rangeEnd.toISOString();
  const chartStartDate = analyticsPeriod.rangeStart;
  const chartEndDate = analyticsPeriod.rangeEnd;

  const { data = {}, isLoading } = useQuery({
    queryKey: [
      'businessInsightsPhase4MenuPerformance',
      RESTAURANT_ID,
      todayStart,
      weekStart,
      selectedPeriod,
      rangeStart,
      rangeEnd,
      yearStart,
      yearEnd,
    ],
    queryFn: async () => {
      const [
        yearOrdersResult,
        allCustomersResult,
        monthCustomersResult,
        monthTransactionsResult,
        monthCheckoutRewardsResult,
        topCustomersResult,
        monthOrderItemsResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, customer_code, order_status, created_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('order_status', 'completed')
          .gte('created_at', yearStart)
          .lte('created_at', yearEnd),

        supabase
          .from('customers')
          .select(
            'id, customer_code, name, email, points_balance, lifetime_spend, visit_count, birthday_reward_redeemed_at, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID),

        supabase
          .from('customers')
          .select(
            'id, customer_code, name, email, points_balance, lifetime_spend, visit_count, birthday_reward_redeemed_at, created_at'
          )
          .eq('restaurant_id', RESTAURANT_ID)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd),

        supabase
          .from('points_transactions')
          .select('id, transaction_type, points_amount, note, created_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd),

        supabase
          .from('customer_checkout_rewards')
          .select('id, reward_name, points_required, status, redeemed_at, created_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('status', 'redeemed')
          .gte('redeemed_at', rangeStart)
          .lte('redeemed_at', rangeEnd),

        supabase
          .from('customers')
          .select('id, customer_code, name, email, lifetime_spend, visit_count')
          .eq('restaurant_id', RESTAURANT_ID)
          .order('lifetime_spend', { ascending: false })
          .limit(5),

        supabase
          .from('order_items')
          .select('id, item_name, category_name, quantity, unit_price, total_price, created_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd),
      ]);

      if (yearOrdersResult.error) console.error('Year orders error:', yearOrdersResult.error);
      if (allCustomersResult.error) console.error('All customers error:', allCustomersResult.error);
      if (monthCustomersResult.error) console.error('Month customers error:', monthCustomersResult.error);
      if (monthTransactionsResult.error) console.error('Month transactions error:', monthTransactionsResult.error);
      if (monthCheckoutRewardsResult.error) console.error('Month rewards error:', monthCheckoutRewardsResult.error);
      if (topCustomersResult.error) console.error('Top customers error:', topCustomersResult.error);
      if (monthOrderItemsResult.error) console.error('Month order items error:', monthOrderItemsResult.error);

      const yearOrders = yearOrdersResult.data || [];
      const allCustomers = allCustomersResult.data || [];
      const monthCustomers = monthCustomersResult.data || [];
      const monthTransactions = monthTransactionsResult.data || [];
      const monthCheckoutRewards = monthCheckoutRewardsResult.data || [];
      const topCustomers = topCustomersResult.data || [];
      const monthOrderItems = monthOrderItemsResult.data || [];
      const customerLookup = new Map(
        allCustomers
          .filter((customer) => customer.customer_code)
          .map((customer) => [customer.customer_code, customer])
      );

      const todayOrders = yearOrders.filter((order) =>
        isInRange(order.created_at, todayStart, todayEnd)
      );

      const weekOrders = yearOrders.filter((order) =>
        isInRange(order.created_at, weekStart, weekEnd)
      );

      const monthOrders = yearOrders.filter((order) =>
        isInRange(order.created_at, rangeStart, rangeEnd)
      );

      const todaySales = todayOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0
      );

      const weekSales = weekOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0
      );

      const monthSales = monthOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0
      );

      const yearSales = yearOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0
      );

      const monthOrderCount = monthOrders.length;
      const averageTicket =
        monthOrderCount > 0 ? monthSales / monthOrderCount : 0;

      const activeCustomerCodes = new Set(
        monthOrders
          .map((order) => order.customer_code)
          .filter(Boolean)
      );

      const topCustomersForRange = Object.values(
        monthOrders.reduce((acc, order) => {
          const customerCode = order.customer_code;
          if (!customerCode) return acc;

          const customer = customerLookup.get(customerCode);

          if (!acc[customerCode]) {
            acc[customerCode] = {
              id: customer?.id || customerCode,
              customer_code: customerCode,
              name: customer?.name || 'Unknown Customer',
              email: customer?.email || '',
              lifetime_spend: 0,
              visit_count: 0,
            };
          }

          acc[customerCode].lifetime_spend += getOrderTotal(order);
          acc[customerCode].visit_count += 1;

          return acc;
        }, {})
      )
        .sort((a, b) => Number(b.lifetime_spend || 0) - Number(a.lifetime_spend || 0))
        .slice(0, 5);

      const birthdayRewardsRedeemedThisMonth = allCustomers.filter((customer) =>
        isInRange(customer.birthday_reward_redeemed_at, rangeStart, rangeEnd)
      ).length;

      const pointsIssuedThisMonth = monthTransactions
        .filter((transaction) => getPointAmount(transaction) > 0)
        .reduce((sum, transaction) => sum + getPointAmount(transaction), 0);

      const pointsRedeemedThisMonth = Math.abs(
        monthTransactions
          .filter((transaction) => getPointAmount(transaction) < 0)
          .reduce((sum, transaction) => sum + getPointAmount(transaction), 0)
      );

      const rewardsRedeemedThisMonth = monthCheckoutRewards.length;

      const outstandingPoints = allCustomers.reduce(
        (sum, customer) => sum + Number(customer.points_balance || 0),
        0
      );

      const averageVisits =
        allCustomers.length > 0
          ? allCustomers.reduce(
              (sum, customer) => sum + Number(customer.visit_count || 0),
              0
            ) / allCustomers.length
          : 0;

      const dailySalesTrend = buildDailySalesTrend(monthOrders, chartStartDate, chartEndDate);
      const customerGrowthTrend = buildCustomerGrowth(allCustomers, chartStartDate, chartEndDate);
      const busyDays = buildBusyDays(monthOrders);
      const menuPerformance = buildMenuPerformance(monthOrderItems);

      const rewardsUsage = [
        { label: 'Issued', value: pointsIssuedThisMonth },
        { label: 'Redeemed', value: pointsRedeemedThisMonth },
        { label: 'Rewards', value: rewardsRedeemedThisMonth },
      ];
      const revenueVsRewards = [
        { label: 'Revenue', value: monthSales },
        { label: 'Reward Points', value: pointsRedeemedThisMonth },
      ];

      return {
        isCurrentMonth: Boolean(analyticsPeriod.isCurrentMonth),
        isYearTotal: Boolean(analyticsPeriod.isYearTotal),
        rangeLabel: analyticsPeriod.shortLabel,
        rangeSales: monthSales,
        rangeOrderCount: monthOrderCount,
        yearOrderCount: yearOrders.length,
        todaySales,
        weekSales,
        monthSales,
        yearSales,
        todayOrderCount: todayOrders.length,
        weekOrderCount: weekOrders.length,
        monthOrderCount,
        averageTicket,
        newMembersThisMonth: monthCustomers.length,
        activeCustomersThisMonth: activeCustomerCodes.size,
        averageVisits,
        birthdayRewardsRedeemedThisMonth,
        rewardsRedeemedThisMonth,
        pointsIssuedThisMonth,
        pointsRedeemedThisMonth,
        outstandingPoints,
        totalCustomers: allCustomers.length,
        topCustomers: topCustomersForRange.length > 0 ? topCustomersForRange : topCustomers,
        dailySalesTrend,
        customerGrowthTrend,
        rewardsUsage,
        busyDays,
        revenueVsRewards,
        menuPerformance,
      };
    },
  });

  const dailySalesTrend = data.dailySalesTrend || [];
  const customerGrowthTrend = data.customerGrowthTrend || [];
  const rewardsUsage = data.rewardsUsage || [];
  const busyDays = data.busyDays || [];
  const revenueVsRewards = data.revenueVsRewards || [];

  const maxBusyDayOrders = Math.max(
    0,
    ...busyDays.map((day) => Number(day.orders || 0))
  );

  const busyDaysChartData = busyDays.map((day) => ({
    ...day,
    fill:
      maxBusyDayOrders > 0 && Number(day.orders || 0) === maxBusyDayOrders
        ? BUSY_DAY_COLORS.busiest
        : BUSY_DAY_COLORS.normal,
  }));

  const revenueVsRewardsChartData = revenueVsRewards.map((row) => ({
    ...row,
    fill:
      row.label === 'Revenue'
        ? CHART_COLORS.green
        : CHART_COLORS.purple,
  }));

  return (
    <div className="space-y-8 pb-6">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary/70">
          Owner CRM
        </p>

        <h1 className="font-display text-3xl font-bold tracking-wide">
          ⭐ Business Insights
        </h1>

        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          Monitor sales, menu performance, customer growth,
          rewards, and business trends.
        </p>

        <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-primary">
                Viewing: {analyticsPeriod.label}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sales use completed orders only. Menu performance uses completed checkout items for this restaurant.
              </p>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-primary/30 bg-background/80 px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
              <CalendarDays className="h-4 w-4 text-primary" />
              <select
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="bg-transparent text-xs font-semibold outline-none"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <SalesAnalyticsCard isLoading={isLoading} data={data} />

      <Section
        title="Sales Charts"
        subtitle="Visual sales trends from completed customer checkouts."
      >
        <div className="col-span-2">
          <ChartCard
            icon={LineChartIcon}
            title="Sales Trend"
            subtitle={`Daily revenue for ${analyticsPeriod.shortLabel}.`}
          >
            {isLoading ? (
              <EmptyChartState message="Loading sales chart..." />
            ) : hasChartData(dailySalesTrend, ['sales']) ? (
              <div className="h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySalesTrend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.38} />
                        <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={8} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `$${value}`} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke={CHART_COLORS.gold}
                      fill="url(#salesTrendGradient)"
                      fillOpacity={1}
                      strokeWidth={3}
                      dot={{ r: 2.5, fill: CHART_COLORS.goldSoft, stroke: CHART_COLORS.gold, strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: CHART_COLORS.goldSoft, stroke: CHART_COLORS.gold, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message={`No completed sales for ${analyticsPeriod.shortLabel} yet.`} />
            )}
          </ChartCard>
        </div>

        <ChartCard
          icon={BarChart3}
          title="Busy Days"
          subtitle={`Completed orders by weekday for ${analyticsPeriod.shortLabel}.`}
        >
          {isLoading ? (
            <EmptyChartState message="Loading busy days..." />
          ) : hasChartData(busyDays, ['orders']) ? (
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={busyDaysChartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<NumberTooltip />} />
                  <Bar dataKey="orders" name="Orders" radius={[8, 8, 0, 0]}>
                    {busyDaysChartData.map((entry, index) => (
                      <Cell key={`busy-day-${entry.label}-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message={`No completed orders for ${analyticsPeriod.shortLabel} yet.`} />
          )}
        </ChartCard>

        <ChartCard
          icon={Activity}
          title="Revenue vs Rewards"
          subtitle={`Revenue compared with redeemed points for ${analyticsPeriod.shortLabel}.`}
        >
          {isLoading ? (
            <EmptyChartState message="Loading comparison..." />
          ) : hasChartData(revenueVsRewards, ['value']) ? (
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsRewardsChartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<NumberTooltip />} />
                  <Bar dataKey="value" name="Value" radius={[8, 8, 0, 0]}>
                    {revenueVsRewardsChartData.map((entry, index) => (
                      <Cell key={`revenue-rewards-${entry.label}-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message={`No revenue or reward data for ${analyticsPeriod.shortLabel} yet.`} />
          )}
        </ChartCard>
      </Section>

      <MenuPerformanceCard
        isLoading={isLoading}
        data={data.menuPerformance}
      />

      <RewardsAnalyticsCard isLoading={isLoading} data={data} />

      <Section
        title="Rewards Charts"
        subtitle={`Points issued, points redeemed, and rewards redeemed for ${analyticsPeriod.shortLabel}.`}
      >
        <div className="col-span-2">
          <ChartCard
            icon={Repeat2}
            title="Rewards Usage"
            subtitle={`Rewards movement for ${analyticsPeriod.shortLabel}.`}
          >
            {isLoading ? (
              <EmptyChartState message="Loading rewards chart..." />
            ) : hasChartData(rewardsUsage, ['value']) ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rewardsUsage} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip content={<NumberTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]}>
                      {rewardsUsage.map((entry, index) => {
                        const fill =
                          entry.label === 'Issued'
                            ? CHART_COLORS.gold
                            : entry.label === 'Redeemed'
                            ? CHART_COLORS.purple
                            : CHART_COLORS.green;
                        return <Cell key={`reward-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message={`No rewards activity for ${analyticsPeriod.shortLabel} yet.`} />
            )}
          </ChartCard>
        </div>
      </Section>

      <CustomerAnalyticsCard isLoading={isLoading} data={data} />

      <Section
        title="Customer Charts"
        subtitle={`Customer growth for ${analyticsPeriod.shortLabel}.`}
      >
        <div className="col-span-2">
          <ChartCard
            icon={TrendingUp}
            title="Customer Growth"
            subtitle={`Total customers through ${analyticsPeriod.shortLabel}.`}
          >
            {isLoading ? (
              <EmptyChartState message="Loading customer growth..." />
            ) : customerGrowthTrend.length > 0 ? (
              <div className="h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={customerGrowthTrend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={8} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip content={<NumberTooltip />} />
                    <defs>
                      <linearGradient id="customerGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="customers" stroke={CHART_COLORS.green} fill="url(#customerGrowthGradient)" strokeWidth={3} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message="No customer data yet." />
            )}
          </ChartCard>
        </div>
      </Section>

      <TopCustomersCard isLoading={isLoading} customers={data.topCustomers} />
    </div>
  );
}
