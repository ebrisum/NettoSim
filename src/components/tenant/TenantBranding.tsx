"use client";

import { useSessionContext } from "@/components/providers/SessionProvider";
import { useMemo, type ReactNode } from "react";

/**
 * Injects tenant CSS variables when tenant is loaded.
 * If tenant has customConfig.extraBenefits, they can be shown in results (handled by parent).
 */
export function TenantBranding({ children }: { children: ReactNode }) {
  const { tenant } = useSessionContext();

  const style = useMemo((): React.CSSProperties | undefined => {
    if (!tenant?.tenant) return undefined;
    const primary = (tenant.customConfig as { primaryColor?: string })?.primaryColor;
    if (!primary) return undefined;
    return { ["--tenant-primary" as string]: primary };
  }, [tenant]);

  return <div style={style}>{children}</div>;
}
