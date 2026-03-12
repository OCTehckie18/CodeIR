import { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../lib/supabaseClient";
import {
  X,
  User,
  Save,
  AlertTriangle,
  Sun,
  Moon,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// ProfileSettings — slide-in modal for viewing/editing user profile.
//
// Calls:
//   GET  /api/profiles/:userId  — load profile on open
//   PUT  /api/profiles/:userId  — save changes
//   DELETE /api/profiles/:userId — delete account (danger zone)
// ─────────────────────────────────────────────────────────────────

interface ProfileSettingsProps {
  userId: string;
  onClose: () => void;
  onProfileUpdated?: (profile: any) => void; // notify parent of new data
}

export default function ProfileSettings({ userId, onClose, onProfileUpdated }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Editable form fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [themePreference, setThemePreference] = useState<"dark" | "light">("dark");

  // Fetch profile on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await axios.get(
          `http://127.0.0.1:5000/api/profiles/${userId}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        if (response.data.success) {
          const p = response.data.profile;
          setProfile(p);
          setDisplayName(p.display_name || "");
          setBio(p.bio || "");
          setThemePreference(p.theme_preference || "dark");
        }
      } catch (err: any) {
        console.error("Failed to load profile:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.put(
        `http://127.0.0.1:5000/api/profiles/${userId}`,
        { display_name: displayName, bio, theme_preference: themePreference },
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );

      if (response.data.success) {
        // Apply theme change instantly
        if (themePreference === "dark") {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }

        setSaved(true);
        setProfile((prev: any) => ({ ...prev, display_name: displayName, bio, theme_preference: themePreference }));
        onProfileUpdated?.({ display_name: displayName, bio, theme_preference: themePreference });
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save: " + response.data.error);
      }
    } catch (err: any) {
      alert("Error saving profile: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert("Please type DELETE to confirm account deletion.");
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.delete(
        `http://127.0.0.1:5000/api/profiles/${userId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );

      if (response.data.success) {
        // Sign out — the auth state listener in App.tsx will redirect to AuthForm
        await supabase.auth.signOut();
      } else {
        alert("Failed to delete account: " + response.data.error);
        setDeleting(false);
      }
    } catch (err: any) {
      alert("Error deleting account: " + (err.response?.data?.error || err.message));
      setDeleting(false);
    }
  };

  const joinedFormatted = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[200] flex items-start justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative h-full w-full max-w-md bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <User size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your account preferences</p>
            </div>
          </div>
          <button
            id="close-profile-settings"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 p-6">

            {/* ── Avatar + Email (Read-only) ── */}
            <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <User size={32} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{displayName || profile?.email?.split("@")[0]}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Joined {joinedFormatted}</p>
              </div>
            </div>

            {/* ── Display Name ── */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
              <input
                id="profile-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                placeholder="Your public name"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{displayName.length}/40 characters</p>
            </div>

            {/* ── Bio ── */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bio</label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Tell us a little about yourself..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all text-sm resize-none custom-scrollbar"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{bio.length}/160 characters</p>
            </div>

            {/* ── Theme Preference ── */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Theme Preference</label>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-1">Your preference is saved to the DB and will apply on any device you sign into.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="theme-dark-btn"
                  onClick={() => setThemePreference("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    themePreference === "dark"
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Moon size={22} />
                  <span className="text-xs font-semibold">Dark</span>
                </button>
                <button
                  id="theme-light-btn"
                  onClick={() => setThemePreference("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    themePreference === "light"
                      ? "border-amber-400 bg-amber-500/10 text-amber-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Sun size={22} />
                  <span className="text-xs font-semibold">Light</span>
                </button>
              </div>
            </div>

            {/* ── Save Button ── */}
            <button
              id="save-profile-btn"
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                saved
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : saving
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20 hover:-translate-y-0.5"
              }`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>

            {/* ── Divider ── */}
            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

            {/* ── Danger Zone ── */}
            <div className="rounded-2xl border border-red-500/30 overflow-hidden">
              <button
                onClick={() => setShowDangerZone(!showDangerZone)}
                className="w-full flex items-center justify-between px-5 py-4 bg-red-500/5 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-bold">Danger Zone</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{showDangerZone ? "▲ Hide" : "▼ Show"}</span>
              </button>

              {showDangerZone && (
                <div className="p-5 bg-red-500/5 border-t border-red-500/20 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Deleting your account is <span className="font-bold text-red-400">permanent and irreversible</span>. All your submissions, evaluations, and data will be wiped from the database.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Type <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm:
                    </label>
                    <input
                      id="delete-confirm-input"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full bg-white dark:bg-slate-900 border border-red-500/40 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono"
                    />
                  </div>
                  <button
                    id="delete-account-btn"
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== "DELETE"}
                    className="w-full py-2.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-400 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                    {deleting ? "Deleting Account..." : "Permanently Delete Account"}
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
