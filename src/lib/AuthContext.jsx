import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();
const RESTAURANT_ID = 'pit_stop_mobile';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkUserAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUserAuth();
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const buildUser = ({ authUser, profile, role }) => ({
    id: authUser.id,
    auth_user_id: authUser.id,
    email: profile?.email || authUser.email,
    full_name:
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email ||
      'User',
    name:
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email ||
      'User',
    role,
    restaurant_id: profile?.restaurant_id || RESTAURANT_ID,
    profile,
  });

  const lookupAdmin = async (authUser) => {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Admin lookup failed:', error);
      return null;
    }

    if (data && String(data.role || '').toLowerCase() === 'admin') {
      return buildUser({ authUser, profile: data, role: 'admin' });
    }

    return null;
  };

  const lookupEmployee = async (authUser) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Employee lookup failed:', error);
      return null;
    }

    if (data && String(data.role || '').toLowerCase() === 'employee') {
      return buildUser({ authUser, profile: data, role: 'employee' });
    }

    return null;
  };

  const lookupCustomer = async (authUser) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .eq('restaurant_id', RESTAURANT_ID)
      .maybeSingle();

    if (error) {
      console.error('Customer lookup failed:', error);
      return null;
    }

    if (data) {
      return buildUser({ authUser, profile: data, role: 'customer' });
    }

    return buildUser({ authUser, profile: null, role: 'customer' });
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const authUser = sessionData?.session?.user;

      if (!authUser) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      const adminUser = await lookupAdmin(authUser);

      if (adminUser) {
        setUser(adminUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      const employeeUser = await lookupEmployee(authUser);

      if (employeeUser) {
        setUser(employeeUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      const customerUser = await lookupCustomer(authUser);

      if (customerUser) {
        setUser(customerUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_failed', message: 'Authentication failed' });
    }

    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('adminAccessGranted');

    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const isAdminRole =
    ['owner_admin', 'employee', 'admin'].includes(user?.role) ||
    ['editor', 'admin', 'owner'].includes(user?.collaborator_role);

  const isOwnerAdmin =
    user?.role === 'owner_admin' ||
    user?.role === 'admin' ||
    ['editor', 'admin', 'owner'].includes(user?.collaborator_role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        isAdminRole,
        isOwnerAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
