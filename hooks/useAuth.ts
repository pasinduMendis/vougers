"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  ClientTokenPayload,
  ProviderTokenPayload,
  LoginRequest,
  RegisterClientRequest,
  RegisterProviderRequest,
} from "@/src/lib/types/auth.types";

// User type from /api/auth/me response
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  type: "client" | "provider";
  // Client-specific
  companyName?: string;
  companyAddress?: string;
  // Provider-specific
  organizationId?: string;
  organizationName?: string;
  role?: "admin" | "view_edit" | "view_only";
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  login: (credentials: LoginRequest, redirectUrl?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  registerClient: (data: RegisterClientRequest) => Promise<void>;
  registerProvider: (data: RegisterProviderRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch current user
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          return;
        }
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();

      if (data.success && data.data && data.data.user) {
        // API returns { type, user } - extract user and add type to it
        const userData = {
          ...data.data.user,
          type: data.data.type,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login
  const login = useCallback(
    async (credentials: LoginRequest, redirectUrl?: string | null) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Login failed");
        }

        if (data.success && data.data) {
          setUser(data.data.user);

          // Determine the target URL
          let targetUrl = redirectUrl;
          if (!targetUrl) {
            targetUrl = data.data.user.type === "client"
              ? "/client/quotes"
              : "/provider/quotes";
          }

          // Use window.location for full page navigation to ensure cookie is sent
          window.location.href = targetUrl;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Register client
  const registerClient = useCallback(
    async (data: RegisterClientRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "client", ...data }),
        });

        console.log(response, data);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Registration failed");
        }

        // Redirect to login after successful registration
        router.push("/login?registered=true");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Register provider
  const registerProvider = useCallback(
    async (data: RegisterProviderRequest) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "provider", ...data }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Registration failed");
        }

        // Redirect to login after successful registration
        router.push("/login?registered=true");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Computed properties
  const isAuthenticated = !!user;
  const isClient = user?.type === "client";
  const isProvider = user?.type === "provider";
  const isAdmin = isProvider && user?.role === "admin";
  const canEdit =
    isProvider && (user?.role === "admin" || user?.role === "view_edit");

  return {
    user,
    isLoading,
    isAuthenticated,
    isClient,
    isProvider,
    isAdmin,
    canEdit,
    login,
    logout,
    registerClient,
    registerProvider,
    refreshUser,
    error,
  };
}
