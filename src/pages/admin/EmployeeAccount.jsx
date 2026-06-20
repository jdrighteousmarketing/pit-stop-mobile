import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const RESTAURANT_ID = 'pit_stop_mobile';

export default function EmployeeAccount() {
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    try {
      const savedEmployee = JSON.parse(
        localStorage.getItem('pitstop_employee_user') || '{}'
      );

      const email = savedEmployee?.email || '';

      if (!email) {
        toast.error('Employee account not found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        toast.error('Employee record not found');
        setLoading(false);
        return;
      }

      setEmployeeId(data.id);

      setForm({
        full_name: data.full_name || '',
        email: data.email || email,
        phone: data.phone || '',
        address: data.address || '',
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load employee account');
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      toast.error('Employee record not found');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          address: form.address,
        })
        .eq('id', employeeId)
        .eq('restaurant_id', RESTAURANT_ID);

      if (error) {
        throw error;
      }

      const savedEmployee = JSON.parse(
        localStorage.getItem('pitstop_employee_user') || '{}'
      );

      localStorage.setItem(
        'pitstop_employee_user',
        JSON.stringify({
          ...savedEmployee,
          name: form.full_name,
          email: form.email,
        })
      );

      setSaved(true);
      toast.success('Employee account updated');

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(error);
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
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="pl-9"
                  placeholder="Employee name"
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
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pl-9"
                  placeholder="Phone number"
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
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="pl-9"
                  placeholder="Address"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className={`w-full gap-2 transition-all duration-300 active:scale-[0.98] ${
                saved ? 'bg-green-600 hover:bg-green-600 text-white' : ''
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