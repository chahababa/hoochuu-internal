"use client";

// Ported from Hoochuu-Bom-System/src/app/import/page.tsx (Phase 3+4d)

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import { Input } from "@/components/bom/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import { Badge } from "@/components/bom/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type SheetData = {
  name: string;
  rows: { material: string; quantity: number; unit: string }[];
};

type DedupItem = {
  name: string;
  type: "ingredient" | "product";
  suggestion: { id: string; name: string; score: number } | null;
  action: "merge" | "create";
  mergedId?: string;
};

type ImportResult = {
  success: number;
  failed: number;
  batchId: string;
};

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [dedupItems, setDedupItems] = useState<DedupItem[]>([]);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload & parse
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      toast.error("請上傳 .xlsx 格式的 Excel 檔案");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const parsed: SheetData[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        const rows = json
          .slice(1) // skip header
          .filter((row) => row[0])
          .map((row) => ({
            material: String(row[0] ?? ""),
            quantity: Number(row[1]) || 0,
            unit: String(row[2] ?? ""),
          }));
        return { name, rows };
      });

      setSheets(parsed);
      setStep(2);
      runDedup(parsed);
    };
    reader.readAsArrayBuffer(file);
  }

  // Step 2: Dedup
  async function runDedup(parsedSheets: SheetData[]) {
    setDedupLoading(true);
    const supabase = createClient();
    const allNames = new Set<string>();
    parsedSheets.forEach((s) => s.rows.forEach((r) => allNames.add(r.material)));

    const items: DedupItem[] = [];
    for (const name of allNames) {
      const { data: ingResults } = await supabase.schema("bom").rpc("suggest_similar_ingredients", { query: name });
      const topMatch = ingResults?.[0];

      items.push({
        name,
        type: "ingredient",
        suggestion: topMatch ? { id: topMatch.id, name: topMatch.name, score: topMatch.similarity_score } : null,
        action: topMatch && topMatch.similarity_score >= 0.5 ? "merge" : "create",
        mergedId: topMatch && topMatch.similarity_score >= 0.5 ? topMatch.id : undefined,
      });
    }

    setDedupItems(items);
    setDedupLoading(false);
  }

  function toggleDedupAction(index: number) {
    setDedupItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (item.action === "merge") {
          return { ...item, action: "create", mergedId: undefined };
        }
        return {
          ...item,
          action: "merge",
          mergedId: item.suggestion?.id,
        };
      })
    );
  }

  // Step 5: Batch insert
  async function handleImport() {
    setImporting(true);
    setProgress(0);
    const supabase = createClient();
    const batchId = crypto.randomUUID();
    let success = 0;
    let failed = 0;

    // Build ingredient name → id map
    const ingredientMap = new Map<string, string>();
    const totalSteps = dedupItems.filter((d) => d.action === "create").length + sheets.length;
    let completed = 0;

    // Create new ingredients
    for (const item of dedupItems) {
      if (item.action === "create") {
        const { data, error } = await supabase
          .schema("bom")
          .from("ingredients")
          .insert({ name: item.name, category: "food" })
          .select("id")
          .single();
        if (error) {
          failed++;
          await supabase.schema("bom").from("import_errors").insert({
            import_batch_id: batchId,
            error_message: `建立食材 "${item.name}" 失敗：${error.message}`,
            raw_data: { name: item.name },
          });
        } else {
          ingredientMap.set(item.name, data.id);
          success++;
        }
      } else {
        ingredientMap.set(item.name, item.mergedId!);
      }
      completed++;
      setProgress(Math.round((completed / totalSteps) * 100));
    }

    // Create dishes from sheets
    for (const sheet of sheets) {
      // For each sheet, create a dish and its BOM
      const bomItems = sheet.rows.map((row) => {
        const ingId = ingredientMap.get(row.material);
        return {
          type: "product" as const,
          ref_id: ingId ?? "",
          quantity: row.quantity,
          unit: row.unit,
        };
      });

      const { data: dish, error: dishErr } = await supabase
        .schema("bom")
        .from("dishes")
        .insert({ name: sheet.name, service_mode: "both" })
        .select("id")
        .single();

      if (dishErr || !dish) {
        failed++;
        await supabase.schema("bom").from("import_errors").insert({
          import_batch_id: batchId,
          sheet_name: sheet.name,
          error_message: `建立餐點 "${sheet.name}" 失敗：${dishErr?.message ?? ""}`,
          raw_data: { sheet_name: sheet.name, rows: sheet.rows },
        });
      } else {
        // Create version
        const { data: ver, error: verErr } = await supabase
          .schema("bom")
          .from("dish_versions")
          .insert({
            dish_id: dish.id,
            version_number: 1,
            bom_items: bomItems,
            notes: "Excel 匯入",
          })
          .select("id")
          .single();

        if (verErr || !ver) {
          failed++;
          await supabase.schema("bom").from("import_errors").insert({
            import_batch_id: batchId,
            sheet_name: sheet.name,
            error_message: `建立 BOM 版本失敗：${verErr?.message ?? ""}`,
            raw_data: { dish_id: dish.id, bom_items: bomItems },
          });
        } else {
          await supabase.schema("bom").from("dishes").update({ current_version_id: ver.id }).eq("id", dish.id);
          success++;
        }
      }
      completed++;
      setProgress(Math.round((completed / totalSteps) * 100));
    }

    setResult({ success, failed, batchId });
    setImporting(false);
    setStep(5);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">批次匯入 Excel</h1>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((s) => (
          <Badge key={s} variant={step >= s ? "default" : "outline"}>
            Step {s}
          </Badge>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Step 1：上傳 Excel 檔案</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              上傳 .xlsx 檔案，每個 sheet 代表一道餐點的 BOM。欄位順序：A=材料名、B=數量、C=單位。
            </p>
            <Input ref={fileRef} type="file" accept=".xlsx" onChange={handleFileChange} />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Dedup */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Step 2：去重確認（偵測到 {sheets.length} 個 sheet）</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {dedupLoading ? (
              <p className="text-center text-muted-foreground py-4">比對中...</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>相似建議</TableHead>
                      <TableHead>處理方式</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dedupItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.suggestion
                            ? `${item.suggestion.name}（${Math.round(item.suggestion.score * 100)}%）`
                            : "無相似項"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={item.action === "merge" ? "default" : "outline"}
                            onClick={() => toggleDedupAction(i)}
                            disabled={!item.suggestion}
                          >
                            {item.action === "merge" ? "合併" : "建立新項"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button className="w-full" onClick={() => setStep(3)}>下一步</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: BOM Preview */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Step 3：BOM 預覽</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {sheets.map((sheet, si) => (
              <div key={si} className="border rounded-md p-3">
                <h3 className="font-medium mb-2">{sheet.name}（{sheet.rows.length} 個品項）</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>材料名</TableHead>
                      <TableHead className="text-right">數量</TableHead>
                      <TableHead>單位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheet.rows.map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell>{row.material}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell>{row.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
              <Button className="flex-1" onClick={() => setStep(4)}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Step 4：確認匯入</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p>新建食材：{dedupItems.filter((d) => d.action === "create").length} 個</p>
              <p>合併到既有：{dedupItems.filter((d) => d.action === "merge").length} 個</p>
              <p>餐點數量：{sheets.length} 道</p>
              <p>BOM 品項總數：{sheets.reduce((sum, s) => sum + s.rows.length, 0)} 筆</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>上一步</Button>
              <Button className="flex-1" onClick={handleImport} disabled={importing}>
                {importing ? "匯入中..." : "開始匯入"}
              </Button>
            </div>
            {importing && (
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">{progress}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {step === 5 && result && (
        <Card>
          <CardHeader><CardTitle>匯入完成</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-lg">
              匯入完成：{result.success} 筆成功，{result.failed} 筆失敗
            </p>
            {result.failed > 0 && (
              <p className="text-sm text-muted-foreground">
                批次 ID：{result.batchId}（可在 import_errors 表查看詳情）
              </p>
            )}
            <Button onClick={() => { setStep(1); setSheets([]); setDedupItems([]); setResult(null); }}>
              重新匯入
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
