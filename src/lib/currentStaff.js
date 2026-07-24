// @ts-nocheck

import { restaurantConfig } from '@/config/restaurantConfig';
import { supabase } from '@/lib/supabaseClient';

const RESTAURANT_ID = restaurantConfig.id;

function normalizeStaffRecord(record, authUser, role) {
  return {
    id: record?.id || null,
    auth_user_id:
      record?.auth_user_id ||
      authUser?.id ||
      null,

    name:
      record?.name ||
      record?.full_name ||
      record?.employee_name ||
      record?.admin_name ||
      authUser?.user_metadata?.name ||
      authUser?.user_metadata?.full_name ||
      authUser?.email ||
      'Employee',

    email:
      record?.email ||
      authUser?.email ||
      null,

    role,
  };
}

async function findEmployee(authUser) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeStaffRecord(data, authUser, 'employee');
  }

  if (!authUser.email) {
    return null;
  }

  const { data: employeeByEmail, error: emailError } = await supabase
    .from('employees')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .ilike('email', authUser.email)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  return employeeByEmail
    ? normalizeStaffRecord(employeeByEmail, authUser, 'employee')
    : null;
}

async function findAdmin(authUser) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeStaffRecord(data, authUser, 'admin');
  }

  if (!authUser.email) {
    return null;
  }

  const { data: adminByEmail, error: emailError } = await supabase
    .from('admins')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .ilike('email', authUser.email)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  return adminByEmail
    ? normalizeStaffRecord(adminByEmail, authUser, 'admin')
    : null;
}

export async function getCurrentStaff() {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authUser) {
    throw new Error('No authenticated staff user was found.');
  }

  const employee = await findEmployee(authUser);

  if (employee) {
    return employee;
  }

  const admin = await findAdmin(authUser);

  if (admin) {
    return admin;
  }

  return normalizeStaffRecord(null, authUser, 'staff');
}