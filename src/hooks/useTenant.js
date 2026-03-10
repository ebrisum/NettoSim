"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase/client";

const API_BASE = "";

/**
 * Fetch tenant dashboard data. Requires Supabase auth; user must be in TenantUser.
 * @returns {{ data: object | null, isLoading: boolean, error: Error | null, refetch: function }}
 */
export function useTenant() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError(new Error("Not authenticated"));
        setData(null);
        return;
      }
      const res = await fetch(`${API_BASE}/api/v1/tenant`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
