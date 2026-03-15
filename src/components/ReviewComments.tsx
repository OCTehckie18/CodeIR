import { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
import { supabase } from "../lib/supabaseClient";
import { handleApiError } from "../lib/errorHandler";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
  Info,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// ReviewComments — fully CRUD-able per-line annotation panel
// Sits inside InstructorEvaluation replacing the old feedback textarea.
//
// Props:
//   submissionId  — UUID of the submission being reviewed
//   instructorId  — UUID of the logged-in instructor
//   code          — raw source code string (for line-count picker)
// ─────────────────────────────────────────────────────────────────

export type CommentType =
  | "general"
  | "error"
  | "warning"
  | "suggestion"
  | "praise";

interface ReviewComment {
  comment_id: string;
  submission_id: string;
  instructor_id: string;
  line_number: number;
  comment_text: string;
  comment_type: CommentType;
  created_at: string;
  updated_at: string;
}

interface ReviewCommentsProps {
  submissionId: string | undefined;
  instructorId: string | undefined;
  code: string;
}

// ── Badge config per comment type ──
const TYPE_CONFIG: Record<
  CommentType,
  { label: string; color: string; icon: ReactNode }
> = {
  general: {
    label: "General",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: <Info size={11} />,
  },
  error: {
    label: "Error",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: <AlertTriangle size={11} />,
  },
  warning: {
    label: "Warning",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: <AlertTriangle size={11} />,
  },
  suggestion: {
    label: "Suggestion",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: <Lightbulb size={11} />,
  },
  praise: {
    label: "Praise",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: <ThumbsUp size={11} />,
  },
};

export default function ReviewComments({
  submissionId,
  instructorId,
  code,
}: ReviewCommentsProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);

  // New comment form state
  const [newLine, setNewLine] = useState<number>(0);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<CommentType>("general");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState<CommentType>("general");
  const [editLine, setEditLine] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalLines = code ? code.split("\n").length : 0;

  // ── Fetch comments on mount / submissionId change ──
  useEffect(() => {
    if (!submissionId) return;
    fetchComments();
  }, [submissionId]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${baseUrl}/api/review-comments/${submissionId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) setComments(res.data.data);
    } catch (err: any) {
      console.error("Failed to load comments:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE ──
  const handleAdd = async () => {
    if (!submissionId || !instructorId) return;
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const token = await getToken();
      const res = await axios.post(
        `${baseUrl}/api/review-comments`,
        {
          submission_id: submissionId,
          instructor_id: instructorId,
          line_number: newLine,
          comment_text: newText.trim(),
          comment_type: newType,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setComments((prev) =>
          [...prev, res.data.data].sort(
            (a, b) =>
              a.line_number - b.line_number ||
              a.created_at.localeCompare(b.created_at),
          ),
        );
        setNewText("");
        setNewLine(0);
        setNewType("general");
        setShowForm(false);
      }
    } catch (err: any) {
      handleApiError(err, "Adding comment");
    } finally {
      setAdding(false);
    }
  };

  // ── START EDIT ──
  const startEdit = (c: ReviewComment) => {
    setEditingId(c.comment_id);
    setEditText(c.comment_text);
    setEditType(c.comment_type);
    setEditLine(c.line_number);
  };

  // ── UPDATE ──
  const handleUpdate = async (commentId: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await axios.put(
        `${baseUrl}/api/review-comments/${commentId}`,
        {
          comment_text: editText.trim(),
          comment_type: editType,
          line_number: editLine,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setComments((prev) =>
          prev
            .map((c) => (c.comment_id === commentId ? res.data.data : c))
            .sort(
              (a, b) =>
                a.line_number - b.line_number ||
                a.created_at.localeCompare(b.created_at),
            ),
        );
        setEditingId(null);
      }
    } catch (err: any) {
      handleApiError(err, "Updating comment");
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setDeletingId(commentId);
    try {
      const token = await getToken();
      await axios.delete(
        `${baseUrl}/api/review-comments/${commentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setComments((prev) => prev.filter((c) => c.comment_id !== commentId));
    } catch (err: any) {
      handleApiError(err, "Deleting comment");
    } finally {
      setDeletingId(null);
    }
  };

  const TypeBadge = ({ type }: { type: CommentType }) => {
    const cfg = TYPE_CONFIG[type];
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}
      >
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  // ── No submission ID (manual mode) ──
  if (!submissionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 p-6 text-center">
        <MessageSquare size={28} className="opacity-30" />
        <p className="text-xs font-medium">
          Line comments require a linked submission.
        </p>
        <p className="text-[11px] opacity-60">
          Open a submission from the dashboard to add review comments.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="px-4 py-3 bg-emerald-900/20 border-b border-emerald-500/20 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
          <MessageSquare size={16} />
          Code Review Comments
          {comments.length > 0 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
              {comments.length}
            </span>
          )}
        </span>
        <button
          id="add-review-comment-btn"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-2 py-1 rounded transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={10} /> Add Comment
        </button>
      </div>

      {/* ── Add Comment Form (collapsible) ── */}
      {showForm && (
        <div className="px-4 py-3 bg-emerald-950/60 border-b border-emerald-500/20 flex-shrink-0 space-y-2">
          {/* Row 1: Line + Type */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-shrink-0">
              <label className="text-[10px] text-slate-400 font-semibold">
                Line #
              </label>
              <input
                id="new-comment-line"
                type="number"
                min={0}
                max={totalLines}
                value={newLine}
                onChange={(e) => setNewLine(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] text-slate-400 font-semibold">
                Type
              </label>
              <select
                id="new-comment-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as CommentType)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {(Object.keys(TYPE_CONFIG) as CommentType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Text */}
          <textarea
            id="new-comment-text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder={
              newLine === 0
                ? "General comment about this submission..."
                : `Comment for line ${newLine}...`
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />

          {/* Row 3: Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-review-comment-btn"
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Check size={11} />
              )}
              {adding ? "Saving..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}

      {/* ── Comment List ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-slate-600">
            <MessageSquare size={22} className="opacity-40" />
            <p className="text-[11px]">
              No comments yet. Click "Add Comment" to start a review.
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.comment_id}
              className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden group"
            >
              {editingId === c.comment_id ? (
                /* ── EDIT MODE ── */
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={totalLines}
                      value={editLine}
                      onChange={(e) => setEditLine(Number(e.target.value))}
                      className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <select
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as CommentType)
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer flex-1"
                    >
                      {(Object.keys(TYPE_CONFIG) as CommentType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_CONFIG[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                    <button
                      onClick={() => handleUpdate(c.comment_id)}
                      disabled={saving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Check size={11} />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* ── READ MODE ── */
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Line badge */}
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {c.line_number === 0 ? "General" : `L${c.line_number}`}
                      </span>
                      <TypeBadge type={c.comment_type} />
                    </div>
                    {/* Action buttons (shown on hover) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEdit(c)}
                        title="Edit comment"
                        className="p-1 rounded-lg hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.comment_id)}
                        disabled={deletingId === c.comment_id}
                        title="Delete comment"
                        className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {deletingId === c.comment_id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {c.comment_text}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1.5">
                    {new Date(c.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {c.updated_at !== c.created_at && " · edited"}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
