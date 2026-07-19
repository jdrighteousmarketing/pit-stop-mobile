// @ts-nocheck
import { restaurantConfig } from '@/config/restaurantConfig';
import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const RESTAURANT_ID = restaurantConfig.id;

function getSavedEmployeeFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('pitstop_employee_user') || '{}');
  } catch {
    return {};
  }
}

export default function EmployeeAccount() {
  const [employeeId, setEmployeeId] = useState(null);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
  setLoading(true);
  setLoadError('');

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user?.id) {
      setLoadError(
        'Employee account not found. Please log out and log back in.'
      );
      toast.error('Employee account not found');
      return;
    }

    let { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Temporary fallback for older employee records that may not
    // have auth_user_id saved yet.
    if (!data && user.email) {
      const cleanEmail = String(user.email).trim().toLowerCase();

      const fallbackResult = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (fallbackResult.error) {
        throw fallbackResult.error;
      }

      data = fallbackResult.data;
    }

    if (!data) {
      setLoadError(
        'No employee record matches your signed-in account for this restaurant.'
      );
      toast.error('Employee record not found');
      return;
    }

    const cleanEmail = String(
      data.email || user.email || ''
    )
      .trim()
      .toLowerCase();

    setEmployeeId(data.id);
    setEmployeeEmail(cleanEmail);

    setForm({
      full_name: data.full_name || data.name || '',
      email: cleanEmail,
      phone: data.phone || '',
      address: data.address || '',
    });
  } catch (error) {
    console.error('Failed to load employee account:', error);

    setLoadError(
      error.message || 'Failed to load employee account'
    );

    toast.error(
      error.message || 'Failed to load employee account'
    );
  } finally {
    setLoading(false);
  }
};

  const handleChange = (field, value) => {
    setSaved(false);

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!employeeId) {
      toast.error('Employee record not found');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      const updates = {
        full_name: String(form.full_name || '').trim(),
        phone: String(form.phone || '').trim(),
        address: String(form.address || '').trim(),
      };

      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
        .eq('restaurant_id', RESTAURANT_ID)
        .select('id, full_name, email, phone, address')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error('No employee row was updated. Check Supabase RLS/update permissions.');
      }

      const savedEmployee = getSavedEmployeeFromStorage();

      localStorage.setItem(
        'pitstop_employee_user',
        JSON.stringify({
          ...savedEmployee,
          id: data.id,
          name: data.full_name || updates.full_name,
          full_name: data.full_name || updates.full_name,
          email: data.email || employeeEmail || form.email,
          phone: data.phone || updates.phone,
          address: data.address || updates.address,
          restaurant_id: RESTAURANT_ID,
        })
      );

      setForm({
        full_name: data.full_name || '',
        email: data.email || employeeEmail || form.email,
        phone: data.phone || '',
        address: data.address || '',
      });

      setSaved(true);
      toast.success('Employee account updated');

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error('Failed to save employee account:', error);
      toast.error(error.message || 'Failed to save employee account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Employee Account
          </p>

          <h1 className="text-3xl font-display font-bold tracking-wide">
            My Account
          </h1>
        </div>

        <Card className="border-destructive/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold">Account could not load</p>
                <p className="text-sm text-muted-foreground mt-1">{loadError}</p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={loadEmployee}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p
          className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Employee Account
        </p>

        <h1 className="text-3xl font-display font-bold tracking-wide">
          My Account
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          View and update your employee information.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account Details
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(event) => handleChange('full_name', event.target.value)}
                  className="pl-9"
                  placeholder="Employee name"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={form.email}
                  className="pl-9"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email is tied to employee login and cannot be edited here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  className="pl-9"
                  placeholder="Phone number"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => handleChange('address', event.target.value)}
                  className="pl-9"
                  placeholder="Address"
                  disabled={saving}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || !employeeId}
              className={`w-full gap-2 transition-all duration-300 active:scale-[0.98] ${
                saved ? 'bg-green-600 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.45)]' : ''
              }`}
            >
              {saving ? (
                <>
                  <Save className="w-4 h-4 animate-pulse" />
                  Saving Changes...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
