"use client";

// Ported from Hoochuu-Bom-System/src/lib/hooks/use-audit-log.ts (Phase 3+4b)
// Rewrites: rpc("fn_record_query_audit") → schema("bom").rpc("fn_record_query_audit"),
// import paths to @/lib/bom/types/*.

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { AuditAction, AuditResource } from "@/lib/bom/types/audit-log";

interface UseAuditLogParams {
  resource: AuditResource | string;
  action: AuditAction;
  params?: Record<string, unknown>;
  /** 為 true 時跳過記錄（例：未確定要記的條件式呼叫）*/
  skip?: boolean;
}

const FILTER_DEBOUNCE_MS = 300;

async function recordOnce(
  resource: string,
  action: AuditAction,
  params: Record<string, unknown> | undefined,
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.schema("bom").rpc("fn_record_query_audit", {
      p_resource: resource,
      p_action: action,
      p_params: (params ?? {}) as Json,
    });
    if (error) {
      console.warn("[useAuditLog] rpc error:", error.message);
    }
  } catch (e) {
    console.warn("[useAuditLog] threw:", (e as Error).message);
  }
}

/**
 * 在敏感資料頁面 mount 時記錄一次「view」、或在 filter / search 變動時記錄。
 *
 * - action='view'：only fires once per mount lifecycle（StrictMode double-mount 安全）
 * - action='filter' / 'search'：300ms debounce，連續變動只記最終值
 * - skip=true：跳過記錄（給條件式 ready）
 *
 * 失敗 silently console.warn，不影響 UI。
 */
export function useAuditLog({ resource, action, params, skip }: UseAuditLogParams): void {
  const firedOnceRef = useRef(false);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (skip) return;

    if (action === "view") {
      if (firedOnceRef.current) return;
      firedOnceRef.current = true;
      void recordOnce(resource, action, params);
      return;
    }

    // filter / search / export — debounce
    const handle = setTimeout(() => {
      void recordOnce(resource, action, params);
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, action, paramsKey, skip]);
}
