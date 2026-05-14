import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names.
 * 使用 clsx 處理 conditional/array/object class、twMerge 解決 Tailwind 衝突
 * （後出現的同 group class 覆蓋前面，例如 `p-2 p-4` 結果為 `p-4`）。
 *
 * 接受 string / array / object / falsy 任意組合，向下兼容原本 hoochuu-internal 簡單版的呼叫者。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMonthValue(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 7);
  return value;
}
