import Image from "next/image";
import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import {
  getImprovementTasks,
  updateImprovementTaskStatus,
  type ImprovementResolutionPhotoInput,
} from "@/lib/inspection";
import { groupImprovementTasksByStore } from "@/lib/improvement-task-groups";
import { getImprovementStatusLabel } from "@/lib/improvement-workflow";
import { getInspectionTagLabel } from "@/lib/ui-labels";

type Status = "pending" | "resolved" | "verified" | "superseded";

function statusChipClass(status: Status) {
  if (status === "pending") return "nb-chip-red";
  if (status === "resolved") return "nb-chip-yellow";
  if (status === "verified") return "nb-chip-green";
  return "nb-chip-ink";
}

function tagChipClass(tagType: "critical" | "monthly_attention" | "complaint_watch") {
  if (tagType === "critical") return "nb-chip-red";
  if (tagType === "monthly_attention") return "nb-chip-yellow";
  return "nb-chip-ink";
}

export default async function ImprovementTasksPage() {
  const profile = await requireRole("owner", "manager", "leader");
  const tasks = await getImprovementTasks();
  const canManageStatus = profile.role === "owner" || profile.role === "manager";
  const canReportResolved = profile.role === "leader";

  async function updateStatusAction(formData: FormData) {
    "use server";
    const status = String(formData.get("status")) as Status;

    let resolutionNote: string | null | undefined;
    let resolutionPhotos: ImprovementResolutionPhotoInput[] | undefined;

    if (status === "resolved") {
      const rawNote = formData.get("resolutionNote");
      if (typeof rawNote === "string") {
        resolutionNote = rawNote;
      }

      const fileEntries = formData.getAll("resolutionPhotos");
      const validFiles = fileEntries.filter(
        (entry): entry is File => entry instanceof File && entry.size > 0,
      );

      if (validFiles.length > 0) {
        resolutionPhotos = await Promise.all(
          validFiles.map(async (file) => ({
            fileName: file.name,
            contentType: file.type || "image/jpeg",
            buffer: Buffer.from(await file.arrayBuffer()),
          })),
        );
      }
    }

    await updateImprovementTaskStatus({
      id: String(formData.get("id")),
      status,
      resolutionNote,
      resolutionPhotos,
    });
  }

  const counts = {
    pending: tasks.filter((task) => task.status === "pending").length,
    resolved: tasks.filter((task) => task.status === "resolved").length,
    verified: tasks.filter((task) => task.status === "verified").length,
    superseded: tasks.filter((task) => task.status === "superseded").length,
  };

  const taskGroups = groupImprovementTasksByStore(tasks);

  return (
    <div className="grid gap-6">
      {/* Page header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="nb-eyebrow">Improvements</p>
          <h1 className="nb-h1 mt-2">改善追蹤</h1>
          <p className="mt-3 text-sm text-nb-ink/70 leading-6 max-w-2xl">
            追蹤低分題目的改善進度。店長可查看本店任務；主管與系統擁有者可推進任務狀態。
          </p>
        </div>
        <div className="nb-stamp">Improvement Board</div>
      </div>

      {/* Counts row */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="nb-card-sm bg-nb-red/10 px-5 py-4">
          <p className="nb-eyebrow">Pending</p>
          <p className="mt-2 font-nbSerif text-3xl font-black text-nb-red">{counts.pending}</p>
          <p className="mt-1 text-xs text-nb-ink/60 font-bold">待處理</p>
        </div>
        <div className="nb-card-sm bg-nb-yellow/40 px-5 py-4">
          <p className="nb-eyebrow">Resolved</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{counts.resolved}</p>
          <p className="mt-1 text-xs text-nb-ink/60 font-bold">已改善</p>
        </div>
        <div className="nb-card-sm bg-nb-green/40 px-5 py-4">
          <p className="nb-eyebrow">Verified</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{counts.verified}</p>
          <p className="mt-1 text-xs text-nb-ink/60 font-bold">已確認</p>
        </div>
        <div className="nb-card-sm px-5 py-4">
          <p className="nb-eyebrow">Superseded</p>
          <p className="mt-2 font-nbSerif text-3xl font-black text-nb-ink/60">{counts.superseded}</p>
          <p className="mt-1 text-xs text-nb-ink/60 font-bold">已替代</p>
        </div>
      </div>

      <SectionCard
        title="任務清單"
        eyebrow="Task List"
        description={
          canManageStatus
            ? "你可依改善進度推進任務狀態，並從明細頁回看原始巡店內容。店長回報已改善時可附照片與說明，作為改善佐證。"
            : "可查看本店待改善任務與原始巡店內容；完成改善後可附上照片與文字說明，回報已改善並等待主管確認。"
        }
      >
        <div className="grid gap-4">
          {taskGroups.map((group) => (
            <details
              key={group.storeId}
              data-testid={`improvement-store-group-${group.storeId}`}
              className="group border-[3px] border-nb-ink bg-white shadow-nb-sm"
              open={group.counts.pending > 0}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 bg-nb-yellow/40 px-4 py-4 marker:hidden md:flex-row md:items-center md:justify-between [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="nb-eyebrow">Store · 改善追蹤</p>
                  <h3 className="mt-1 font-nbSerif text-2xl font-black text-nb-ink">{group.storeName}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="nb-chip-ink">共 {group.total} 項</span>
                  <span className="nb-chip-red">待處理 {group.counts.pending}</span>
                  <span className="nb-chip-yellow">已改善 {group.counts.resolved}</span>
                  <span className="nb-chip-green">已確認 {group.counts.verified}</span>
                  <span className="nb-chip-ink">收合/展開 ▾</span>
                </div>
              </summary>

              <div className="grid gap-3 border-t-[3px] border-nb-ink p-3 md:p-4">
                {group.tasks.map((task) => {
                  const showResolutionEvidence =
                    (task.status === "resolved" || task.status === "verified") &&
                    (Boolean(task.resolutionNote) || task.resolutionPhotoUrls.length > 0);

                  return (
                    <div key={task.id} data-testid={`improvement-task-${task.id}`} className="nb-row">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-nbSerif text-lg font-black text-nb-ink">{task.item?.name ?? "未命名題目"}</p>
                            <span className={statusChipClass(task.status)}>{getImprovementStatusLabel(task.status)}</span>
                            {task.score?.tagTypes.map((tagType) => (
                              <span key={`${task.id}-${tagType}`} className={tagChipClass(tagType)}>
                                {getInspectionTagLabel(tagType)}
                              </span>
                            ))}
                            {task.score?.isFocusItem && task.score.tagTypes.length === 0 ? (
                              <span className="nb-chip-yellow">重點追蹤</span>
                            ) : null}
                          </div>
                          <p className="text-sm text-nb-ink/70 font-bold font-nbMono">
                            {task.score?.inspectionDate ?? "-"} · 分數 {task.score?.value ?? "-"}
                          </p>
                          {task.score?.note ? (
                            <p className="text-sm leading-6 text-nb-ink/80 bg-nb-bg2 border-l-[3px] border-nb-ink px-3 py-2">
                              {task.score.note}
                            </p>
                          ) : null}
                          {task.score?.inspectionId ? (
                            <Link href={`/inspection/history/${task.score.inspectionId}`} className="nb-btn-xs">
                              查看巡店明細 →
                            </Link>
                          ) : null}
                        </div>

                        {canManageStatus ? (
                          <form action={updateStatusAction} className="flex flex-wrap gap-2 md:max-w-[280px] md:justify-end">
                            <input type="hidden" name="id" value={task.id} />
                            <button
                              type="submit"
                              name="status"
                              value="pending"
                              data-testid={`improvement-task-status-pending-${task.id}`}
                              className="nb-btn-xs"
                            >
                              待處理
                            </button>
                            <button
                              type="submit"
                              name="status"
                              value="resolved"
                              data-testid={`improvement-task-status-resolved-${task.id}`}
                              className="nb-btn-xs bg-nb-yellow"
                            >
                              已改善
                            </button>
                            <button
                              type="submit"
                              name="status"
                              value="verified"
                              data-testid={`improvement-task-status-verified-${task.id}`}
                              className="nb-btn-xs bg-nb-green"
                            >
                              已確認
                            </button>
                            <button
                              type="submit"
                              name="status"
                              value="superseded"
                              data-testid={`improvement-task-status-superseded-${task.id}`}
                              className="nb-btn-xs bg-nb-ink text-white"
                            >
                              已替代
                            </button>
                          </form>
                        ) : canReportResolved && task.status === "pending" ? (
                          <details
                            data-testid={`improvement-task-report-form-${task.id}`}
                            className="md:max-w-[320px] md:min-w-[260px] border-[3px] border-nb-ink bg-white shadow-nb-sm"
                          >
                            <summary className="cursor-pointer list-none bg-nb-yellow px-3 py-2 text-center text-xs font-black text-nb-ink marker:hidden [&::-webkit-details-marker]:hidden">
                              回報已改善 ▾
                            </summary>
                            <form
                              action={updateStatusAction}
                              encType="multipart/form-data"
                              className="flex flex-col gap-3 border-t-[3px] border-nb-ink p-3"
                            >
                              <input type="hidden" name="id" value={task.id} />
                              <input type="hidden" name="status" value="resolved" />
                              <label className="flex flex-col gap-1 text-xs font-black text-nb-ink">
                                <span>改善照片（選填，可多張）</span>
                                <input
                                  type="file"
                                  name="resolutionPhotos"
                                  multiple
                                  accept="image/*"
                                  data-testid={`improvement-task-report-photos-${task.id}`}
                                  className="block w-full text-xs file:mr-2 file:rounded-none file:border-[3px] file:border-nb-ink file:bg-nb-bg2 file:px-2 file:py-1 file:text-xs file:font-black"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-black text-nb-ink">
                                <span>改善說明（選填）</span>
                                <textarea
                                  name="resolutionNote"
                                  rows={3}
                                  placeholder="例：已重新貼上溫度紀錄表並安排每日確認。"
                                  data-testid={`improvement-task-report-note-${task.id}`}
                                  className="border-[3px] border-nb-ink bg-white px-2 py-1 text-xs font-bold text-nb-ink focus:outline-none"
                                />
                              </label>
                              <button
                                type="submit"
                                data-testid={`improvement-task-report-resolved-${task.id}`}
                                className="nb-btn-xs bg-nb-yellow"
                              >
                                送出已改善
                              </button>
                              <p className="text-[10px] leading-4 text-nb-ink/60 font-bold">
                                提示：照片與說明可選填；總大小請控制在 8MB 內，避免上傳失敗。
                              </p>
                            </form>
                          </details>
                        ) : (
                          <div className="nb-card-flat px-4 py-3 text-xs leading-5 text-nb-ink/60 font-bold md:max-w-[240px]">
                            {task.status === "resolved" ? "已回報改善，等待主管確認。" : "此任務目前不需店長操作。"}
                          </div>
                        )}
                      </div>

                      {showResolutionEvidence ? (
                        <div className="mt-3 space-y-2 border-t-[3px] border-nb-ink/20 pt-3">
                          <p className="nb-eyebrow">改善佐證</p>
                          {task.resolutionNote ? (
                            <p className="text-sm leading-6 text-nb-ink/80 bg-nb-green/20 border-l-[3px] border-nb-ink px-3 py-2">
                              {task.resolutionNote}
                            </p>
                          ) : null}
                          {task.resolutionPhotoUrls.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {task.resolutionPhotoUrls.map((url, index) => (
                                <a
                                  key={`${task.id}-resolution-photo-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block border-[3px] border-nb-ink bg-white shadow-nb-sm"
                                >
                                  <Image
                                    src={url}
                                    alt={`改善照片 ${index + 1}`}
                                    width={120}
                                    height={120}
                                    unoptimized
                                    className="h-[120px] w-[120px] object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}

          {tasks.length === 0 && <div className="nb-empty">目前沒有待追蹤的改善任務。</div>}
        </div>
      </SectionCard>
    </div>
  );
}
