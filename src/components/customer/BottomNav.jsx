import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  UtensilsCrossed,
  Gift,
  Tag,
  User,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { pushToStack } from '@/lib/navigationStack';

const customerNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/rewards', icon: Gift, label: 'Rewards' },
  { path: '/promotions', icon: Tag, label: 'Deals' },
  { path: '/account', icon: User, label: 'Account' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = String(user?.role || 'customer').toLowerCase();
  const isAdmin = role === 'admin' || role === 'owner_admin';
  const isEmployee = role === 'employee';
  const showDashboard = isAdmin || isEmployee;

  const navItems = showDashboard
    ? [
        ...customerNavItems,
        {
          path: isEmployee ? '/admin/employee-dashboard' : '/admin',
          icon: LayoutDashboard,
          label: 'Dashboard',
        },
      ]
    : customerNavItems;

  const handleNavClick = (e, path) => {
    e.preventDefault();

    const currentTab = navItems.find(
      (item) => location.pathname.startsWith(item.path) && item.path !== '/'
    );

    const currentTabPath = currentTab ? currentTab.path : '/';

    pushToStack(currentTabPath, location.pathname);
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

          return (
            <a
              key={path}
              href={path}
              onClick={(e) => handleNavClick(e, path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg transition-all duration-200 flex-1 select-none-touch',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-lg transition-all duration-200',
                  isActive && 'bg-primary/10'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              </div>

              <span
                className={cn(
                  'text-[9px] font-medium truncate',
                  isActive && 'font-semibold'
                )}
              >
                {label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
