import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload, X, Palette, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = 'pit_stop_mobile';

const DEFAULT_HOURS = [
  { day: 'Monday', open: '11:00', close: '21:00', closed: false },
  { day: 'Tuesday', open: '11:00', close: '21:00', closed: false },
  { day: 'Wednesday', open: '11:00', close: '21:00', closed: false },
  { day: 'Thursday', open: '11:00', close: '21:00', closed: false },
  { day: 'Friday', open: '11:00', close: '22:00', closed: false },
  { day: 'Saturday', open: '10:00', close: '22:00', closed: false },
  { day: 'Sunday', open: '10:00', close: '20:00', closed: false },
];

const DEFAULT_SETTINGS = {
  business_name: 'My Restaurant Name',
  tagline: 'Fresh food, fast service, real rewards.',
  logo_url: '',
  background_image_url: '',
  hero_image_url: '',
  overlay_color: '#000000',
  overlay_opacity: 0.5,
  phone: '',
  email: '',
  website: '',
  facebook_url: '',
  instagram_url: '',
  address: 'Your Address Here',
  latitude: '',
  longitude: '',
  current_location: '',
  business_hours: DEFAULT_HOURS,
  privacy_policy_url: '',
  terms_of_service_url: '',
  account_deletion_url: '',
  points_per_dollar: 1,
  max_points_per_customer: 500,
  reward_rounding: 'down',
};

function SaveButton({ isSaving, saved, onClick }) {
  return (
    <Button
      onClick={onClick}
      disabled={isSaving}
      className="gap-2 min-w-[160px] transition-all duration-300"
    >
      {isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saving...
        </>
      ) : saved ? (
        <>
          <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
            ✓
          </span>
          Saved!
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Save Changes
        </>
      )}
    </Button>
  );
}

function BusinessSettingsLoading() {
  return (
    <div className="pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Business Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Loading business settings...
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-12 w-36 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function BusinessSettingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const logoInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setSettingsLoading(true);

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm({
          ...DEFAULT_SETTINGS,
          ...data,
          business_name:
            data.business_name || data.name || DEFAULT_SETTINGS.business_name,
          business_hours:
            data.business_hours?.length > 0
              ? data.business_hours
              : DEFAULT_HOURS,
          points_per_dollar:
            data.points_per_dollar ?? DEFAULT_SETTINGS.points_per_dollar,
          max_points_per_customer:
            data.max_points_per_customer ??
            DEFAULT_SETTINGS.max_points_per_customer,
          reward_rounding:
            data.reward_rounding || DEFAULT_SETTINGS.reward_rounding,
        });
      } else {
        setForm(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load business settings');
      setForm(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaved(false);

    const cleanData = {
      restaurant_id: RESTAURANT_ID,
      name: form.business_name || 'My Restaurant Name',
      business_name: form.business_name || 'My Restaurant Name',
      tagline: form.tagline || '',
      logo_url: form.logo_url || '',
      background_image_url: form.background_image_url || '',
      hero_image_url: form.hero_image_url || form.background_image_url || '',
      overlay_color: form.overlay_color || '#000000',
      overlay_opacity: parseFloat(form.overlay_opacity) || 0.5,
      phone: form.phone || '',
      email: form.email || '',
      website: form.website || '',
      facebook_url: form.facebook_url || '',
      instagram_url: form.instagram_url || '',
      address: form.address || '',
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      current_location: form.current_location || '',
      business_hours:
        form.business_hours?.length > 0 ? form.business_hours : DEFAULT_HOURS,
      privacy_policy_url: form.privacy_policy_url || '',
      terms_of_service_url: form.terms_of_service_url || '',
      account_deletion_url: form.account_deletion_url || '',
      points_per_dollar: parseFloat(form.points_per_dollar) || 1,
      max_points_per_customer:
        parseFloat(form.max_points_per_customer) || 500,
      reward_rounding:
        form.reward_rounding === 'up' ? 'up' : 'down',
      active: true,
    };

    try {
      const { data: updated, error: updateError } = await supabase
        .from('restaurants')
        .update(cleanData)
        .eq('restaurant_id', RESTAURANT_ID)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updated) {
        const { error: insertError } = await supabase
          .from('restaurants')
          .insert(cleanData);

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['businessSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminBusinessSettings'] });
      queryClient.invalidateQueries({ queryKey: ['homeHeroSettings'] });
      queryClient.invalidateQueries({ queryKey: ['contactRestaurantSettings'] });

      setForm({
        ...DEFAULT_SETTINGS,
        ...cleanData,
      });

      setHasChanges(false);
      setSaved(true);
      toast.success('Settings saved!');

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const readImageAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);

    try {
      const imageUrl = await readImageAsDataUrl(file);
      updateForm('logo_url', imageUrl);
      toast.success('Logo uploaded!');
    } catch (error) {
      console.error(error);
      toast.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackgroundUploading(true);

    try {
      const imageUrl = await readImageAsDataUrl(file);
      updateForm('background_image_url', imageUrl);
      updateForm('hero_image_url', imageUrl);
      toast.success('Background image uploaded!');
    } catch (error) {
      console.error(error);
      toast.error('Background upload failed');
    } finally {
      setBackgroundUploading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const updateHours = (index, key, value) => {
    const hours = [...(form.business_hours || DEFAULT_HOURS)];
    hours[index] = { ...hours[index], [key]: value };
    updateForm('business_hours', hours);
  };

  if (settingsLoading) {
    return <BusinessSettingsLoading />;
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Business Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your business information
          </p>
        </div>

        {(hasChanges || saved) && (
          <SaveButton isSaving={isSaving} saved={saved} onClick={saveSettings} />
        )}
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4 flex flex-wrap justify-center gap-2 h-auto bg-transparent border-b border-border p-0">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="contact">Contact & Social</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={form.business_name || ''}
                  onChange={(e) => updateForm('business_name', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tagline / Slogan</Label>
                <Input
                  value={form.tagline || ''}
                  onChange={(e) => updateForm('tagline', e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Best burgers in town!"
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  className="mt-1"
                  placeholder="270-000-0000"
                />
              </div>

              <div>
                <Label>Business Address</Label>
                <Input
                  value={form.address || ''}
                  onChange={(e) => updateForm('address', e.target.value)}
                  className="mt-1"
                  placeholder="123 Main Street, Lebanon, KY 40033"
                />
              </div>

              <div>
                <Label>Logo</Label>

                <div className="mt-2 flex items-center gap-4">
                  {form.logo_url && (
                    <div className="relative">
                      <img
                        src={form.logo_url}
                        alt="Logo preview"
                        className="w-20 h-20 rounded-xl object-cover border border-border"
                      />

                      <button
                        type="button"
                        onClick={() => updateForm('logo_url', '')}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoUploading
                      ? 'Uploading...'
                      : form.logo_url
                      ? 'Replace Logo'
                      : 'Upload Logo'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">App Appearance</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Hero Background Image</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Displayed on the customer app hero section
                </p>

                <div className="mt-2 flex items-center gap-4">
                  {form.background_image_url && (
                    <div className="relative">
                      <img
                        src={form.background_image_url}
                        alt="Background preview"
                        className="w-24 h-24 rounded-xl object-cover border border-border"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          updateForm('background_image_url', '');
                          updateForm('hero_image_url', '');
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBackgroundUpload}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => backgroundInputRef.current?.click()}
                    disabled={backgroundUploading}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {backgroundUploading
                      ? 'Uploading...'
                      : form.background_image_url
                      ? 'Replace Image'
                      : 'Upload Image'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Background Overlay Color
                </Label>

                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={
                      form.overlay_color && form.overlay_color.startsWith('#')
                        ? form.overlay_color
                        : '#000000'
                    }
                    onChange={(e) => updateForm('overlay_color', e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer border border-border"
                  />

                  <Input
                    type="text"
                    value={form.overlay_color || '#000000'}
                    onChange={(e) => updateForm('overlay_color', e.target.value)}
                    className="w-28 font-mono text-xs"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Overlay Transparency
                </Label>

                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[form.overlay_opacity ?? 0.5]}
                      onValueChange={([value]) =>
                        updateForm('overlay_opacity', value)
                      }
                      min={0}
                      max={1}
                      step={0.05}
                      className="flex-1"
                    />

                    <code className="text-xs bg-muted px-2 py-1 rounded w-16 text-center">
                      {Math.round((form.overlay_opacity ?? 0.5) * 100)}%
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & Social Media</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={form.email || ''}
                  onChange={(e) => updateForm('email', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Website</Label>
                <Input
                  value={form.website || ''}
                  onChange={(e) => updateForm('website', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Facebook URL</Label>
                <Input
                  value={form.facebook_url || ''}
                  onChange={(e) => updateForm('facebook_url', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Instagram URL</Label>
                <Input
                  value={form.instagram_url || ''}
                  onChange={(e) => updateForm('instagram_url', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Hours</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {(form.business_hours || DEFAULT_HOURS).map((h, i) => (
                  <div
                    key={h.day}
                    className="grid grid-cols-1 md:grid-cols-[110px_110px_1fr] items-start md:items-center gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <span className="text-sm font-medium pt-2">{h.day}</span>

                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={!h.closed}
                        onCheckedChange={(v) => updateHours(i, 'closed', !v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {h.closed ? 'Closed' : 'Open'}
                      </span>
                    </div>

                    {!h.closed ? (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 w-full">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Open
                          </Label>
                          <Input
                            type="time"
                            value={h.open || ''}
                            onChange={(e) =>
                              updateHours(i, 'open', e.target.value)
                            }
                            className="w-full min-w-0"
                          />
                          {h.open && (
                            <span className="block text-[10px] text-muted-foreground pl-1">
                              {formatTime(h.open)}
                            </span>
                          )}
                        </div>

                        <span className="text-muted-foreground pt-8">to</span>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Close
                          </Label>
                          <Input
                            type="time"
                            value={h.close || ''}
                            onChange={(e) =>
                              updateHours(i, 'close', e.target.value)
                            }
                            className="w-full min-w-0"
                          />
                          {h.close && (
                            <span className="block text-[10px] text-muted-foreground pl-1">
                              {formatTime(h.close)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground md:pt-2">
                        Closed all day
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address || ''}
                  onChange={(e) => updateForm('address', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Current Location Display</Label>
                <Input
                  value={form.current_location || ''}
                  onChange={(e) =>
                    updateForm('current_location', e.target.value)
                  }
                  className="mt-1"
                  placeholder="e.g. Downtown Food Court"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude || ''}
                    onChange={(e) => updateForm('latitude', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude || ''}
                    onChange={(e) => updateForm('longitude', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rewards Settings</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <Label>Points Earned per $1 Spent</Label>

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.points_per_dollar || 1}
                  onChange={(e) =>
                    updateForm('points_per_dollar', e.target.value)
                  }
                  className="mt-1"
                />

                <p className="text-xs text-muted-foreground mt-1">
                  Customers earn this many points for every dollar they spend.
                </p>
              </div>

              <div>
                <Label>Maximum Points Per Customer</Label>

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.max_points_per_customer || 500}
                  onChange={(e) =>
                    updateForm('max_points_per_customer', e.target.value)
                  }
                  className="mt-1"
                />

                <p className="text-xs text-muted-foreground mt-1">
                  Prevent customers from earning more than this many points.
                </p>
              </div>

              <div>
                <Label>Reward Point Rounding</Label>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateForm('reward_rounding', 'down')}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      (form.reward_rounding || 'down') === 'down'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">Round Down</span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          (form.reward_rounding || 'down') === 'down'
                            ? 'border-primary'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {(form.reward_rounding || 'down') === 'down' && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      A $12.99 order earns 12 points when rewards are set to 1
                      point per dollar.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateForm('reward_rounding', 'up')}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      form.reward_rounding === 'up'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">Round Up</span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          form.reward_rounding === 'up'
                            ? 'border-primary'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {form.reward_rounding === 'up' && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      A $12.99 order earns 13 points when rewards are set to 1
                      point per dollar.
                    </p>
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Round Down is recommended because it matches completed whole
                  dollars more closely and protects the restaurant.
                </p>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20">
                <p className="text-sm font-medium">Example</p>

                <p className="text-xs text-muted-foreground mt-1">
                  Points Per Dollar:
                  <strong> {form.points_per_dollar || 1}</strong>
                </p>

                <p className="text-xs text-muted-foreground">
                  Max Customer Points:
                  <strong> {form.max_points_per_customer || 500}</strong>
                </p>

                <p className="text-xs text-muted-foreground">
                  Reward Rounding:
                  <strong>
                    {' '}
                    {(form.reward_rounding || 'down') === 'up'
                      ? 'Round Up'
                      : 'Round Down'}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legal Links</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Privacy Policy URL</Label>
                <Input
                  value={form.privacy_policy_url || ''}
                  onChange={(e) =>
                    updateForm('privacy_policy_url', e.target.value)
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Terms of Service URL</Label>
                <Input
                  value={form.terms_of_service_url || ''}
                  onChange={(e) =>
                    updateForm('terms_of_service_url', e.target.value)
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Account Deletion URL</Label>
                <Input
                  value={form.account_deletion_url || ''}
                  onChange={(e) =>
                    updateForm('account_deletion_url', e.target.value)
                  }
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(hasChanges || saved) && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-card/95 backdrop-blur-xl border-t border-border p-4 z-40">
          <div className="max-w-6xl flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {saved ? 'Settings saved successfully' : 'You have unsaved changes'}
            </p>

            <SaveButton isSaving={isSaving} saved={saved} onClick={saveSettings} />
          </div>
        </div>
      )}
    </div>
  );
}