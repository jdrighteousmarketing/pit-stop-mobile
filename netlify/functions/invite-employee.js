const { createClient } = require('@supabase/supabase-js');

const RESTAURANT_ID = process.env.RESTAURANT_ID || 'pit_stop_mobile';

const APP_URL = process.env.APP_URL || 'https://pit-stop-mobile.netlify.app';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      };
    }

    const { email, fullName } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing employee email.' }),
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
  redirectTo: `${APP_URL}/employee-login`,
  data: {
    full_name: fullName || '',
    role: 'employee',
    restaurant_id: RESTAURANT_ID,
  },
});

    if (inviteError) throw inviteError;

    const authUserId = inviteData?.user?.id || null;

    const { error: employeeError } = await supabase
      .from('employees')
      .upsert(
        {
          restaurant_id: RESTAURANT_ID,
          auth_user_id: authUserId,
          full_name: fullName || '',
          email: normalizedEmail,
          role: 'employee',
          status: 'invited',
          is_active: true,
        },
        {
          onConflict: 'email',
        }
      );

    if (employeeError) throw employeeError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        authUserId,
      }),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to invite employee.',
      }),
    };
  }
};