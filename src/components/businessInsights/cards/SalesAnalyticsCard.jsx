import {
  BarChart3,
  CalendarDays,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import InsightCard from './InsightCard';
import Section from './Section';
import { compactMoney, money, number } from '../utils/formatters';

export default function SalesAnalyticsCard({ isLoading, data = {} }) {
  const rangeLabel = data.rangeLabel || 'Selected Period';
  const isCurrentMonth = Boolean(data.isCurrentMonth);
  const isYearTotal = Boolean(data.isYearTotal);

  if (isCurrentMonth) {
    return (
      <Section
        title="Sales Performance"
        subtitle="Revenue from completed checkouts."
      >
        <InsightCard
          icon={DollarSign}
          label="Sales Today"
          value={isLoading ? '...' : compactMoney(data.todaySales)}
          subtext={`${isLoading ? '...' : number(data.todayOrderCount)} completed orders today`}
          color="text-emerald-400"
        />

        <InsightCard
          icon={CalendarDays}
          label="Sales This Week"
          value={isLoading ? '...' : compactMoney(data.weekSales)}
          subtext={`${isLoading ? '...' : number(data.weekOrderCount)} completed orders this week`}
          color="text-green-400"
        />

        <InsightCard
          icon={TrendingUp}
          label="Sales This Month"
          value={isLoading ? '...' : compactMoney(data.monthSales)}
          subtext={`${isLoading ? '...' : number(data.monthOrderCount)} completed orders this month`}
          color="text-blue-400"
        />

        <InsightCard
          icon={Wallet}
          label="Average Ticket"
          value={isLoading ? '...' : `$${money(data.averageTicket)}`}
          subtext="Average completed order value this month"
          color="text-violet-400"
        />

        <InsightCard
          icon={BarChart3}
          label="Sales This Year"
          value={isLoading ? '...' : compactMoney(data.yearSales)}
          subtext={`${isLoading ? '...' : number(data.yearOrderCount)} completed orders this year`}
          color="text-cyan-400"
        />

        <InsightCard
          icon={ShoppingBag}
          label="Orders This Month"
          value={isLoading ? '...' : number(data.monthOrderCount)}
          subtext="Completed customer checkouts"
          color="text-orange-400"
        />
      </Section>
    );
  }

  return (
    <Section
      title="Sales Performance"
      subtitle={`Revenue from completed checkouts for ${rangeLabel}.`}
    >
      <InsightCard
        icon={DollarSign}
        label={isYearTotal ? `Sales ${rangeLabel}` : `Sales ${rangeLabel}`}
        value={isLoading ? '...' : compactMoney(data.rangeSales)}
        subtext={`${isLoading ? '...' : number(data.rangeOrderCount)} completed orders`}
        color="text-emerald-400"
      />

      <InsightCard
        icon={ShoppingBag}
        label={isYearTotal ? `Orders ${rangeLabel}` : `Orders ${rangeLabel}`}
        value={isLoading ? '...' : number(data.rangeOrderCount)}
        subtext="Completed customer checkouts"
        color="text-orange-400"
      />

      <InsightCard
        icon={Wallet}
        label="Average Ticket"
        value={isLoading ? '...' : `$${money(data.averageTicket)}`}
        subtext={`Average completed order value for ${rangeLabel}`}
        color="text-violet-400"
      />

      <InsightCard
        icon={TrendingUp}
        label="Active Customers"
        value={isLoading ? '...' : number(data.activeCustomersThisMonth)}
        subtext={`Customers with completed orders for ${rangeLabel}`}
        color="text-blue-400"
      />

      {!isYearTotal && (
        <InsightCard
          icon={BarChart3}
          label="Sales This Year"
          value={isLoading ? '...' : compactMoney(data.yearSales)}
          subtext={`${isLoading ? '...' : number(data.yearOrderCount)} completed orders this year`}
          color="text-cyan-400"
        />
      )}
    </Section>
  );
}
