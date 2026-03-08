'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import type { ProviderRole } from '@/src/lib/types/auth.types';

// User data for editing
export interface UserFormData {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: ProviderRole;
  isActive?: boolean;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: UserFormData;
  mode: 'create' | 'edit';
}

const ROLE_OPTIONS: { value: ProviderRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access including user management' },
  { value: 'view_edit', label: 'View & Edit', description: 'Can view and price quotes' },
  { value: 'view_only', label: 'View Only', description: 'Can only view quotes' },
];

export function UserForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: UserFormProps) {
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'view_only',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          _id: initialData._id,
          name: initialData.name,
          email: initialData.email,
          password: '',
          role: initialData.role,
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'view_only',
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password required only for new users
    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsLoading(true);
      setSubmitError(null);

      await onSubmit(formData);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user';
      setSubmitError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New User' : 'Edit User'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {submitError}
          </div>
        )}

        <div className="space-y-4">
          <Input
            name="name"
            label="Full Name *"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            disabled={isLoading}
          />

          <Input
            name="email"
            type="email"
            label="Email *"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={isLoading || mode === 'edit'}
            helperText={mode === 'edit' ? 'Email cannot be changed' : undefined}
          />

          <Input
            name="password"
            type="password"
            label={mode === 'create' ? 'Password *' : 'New Password'}
            placeholder={mode === 'create' ? 'Minimum 8 characters' : 'Leave blank to keep current'}
            value={formData.password || ''}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
            helperText={mode === 'edit' ? 'Leave blank to keep current password' : undefined}
          />

          {/* Role Selection */}
          <div className="w-full">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary sm:text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
            <p className="mt-1 text-sm text-gray-600">
              {ROLE_OPTIONS.find((opt) => opt.value === formData.role)?.description}
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {isLoading
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
              ? 'Create User'
              : 'Save Changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
