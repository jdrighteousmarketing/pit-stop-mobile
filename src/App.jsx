import { Toaster } from './components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from './lib/query-client';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from './lib/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AnimatePresence } from 'framer-motion';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeSignup from './pages/EmployeeSignup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Customer layout & pages
import CustomerLayout from './components/customer/CustomerLayout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Rewards from './pages/Rewards';
import Promotions from './pages/Promotions';
import Account from './pages/Account';
import Contact from './pages/Contact';

// Admin layout & pages
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import EmployeeDashboard from './pages/admin/EmployeeDashboard';
import EmployeeAccount from './pages/admin/EmployeeAccount';
import MenuManagement from './pages/admin/MenuManagement';
import RewardsManagement from './pages/admin/RewardsManagement';
import PromotionsManagement from './pages/admin/PromotionsManagement';
import CustomerManagement from './pages/admin/CustomerManagement';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import BusinessSettingsPage from './pages/admin/BusinessSettingsPage';
import ScannerPage from './pages/admin/ScannerPage';
import CheckoutReview from './pages/admin/CheckoutReview';
import EmployeeCustomerDirectory from './pages/admin/EmployeeCustomerDirectory';
import CustomerPointsManagement from './pages/admin/CustomerPointsManagement';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  const location = useLocation();
  const currentPath = window.location.pathname;

  const authPaths = [
    '/login',
    '/register',
    '/signup',
    '/employee-login',
    '/employee-signup',
    '/admin-login',
    '/forgot-password',
    '/reset-password',
  ];

  const isOnAuthPage = authPaths.includes(currentPath);
  const isAdminPath = currentPath.startsWith('/admin');

  if (
    (isLoadingPublicSettings || isLoadingAuth) &&
    !isOnAuthPage &&
    !isAdminPath
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'auth_required') {
    const isEmployeeSignupPath = currentPath === '/employee-signup';

    if (
      !authPaths.includes(currentPath) &&
      !isAdminPath &&
      !isEmployeeSignupPath
    ) {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />
        <Route path="/employee-signup" element={<EmployeeSignup />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <ProtectedRoute
              unauthenticatedElement={<Navigate to="/register" replace />}
            />
          }
        >
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/account" element={<Account />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route
            path="/admin/employee-dashboard"
            element={<EmployeeDashboard />}
          />
          <Route
            path="/admin/employee-account"
            element={<EmployeeAccount />}
          />
          <Route path="/admin/menu" element={<MenuManagement />} />
          <Route path="/admin/rewards" element={<RewardsManagement />} />
          <Route path="/admin/promotions" element={<PromotionsManagement />} />
          <Route path="/admin/customers" element={<CustomerManagement />} />
          <Route
            path="/admin/customer-directory"
            element={<EmployeeCustomerDirectory />}
          />
          <Route path="/admin/employees" element={<EmployeeManagement />} />
          <Route path="/admin/settings" element={<BusinessSettingsPage />} />
          <Route path="/admin/scanner" element={<ScannerPage />} />
          <Route path="/admin/checkout-review" element={<CheckoutReview />} />
          <Route
            path="/admin/customer/:customerId"
            element={<CustomerPointsManagement />}
          />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;