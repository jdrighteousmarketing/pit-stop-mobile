import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserPlus, Mail, Search, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function EmployeeManagement() {
  const [search, setSearch] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const inviteRole = 'employee';
  const restaurantId = 'pit_stop_mobile';
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employees', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Employees query error:', error);
        throw error;
      }

      console.log('Employees loaded:', data);
      return data || [];
    },
  });

  const employees = users.filter((u) =>
    ['owner_admin', 'admin', 'employee'].includes(u.role)
  );

  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;

    const s = search.toLowerCase();

    return (
      (e.full_name || '').toLowerCase().includes(s) ||
      (e.email || '').toLowerCase().includes(s)
    );
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, name }) => {
      const response = await fetch('/.netlify/functions/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fullName: name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite employee');
      }

      return result;
    },

    onSuccess: () => {
      setInviteSent(true);
      toast.success('Employee invite sent!');

      queryClient.invalidateQueries({
        queryKey: ['employees', restaurantId],
      });

      setTimeout(() => {
        setInviteSent(false);
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteName('');

        queryClient.invalidateQueries({
          queryKey: ['employees', restaurantId],
        });
      }, 2000);
    },

    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Failed to invite employee');
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('Delete employee error:', error);
        throw error;
      }

      return employeeId;
    },

    onSuccess: () => {
      toast.success('Employee deleted');

      queryClient.invalidateQueries({
        queryKey: ['employees', restaurantId],
      });
    },

    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Failed to delete employee');
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();

    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      name: inviteName,
    });
  };

  const handleDeleteEmployee = (employee) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        employee.full_name || employee.email || 'this employee'
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    deleteEmployeeMutation.mutate(employee.id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employees.length} team members
          </p>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Employee
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Employee</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <div className="mt-1">
                  <div className="p-3 rounded-lg border bg-primary/10 border-primary text-primary font-medium text-sm text-center">
                    <Shield className="w-4 h-4 mx-auto mb-1" />
                    <div>Employee</div>
                    <div className="text-[10px] mt-1">
                      Scanner & Directory
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                <Mail className="w-3 h-3 inline mr-1" />
                They'll receive an email with a link to set their password, then
                log in via the{' '}
                {inviteRole === 'employee' ? 'Employee' : 'Admin'} Login page.
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <Shield className="w-3 h-3 inline mr-1" />
                Employee will have access to scanner and customer directory only.
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={inviteMutation.isPending || inviteSent}
                variant={inviteSent ? 'outline' : 'default'}
              >
                {inviteMutation.isPending
                  ? 'Sending Invite...'
                  : inviteSent
                    ? 'Sent ✓'
                    : `Send ${
                        inviteRole === 'employee' ? 'Employee' : 'Admin'
                      } Invite`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Card className="mb-4 border-red-500/40">
          <CardContent className="py-4 text-sm text-red-400">
            Employee load error: {error.message}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-16 bg-card rounded-xl border animate-pulse"
              />
            ))
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No employees found
            </CardContent>
          </Card>
        ) : (
          filteredEmployees
            .sort((a, b) =>
              (a.full_name || '').localeCompare(b.full_name || '')
            )
            .map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {(emp.full_name || emp.email || '?')[0].toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        emp.role === 'owner_admin' || emp.role === 'admin'
                          ? 'default'
                          : 'outline'
                      }
                      className="whitespace-nowrap"
                    >
                      {emp.role === 'owner_admin' || emp.role === 'admin'
                        ? 'Owner'
                        : 'Employee'}
                    </Badge>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:border-red-500"
                      disabled={deleteEmployeeMutation.isPending}
                      onClick={() => handleDeleteEmployee(emp)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}