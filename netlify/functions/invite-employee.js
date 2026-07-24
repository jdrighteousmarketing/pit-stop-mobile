const { createClient } = require('@supabase/supabase-js');

const RESTAURANT_ID = process.env.RESTAURANT_ID;

const RESTAURANT_NAME = process.env.RESTAURANT_NAME;

const APP_URL = process.env.APP_URL;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMPLOYEE_EMAIL_FROM =
  process.env.EMPLOYEE_EMAIL_FROM;

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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function findExistingAuthUser(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw error;
    }

    const existingUser = data.users.find(
      (user) =>
        user.email?.trim().toLowerCase() === email
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

async function sendExistingUserEmployeeEmail({
  email,
  fullName,
}) {
  if (!RESEND_API_KEY) {
    throw new Error(
      'RESEND_API_KEY is missing from the Netlify environment variables.'
    );
  }

  const safeName = escapeHtml(fullName || 'there');
  const employeeLoginUrl = `${APP_URL}/employee-login`;

  const resendResponse = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMPLOYEE_EMAIL_FROM,
        to: [email],
        subject: `You have been added as a ${RESTAURANT_NAME} employee`,
        html: `
          <!doctype html>
          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#f5f5f5;
                font-family:Arial,Helvetica,sans-serif;
                color:#222222;
              "
            >
              <div
                style="
                  max-width:600px;
                  margin:0 auto;
                  padding:32px 20px;
                "
              >
                <div
                  style="
                    background:#ffffff;
                    border-radius:14px;
                    padding:32px;
                    box-shadow:0 4px 14px rgba(0,0,0,0.08);
                  "
                >
                  <h1
                    style="
                      margin:0 0 18px;
                      font-size:26px;
                      line-height:1.3;
                    "
                  >
                    Employee access added
                  </h1>

                  <p
                    style="
                      margin:0 0 16px;
                      font-size:16px;
                      line-height:1.6;
                    "
                  >
                    Hello ${safeName},
                  </p>

                  <p
                    style="
                      margin:0 0 16px;
                      font-size:16px;
                      line-height:1.6;
                    "
                  >
                    You have been added as an employee at
${escapeHtml(RESTAURANT_NAME)}.
                  </p>

                  <p
                    style="
                      margin:0 0 24px;
                      font-size:16px;
                      line-height:1.6;
                    "
                  >
                    Your email already has a JD Righteous LLC-powered
                    account, so you do not need to create another password.
                    Sign in to the employee portal using your existing email
                    address and password.
                  </p>

                  <a
                    href="${employeeLoginUrl}"
                    style="
                      display:inline-block;
                      padding:14px 22px;
                      border-radius:8px;
                      background:#111827;
                      color:#ffffff;
                      text-decoration:none;
                      font-size:16px;
                      font-weight:700;
                    "
                  >
                    Employee Login
                  </a>

                  <p
                    style="
                      margin:24px 0 0;
                      font-size:13px;
                      line-height:1.5;
                      color:#666666;
                    "
                  >
                    Employee access is powered by JD Righteous LLC.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    }
  );

  const resendResult = await resendResponse.json();

  if (!resendResponse.ok) {
    throw new Error(
      resendResult?.message ||
        resendResult?.error ||
        'Resend failed to send the employee email.'
    );
  }

  return resendResult;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return response(405, {
        error: 'Method not allowed. Use POST.',
      });
    }

    if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !RESTAURANT_ID ||
  !RESTAURANT_NAME ||
  !APP_URL ||
  !EMPLOYEE_EMAIL_FROM
) {
  return response(500, {
    error: 'Required environment variables are missing.',
  });
}

    const authorizationHeader =
      event.headers.authorization ||
      event.headers.Authorization ||
      '';

    const accessToken =
      authorizationHeader.startsWith('Bearer ')
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
        error:
          'Your administrator session is invalid or expired.',
      });
    }

    const {
      data: administrator,
      error: administratorError,
    } = await supabaseAdmin
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
        error:
          'Only an active restaurant administrator can invite employees.',
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

    let authUser =
      await findExistingAuthUser(normalizedEmail);

    const isExistingUser = Boolean(authUser);

    if (!authUser) {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(
          normalizedEmail,
          {
            redirectTo: `${APP_URL}/employee-login`,
            data: {
              full_name: normalizedFullName,
              role: 'employee',
              restaurant_id: RESTAURANT_ID,
            },
          }
        );

      if (inviteError) {
        throw inviteError;
      }

      authUser = inviteData?.user || null;
    }

    const authUserId = authUser?.id;

    if (!authUserId) {
      throw new Error(
        'Unable to determine the employee Auth user ID.'
      );
    }

    const employeeName =
      normalizedFullName ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      normalizedEmail.split('@')[0];

    const { data: employee, error: employeeError } =
      await supabaseAdmin
        .from('employees')
        .upsert(
          {
            restaurant_id: RESTAURANT_ID,
            auth_user_id: authUserId,
            full_name: employeeName,
            email: normalizedEmail,
            role: 'employee',
            status: isExistingUser
              ? 'active'
              : 'invited',
            is_active: true,
          },
          {
            onConflict:
              'restaurant_id,auth_user_id',
          }
        )
        .select()
        .single();

    if (employeeError) {
      throw employeeError;
    }

    let notificationEmailSent = false;

    if (isExistingUser) {
      await sendExistingUserEmployeeEmail({
        email: normalizedEmail,
        fullName: employeeName,
      });

      notificationEmailSent = true;
    }

    return response(200, {
      success: true,
      existingUser: isExistingUser,
      notificationEmailSent,
      employee,
      message: isExistingUser
        ? 'Existing account added as an employee and notification email sent.'
        : 'Employee invitation sent.',
    });
  } catch (error) {
    console.error('Invite employee error:', error);

    return response(500, {
      error:
        error?.message ||
        'Failed to invite employee.',
    });
  }
};