import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Gift,
  Tag,
  Users,
  UserCheck,
  Settings,
  ArrowLeft,
  Menu,
  X,
  ScanLine,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/lib/AuthContext';

const ownerAdminNavItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/admin/rewards', icon: Gift, label: 'Rewards' },
  { path: '/admin/promotions', icon: Tag, label: 'Promotions' },
  { path: '/admin/customers', icon: Users, label: 'Customers' },
  { path: '/admin/employees', icon: UserCheck, label: 'Employees' },
  { path: '/admin/scanner', icon: ScanLine, label: 'Scanner' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

const employeeNavItems = [
  {
    path: '/admin/employee-dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    exact: true,
  },
  { path: '/admin/scanner', icon: ScanLine, label: 'Scanner' },
  { path: '/admin/customer-directory', icon: Users, label: 'Customers' },
  { path: '/admin/employee-account', icon: User, label: 'Account' },
];

export default function AdminLayout() {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = String(user?.role || '').toLowerCase();
  const isEmployee = userRole === 'employee';
  const isAdmin = userRole === 'admin' || userRole === 'owner_admin';
  const hasFullAccess = isAdmin && !isEmployee;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin && !isEmployee) {
    return <Navigate to="/" replace />;
  }

  const navItems = hasFullAccess ? ownerAdminNavItems : employeeNavItems;

  if (isEmployee && location.pathname === '/admin') {
    return <Navigate to="/admin/employee-dashboard" replace />;
  }

  const allowedEmployeePaths = [
    '/admin/scanner',
    '/admin/customer-directory',
    '/admin/employee-dashboard',
    '/admin/employee-account',
    '/admin/checkout-review',
  ];

  const isCustomerDetailPage = location.pathname.startsWith('/admin/customer/');

  if (
    isEmployee &&
    !allowedEmployeePaths.some((path) => location.pathname.startsWith(path)) &&
    !isCustomerDetailPage
  ) {
    return <Navigate to="/admin/employee-dashboard" replace />;
  }

  const handleSignOut = async () => {
    await logout(false);

    if (isEmployee) {
      window.location.href = '/employee-login';
    } else {
      window.location.href = '/admin-login';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-4 h-16 pt-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <span className="font-display font-bold text-sm">
          {hasFullAccess ? 'Owner Admin' : 'Employee Dashboard'}
        </span>

        {!isEmployee && (
          <Link
            to="/"
            className="text-sm text-primary font-semibold px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
          >
            View App
          </Link>
        )}
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg">
              {hasFullAccess ? 'Owner Admin' : 'Employee Dashboard'}
            </h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);

            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3 space-y-1">
          {!isEmployee && (
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all w-full"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-6xl">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
