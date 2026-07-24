// @ts-nocheck
import { restaurantConfig } from '@/config/restaurantConfig';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { Gift, Star, Cake, QrCode, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import PullToRefresh from '@/components/customer/PullToRefresh';

const RESTAURANT_ID = restaurantConfig.id;

function getPointsBalance(customer) {
  return Number(customer?.points_balance ?? 0);
}

function getLifetimePoints(customer) {
  return Number(
    customer?.lifetime_points ??
      customer?.total_points_earned ??
      0
  );
}

function getBirthdayCycle(birthday) {
  if (!birthday) return null;

  const [, month, day] = String(birthday)
    .split('-')
    .map(Number);

  if (!month || !day) return null;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const possibleYears = [
    today.getFullYear() - 1,
    today.getFullYear(),
    today.getFullYear() + 1,
  ];

  for (const birthdayYear of possibleYears) {
    const birthdayDate = new Date(
      birthdayYear,
      month - 1,
      day
    );

    if (
      Number.isNaN(birthdayDate.getTime()) ||
      birthdayDate.getMonth() !== month - 1 ||
      birthdayDate.getDate() !== day
    ) {
      continue;
    }

    const windowStart = new Date(birthdayDate);
    windowStart.setDate(windowStart.getDate() - 15);

    const windowEnd = new Date(birthdayDate);
    windowEnd.setDate(windowEnd.getDate() + 15);

    if (todayStart >= windowStart && todayStart <= windowEnd) {
      return {
        birthdayYear,
        isWithinWindow: true,
      };
    }
  }

  return {
    birthdayYear: null,
    isWithinWindow: false,
  };
}

function canShowBirthdayReward(profile) {
  const cycle = getBirthdayCycle(profile?.birthday);

  return Boolean(
    cycle?.isWithinWindow &&
    !profile?.birthdayRewardRedeemedForCurrentCycle
  );
}

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingBirthdayRewardIds, setPendingBirthdayRewardIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);

  const [profile, setProfile] = useState({
    id: '',
    auth_user_id: '',
    name: 'Customer',
    email: '',
    points_balance: 0,
    lifetime_points: 0,
    customer_id_code: '',
    customer_code: '',
    birthday: null,
    birthdayRewardRedeemedForCurrentCycle: false,
    isPreviewMode: false,
  });

  const loadRewardsData = async () => {
    setLoading(true);

    let activeProfile = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const previewProfile = {
        id: '',
        auth_user_id: user?.id || '',
        name: 'Customer Preview',
        email: user?.email || '',
        points_balance: 0,
        lifetime_points: 0,
        customer_id_code: 'PREVIEW',
        customer_code: 'PREVIEW',
        birthday: null,
        birthdayRewardRedeemedForCurrentCycle: false,
        isPreviewMode: true,
      };

      if (userError || !user?.id) {
        activeProfile = previewProfile;
        setProfile(activeProfile);
      } else {
        const { data: customerProfile, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (customerError) throw customerError;

        if (!customerProfile) {
          activeProfile = previewProfile;
          setProfile(activeProfile);
        } else {
  const birthdayCycle = getBirthdayCycle(customerProfile.birthday);

  let birthdayRewardRedeemedForCurrentCycle = false;

  if (
    birthdayCycle?.isWithinWindow &&
    customerProfile.customer_code
  ) {
    const { data: birthdayRedemption, error: birthdayRedemptionError } =
      await supabase
        .from('birthday_reward_redemptions')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('customer_code', customerProfile.customer_code)
        .eq('birthday_year', birthdayCycle.birthdayYear)
        .limit(1)
        .maybeSingle();

    if (birthdayRedemptionError) {
      throw birthdayRedemptionError;
    }

    birthdayRewardRedeemedForCurrentCycle = Boolean(
      birthdayRedemption?.id
    );
  }

  activeProfile = {
            id: customerProfile.id,
            auth_user_id: customerProfile.auth_user_id || user.id,
            name:
              customerProfile.name ||
              customerProfile.full_name ||
              user.email?.split('@')[0] ||
              'Customer',
            email: customerProfile.email || user.email || '',
            points_balance: getPointsBalance(customerProfile),
            lifetime_points: getLifetimePoints(customerProfile),
            customer_id_code:
              customerProfile.customer_code ||
              customerProfile.customer_id_code ||
              '',
            customer_code:
              customerProfile.customer_code ||
              customerProfile.customer_id_code ||
              '',
            birthday: customerProfile.birthday || null,
            birthdayRewardRedeemedForCurrentCycle,
            isPreviewMode: false,
          };

          setProfile(activeProfile);
        }
      }
    } catch (error) {
      console.error('Could not load customer:', error);

      activeProfile = {
        id: '',
        auth_user_id: '',
        name: 'Customer Preview',
        email: '',
        points_balance: 0,
        lifetime_points: 0,
        customer_id_code: 'PREVIEW',
        customer_code: 'PREVIEW',
        birthday: null,
        birthdayRewardRedeemedForCurrentCycle: false,
        isPreviewMode: true,
      };

      setProfile(activeProfile);
      toast.error('Customer profile not found. Showing rewards preview.');
    }

    try {
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (rewardsError) throw rewardsError;

      setRewards(Array.isArray(rewardsData) ? rewardsData : []);
    } catch (error) {
      console.error('Could not load rewards:', error);
      setRewards([]);
    }

    if (!activeProfile?.isPreviewMode && activeProfile?.customer_id_code) {
      try {
        const { data: pendingBirthdayData, error: pendingBirthdayError } =
          await supabase
            .from('customer_checkout_rewards')
            .select('reward_id')
            .eq('restaurant_id', RESTAURANT_ID)
            .eq('customer_code', activeProfile.customer_id_code)
            .eq('status', 'pending');

        if (pendingBirthdayError) throw pendingBirthdayError;

        setPendingBirthdayRewardIds(
          (pendingBirthdayData || []).map((item) => String(item.reward_id))
        );
      } catch (error) {
        console.error('Could not load pending birthday rewards:', error);
        setPendingBirthdayRewardIds([]);
      }

      try {
        const { data: txData, error: txError } = await supabase
          .from('points_transactions')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('customer_code', activeProfile.customer_id_code)
          .order('created_at', { ascending: false })
          .limit(10);

        if (txError) throw txError;

        setTransactions(Array.isArray(txData) ? txData : []);
      } catch (error) {
        console.error('Could not load point transactions:', error);
        setTransactions([]);
      }
    } else {
      setPendingBirthdayRewardIds([]);
      setTransactions([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRewardsData();

    const handleUpdate = () => {
      loadRewardsData();
    };

    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pitstop_checkout_rewards_updated', handleUpdate);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pitstop_checkout_rewards_updated', handleUpdate);
    };
  }, []);

  const handleRefresh = async () => {
    await loadRewardsData();
    return true;
  };

  const handleRedeemReward = async (reward) => {
    if (profile.isPreviewMode) {
      toast.info('Preview mode only. Log in as a customer to redeem rewards.');
      return;
    }

    if ((profile.points_balance || 0) < reward.points_required) {
      toast.error('Not enough points yet');
      return;
    }

    setRedeemingId(reward.id);

    const newBalance = Math.max(
      0,
      Number(profile.points_balance || 0) - Number(reward.points_required || 0)
    );

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          points_balance: newBalance,
        })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('auth_user_id', profile.auth_user_id);

      if (updateError) throw updateError;

      const { error: checkoutRewardError } = await supabase
        .from('customer_checkout_rewards')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_id: profile.id,
            customer_name: profile.name,
            customer_code: profile.customer_id_code,
            reward_id: String(reward.id),
            reward_name: reward.name,
            reward_description: reward.description,
            points_required: Number(reward.points_required || 0),
            status: 'pending',
          },
        ]);

      if (checkoutRewardError) throw checkoutRewardError;

      const { error: txError } = await supabase
        .from('points_transactions')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_code: profile.customer_id_code,
            transaction_type: 'redeemed',
            points_amount: -Math.abs(Number(reward.points_required || 0)),
            note: `Redeemed: ${reward.name}`,
            employee_name: null,
          },
        ]);

      if (txError) throw txError;

      setProfile((prev) => ({
        ...prev,
        points_balance: newBalance,
      }));

      window.dispatchEvent(new Event('pitstop_checkout_rewards_updated'));

      toast.success(`${reward.name} added to checkout!`);
      await loadRewardsData();
    } catch (error) {
      console.error('Could not redeem reward:', error);
      toast.error(error.message || 'Could not redeem reward.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleRedeemBirthdayReward = async (reward) => {
    if (profile.isPreviewMode) {
      toast.info('Preview mode only. Log in as a customer to redeem rewards.');
      return;
    }

    if (!canShowBirthdayReward(profile)) {
      toast.error('Birthday reward is not available.');
      return;
    }

    if (pendingBirthdayRewardIds.includes(String(reward.id))) {
      toast.error('Birthday reward is already in checkout.');
      return;
    }

    setRedeemingId(reward.id);

    try {
      const { error: checkoutRewardError } = await supabase
        .from('customer_checkout_rewards')
        .insert([
          {
            restaurant_id: RESTAURANT_ID,
            customer_id: profile.id,
            customer_name: profile.name,
            customer_code: profile.customer_id_code,
            reward_id: String(reward.id),
            reward_name: reward.name,
            reward_description: reward.description,
            points_required: 0,
            status: 'pending',
          },
        ]);

      if (checkoutRewardError) throw checkoutRewardError;

      window.dispatchEvent(new Event('pitstop_checkout_rewards_updated'));

      toast.success(`${reward.name} added to checkout!`);
      await loadRewardsData();
    } catch (error) {
      console.error('Could not redeem birthday reward:', error);
      toast.error(error.message || 'Could not redeem birthday reward.');
    } finally {
      setRedeemingId(null);
    }
  };

  const sortedRewards = [...rewards].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const regularRewards = sortedRewards.filter(
    (reward) => !reward.is_birthday_reward
  );

  const birthdayRewards = profile.isPreviewMode
    ? sortedRewards.filter((reward) => reward.is_birthday_reward)
    : canShowBirthdayReward(profile)
      ? sortedRewards
          .filter((reward) => reward.is_birthday_reward)
          .filter(
            (reward) => !pendingBirthdayRewardIds.includes(String(reward.id))
          )
      : [];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-4">
        <div className="px-5 pt-12 pb-2">
          <h1 className="text-2xl font-display font-bold">Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn points, get rewarded
          </p>

          {profile.isPreviewMode && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              Admin preview mode: rewards are visible, but redemption buttons are disabled.
            </div>
          )}
        </div>

        <div className="px-5 mt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-primary to-accent rounded-3xl p-6 text-white relative overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5" />
                <span className="text-sm font-medium text-white/80">
                  {profile.isPreviewMode ? 'Preview Balance' : 'Points Balance'}
                </span>
              </div>

              <p className="text-5xl font-display font-bold">
                {profile.points_balance || 0}
              </p>

              <p className="text-xs text-white/70 mt-2">
                {profile.isPreviewMode
                  ? 'This is how customers will see the rewards page.'
                  : 'Show your Reward ID at checkout to earn points.'}
              </p>

              <div className="mt-5 flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <QrCode className="w-8 h-8" />

                <div>
                  <p className="text-[10px] text-white/70 uppercase tracking-wider">
                    Your Reward ID
                  </p>
                  <p className="font-mono font-bold text-lg tracking-wider">
                    {profile.customer_id_code || '---'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="px-5 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold">Available Rewards</h2>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
                Loading rewards...
              </div>
            ) : regularRewards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
                <p className="text-3xl mb-2">🎁</p>
                <p className="font-medium">No rewards available yet</p>
                <p className="text-sm mt-1">Check back soon.</p>
              </div>
            ) : (
              regularRewards.map((reward, i) => {
                const progress =
                  reward.points_required > 0
                    ? Math.min(
                        ((profile.points_balance || 0) /
                          reward.points_required) *
                          100,
                        100
                      )
                    : 100;

                const canRedeem =
                  (profile.points_balance || 0) >= reward.points_required;

                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Star className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm">
                            {reward.name}
                          </h3>

                          <Badge
                            className={
                              canRedeem
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {reward.points_required} pts
                          </Badge>
                        </div>

                        {reward.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {reward.description}
                          </p>
                        )}

                        <div className="mt-2">
                          <Progress value={progress} className="h-1.5" />

                          <p className="text-[10px] text-muted-foreground mt-1">
                            {canRedeem
                              ? '✨ Ready to redeem!'
                              : `${profile.points_balance || 0} / ${reward.points_required} points`}
                          </p>
                        </div>

                        {(canRedeem || profile.isPreviewMode) && (
                          <Button
                            size="sm"
                            className="mt-3 w-full h-8"
                            disabled={redeemingId === reward.id || profile.isPreviewMode}
                            onClick={() => handleRedeemReward(reward)}
                          >
                            {profile.isPreviewMode
                              ? 'Customer Preview'
                              : redeemingId === reward.id
                                ? 'Adding to Checkout...'
                                : 'Redeem Reward'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {birthdayRewards.length > 0 && (
          <div className="px-5 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Cake className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold">
                Birthday Reward
              </h2>
            </div>

            {birthdayRewards.map((reward) => (
              <div
                key={reward.id}
                className="rounded-2xl border p-4 bg-[#3b151b] border-[#7c2d3a]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🎂</div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-white">
                      {reward.name}
                    </h3>

                    {reward.description && (
                      <p className="text-xs text-pink-100 mt-0.5">
                        {reward.description}
                      </p>
                    )}

                    <p className="text-[10px] text-pink-200 mt-1">
                      {profile.isPreviewMode
                        ? 'Admin preview: birthday rewards appear here from 15 days before through 15 days after the customer’s birthday.'
                        : 'Available from 15 days before through 15 days after your birthday. If removed from checkout, it will return here.'
                        }
                    </p>

                    <Button
                      size="sm"
                      className="mt-3 w-full h-8"
                      disabled={redeemingId === reward.id || profile.isPreviewMode}
                      onClick={() => handleRedeemBirthdayReward(reward)}
                    >
                      {profile.isPreviewMode
                        ? 'Customer Preview'
                        : redeemingId === reward.id
                          ? 'Adding to Checkout...'
                          : 'Add Birthday Reward to Checkout'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="px-5 mt-8">
            <h2 className="text-lg font-display font-bold mb-4">
              Recent Activity
            </h2>

            <div className="space-y-2">
              {transactions.map((tx) => {
                const amount = Number(tx.points_amount ?? tx.points ?? 0);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-card rounded-xl border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {tx.note || tx.description || tx.transaction_type}
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={`font-bold text-sm ${
                        amount > 0 ? 'text-emerald-600' : 'text-destructive'
                      }`}
                    >
                      {amount > 0 ? '+' : ''}
                      {amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}