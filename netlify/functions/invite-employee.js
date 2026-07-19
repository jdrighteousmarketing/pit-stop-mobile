const { createClient } = require('@supabase/supabase-js');

const RESTAURANT_ID =
  process.env.RESTAURANT_ID || 'pit_stop_mobile';

const APP_URL =
  process.env.APP_URL || 'https://pit-stop-mobile.netlify.app';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

async function findExistingAuthUser(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const existingUser = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email
    );

    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return response(405, {
        error: 'Method not allowed. Use POST.',
      });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return response(500, {
        error: 'Supabase environment variables are missing.',
      });
    }

    /*
     * Verify that the request came from a signed-in administrator.
     */
    const authorizationHeader =
      event.headers.authorization ||
      event.headers.Authorization ||
      '';

    const accessToken = authorizationHeader.startsWith('Bearer ')
      ? authorizationHeader.slice(7).trim()
      : '';

    if (!accessToken) {
      return response(401, {
        error: 'Missing administrator access token.',
      });
    }

    const {
      data: { user: requestingUser },
      error: requestingUserError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (requestingUserError || !requestingUser) {
      return response(401, {
        error: 'Your administrator session is invalid or expired.',
      });
    }

    const { data: administrator, error: administratorError } =
  await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('auth_user_id', requestingUser.id)
    .maybeSingle();

    if (administratorError) {
      throw administratorError;
    }

    if (!administrator) {
      return response(403, {
        error: 'Only an active restaurant administrator can invite employees.',
      });
    }

    let body;

    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return response(400, {
        error: 'Invalid request body.',
      });
    }

    const normalizedEmail =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const normalizedFullName =
      typeof body.fullName === 'string'
        ? body.fullName.trim()
        : '';

    if (!normalizedEmail) {
      return response(400, {
        error: 'Missing employee email.',
      });
    }

    /*
     * First check whether this email already belongs to a Supabase Auth user.
     */
    let authUser = await findExistingAuthUser(normalizedEmail);
    let isExistingUser = Boolean(authUser);

    /*
     * Only send an Auth invitation when the person does not already have
     * an account.
     */
    if (!authUser) {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo: `${APP_URL}/employee-login`,
          data: {
            full_name: normalizedFullName,
            role: 'employee',
            restaurant_id: RESTAURANT_ID,
          },
        });

      if (inviteError) {
        throw inviteError;
      }

      authUser = inviteData?.user || null;
    }

    const authUserId = authUser?.id;

    if (!authUserId) {
      throw new Error('Unable to determine the employee Auth user ID.');
    }

    /*
     * Add or update the employee membership for this restaurant.
     *
     * The same Auth user can be:
     * - a customer
     * - an employee
     * - an employee at more than one restaurant
     */
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .upsert(
        {
          restaurant_id: RESTAURANT_ID,
          auth_user_id: authUserId,
          full_name:
            normalizedFullName ||
            authUser.user_metadata?.full_name ||
            '',
          email: normalizedEmail,
          role: 'employee',
          status: isExistingUser ? 'active' : 'invited',
          is_active: true,
        },
        {
          onConflict: 'restaurant_id,auth_user_id',
        }
      )
      .select()
      .single();

    if (employeeError) {
      throw employeeError;
    }

    return response(200, {
      success: true,
      existingUser: isExistingUser,
      employee,
      message: isExistingUser
        ? 'Existing account added as an employee.'
        : 'Employee invitation sent.',
    });
  } catch (error) {
    console.error('Invite employee error:', error);

    return response(500, {
      error: error.message || 'Failed to invite employee.',
    });
  }
};