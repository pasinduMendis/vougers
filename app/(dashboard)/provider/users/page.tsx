'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { UserForm, UserFormData } from '@/components/forms/UserForm';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/src/lib/utils';
import type { ApiResponse } from '@/src/lib/types/api.types';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'view_edit' | 'view_only';
  isActive: boolean;
  createdAt: string;
}

export default function ProviderUsersPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin } = useAuth();

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users', {
        credentials: 'include',
      });

      const data: ApiResponse<User[]> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      if (data.success && data.data) {
        setUsers(data.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin && currentUser) {
      router.push('/provider/quotes');
    }
  }, [isAdmin, currentUser, router]);

  // Handle create user
  const handleCreate = () => {
    setSelectedUser(null);
    setFormMode('create');
    setFormOpen(true);
  };

  // Handle edit user
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormMode('edit');
    setFormOpen(true);
  };

  // Handle form submit
  const handleFormSubmit = async (data: UserFormData) => {
    const url = formMode === 'create' ? '/api/users' : `/api/users/${data._id}`;
    const method = formMode === 'create' ? 'POST' : 'PATCH';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result: ApiResponse<User> = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save user');
    }

    await fetchUsers();
  };

  // Handle delete confirmation
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Handle delete user
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/users/${userToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate user');
      }

      setDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Role badge colors
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'view_edit':
        return 'bg-blue-100 text-blue-800';
      case 'view_only':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format role label
  const formatRole = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'view_edit':
        return 'View & Edit';
      case 'view_only':
        return 'View Only';
      default:
        return role;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage users in your organization
          </p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card variant="bordered" padding="md" className="bg-red-50 border-red-200">
          <CardContent className="text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Users Table */}
      {!isLoading && users.length > 0 && (
        <Card variant="bordered" padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {user._id === currentUser?.id && (
                      <span className="ml-2 text-xs text-gray-600">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {formatRole(user.role)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      {user._id !== currentUser?.id && user.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(user)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && users.length === 0 && !error && (
        <Card variant="bordered" padding="lg">
          <CardContent className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No team members yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Add team members to help manage quotes.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate}>Add First User</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Form Modal */}
      <UserForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedUser ? {
          _id: selectedUser._id,
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          isActive: selectedUser.isActive,
        } : undefined}
        mode={formMode}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${userToDelete?.name}? They will no longer be able to access the system.`}
        size="sm"
      >
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            Deactivate
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
