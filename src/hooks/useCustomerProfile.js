import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

export function useCustomerProfile() {
  return useQuery({
    queryKey: ['customerProfile'],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Could not load customer profile:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        user_id: user.id,
        auth_user_id: user.id,
        name: data.name || user.email?.split('@')[0] || 'Customer',
        email: data.email || user.email,
        phone: data.phone || '',
        birthday: data.birthday || '',
        address: data.address || '',
        points_balance: Number(data.points_balance || 0),
        total_points_earned: Number(data.lifetime_points || 0),
        lifetime_points: Number(data.lifetime_points || 0),
        lifetime_spend: Number(data.lifetime_spend || 0),
        visit_count: Number(data.visit_count || 0),
        customer_code: data.customer_code,
        customer_id_code: data.customer_code,
      };
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}