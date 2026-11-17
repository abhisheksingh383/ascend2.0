import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, BarChart3, Bell, BookOpen, BrainCircuit, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Code2, Flame, LayoutDashboard, LogOut,
  Menu, MoreHorizontal, Pencil, Plus, Search, Settings, ShieldCheck, ShoppingBag, Sparkles,
  Target, Trophy, UserRound, X,
} from "lucide-react";
import { AiAction, authProviders, loadUserData, requestAiCoach, saveUserData, signInWithOAuth, supabase } from "./lib/supabase";

type Task = { id: number; title: string; category: "Academic" | "Coding" | "Personal"; due: string; completed: boolean; priority: "High" | "Medium" | "Low" };
type Habit = { id: number; label: string; icon: string; color: string; progress: number; target: string; completed: boolean };
type FocusSession = { id: number; startedAt: string; endedAt: string; durationMinutes: number };
type ActivityDate = string;
type AcademicTopic = { id: number; title: string; covered: boolean };
type AcademicSubject = { id: number; name: string; code: string; topics: AcademicTopic[] };
type AcademicAssignment = { id: number; title: string; subject: string; due: string; priority: "High" | "Medium" | "Low" };
type User = { name: string; email: string; avatar: string };
type Profile = { name: string; dob: string; gender: string; course: string; standard: string };
type View = "Overview" | "Planner" | "Habits" | "Academics" | "Coding" | "Insights" | "Achievements" | "Marketplace" | "Settings";
type Theme = "system" | "light" | "dark";

const initialTasks: Task[] = [];
const initialHabits: Habit[] = [];
const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Planner", icon: CalendarDays },
  { label: "Habits", icon: Target }, { label: "Marketplace", icon: ShoppingBag }, { label: "Academics", icon: BookOpen },
  { label: "Coding", icon: Code2 }, { label: "Insights", icon: BarChart3 },
];

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("ascend-user");
    return saved ? JSON.parse(saved) as User : null;
  });
  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem("ascend-profile");
    return saved ? JSON.parse(saved) as Profile : null;
  });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [activeNav, setActiveNav] = useState<View>("Overview");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [showAddTask, setShowAddTask] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [streakCoins, setStreakCoins] = useState(0);
  const [streakFreezes, setStreakFreezes] = useState(0);
  const [rewardedTaskIds, setRewardedTaskIds] = useState<number[]>([]);
  const [rewardedHabitIds, setRewardedHabitIds] = useState<number[]>([]);
  const [coinNotice, setCoinNotice] = useState("");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("ascend-theme") as Theme) || "system");
  const [showSearch, setShowSearch] = useState(false);
  const [showStreakInsight, setShowStreakInsight] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem("ascend-workspace") || "Personal workspace");
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusStartedAt, setFocusStartedAt] = useState<number | null>(null);
  const [focusNow, setFocusNow] = useState(() => Date.now());
  const [activityDates, setActivityDates] = useState<ActivityDate[]>([]);
  const [activeTimeByDate, setActiveTimeByDate] = useState<Record<string, number>>({});
  const activeTimeRef = useRef<Record<string, number>>({});
  const lastInteractionRef = useRef(Date.now());
  const [activeClockSeconds, setActiveClockSeconds] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ascend-theme", theme);
  }, [theme]);
  useEffect(() => {
    const saved = localStorage.getItem("ascend-state");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { tasks?: Task[]; habits?: Habit[]; streakCoins?: number; streakFreezes?: number; rewardedTaskIds?: number[]; rewardedHabitIds?: number[]; focusSessions?: FocusSession[]; activityDates?: ActivityDate[]; activeTimeByDate?: Record<string, number> };
      const isSeededDemo = parsed.tasks?.length === 4
        && parsed.tasks.every((task) => [1, 2, 3, 4].includes(task.id))
        && parsed.habits?.length === 3
        && parsed.habits.every((habit) => [1, 2, 3].includes(habit.id))
        && parsed.streakCoins === 350
        && parsed.streakFreezes === 1;
      if (!isSeededDemo && parsed.tasks) setTasks(parsed.tasks);
      if (!isSeededDemo && parsed.habits) setHabits(parsed.habits);
      if (!isSeededDemo && typeof parsed.streakCoins === "number") setStreakCoins(parsed.streakCoins);
      if (!isSeededDemo && typeof parsed.streakFreezes === "number") setStreakFreezes(parsed.streakFreezes);
      if (parsed.rewardedTaskIds) setRewardedTaskIds(parsed.rewardedTaskIds);
      if (parsed.rewardedHabitIds) setRewardedHabitIds(parsed.rewardedHabitIds);
      if (parsed.focusSessions) setFocusSessions(parsed.focusSessions);
      if (parsed.activityDates) setActivityDates(parsed.activityDates);
      if (parsed.activeTimeByDate) {
        activeTimeRef.current = parsed.activeTimeByDate;
        setActiveTimeByDate(parsed.activeTimeByDate);
      }
    } catch { localStorage.removeItem("ascend-state"); }
  }, []);
  useEffect(() => {
    localStorage.setItem("ascend-state", JSON.stringify({ tasks, habits, streakCoins, streakFreezes, rewardedTaskIds, rewardedHabitIds, focusSessions, activityDates, activeTimeByDate }));
    if (supabase && user?.email) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) saveUserData(data.user.id, tasks, habits, { focusSessions, activityDates, activeTimeByDate, streakCoins, streakFreezes }).catch(() => undefined);
      });
    }
  }, [tasks, habits, streakCoins, streakFreezes, rewardedTaskIds, rewardedHabitIds, focusSessions, activityDates, activeTimeByDate, user]);
  useEffect(() => {
    if (focusStartedAt === null) return;
    const timer = window.setInterval(() => setFocusNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [focusStartedAt]);
  useEffect(() => {
    const today = localDateKey(new Date());
    setActiveClockSeconds(activeTimeRef.current[today] ?? 0);
    const recordActiveSecond = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastInteractionRef.current > 5 * 60 * 1000) return;
      const key = localDateKey(new Date());
      activeTimeRef.current = { ...activeTimeRef.current, [key]: (activeTimeRef.current[key] ?? 0) + 1 };
      setActiveClockSeconds(activeTimeRef.current[key]);
    };
    const markInteraction = () => { lastInteractionRef.current = Date.now(); };
    const flushActiveTime = () => setActiveTimeByDate({ ...activeTimeRef.current });
    const timer = window.setInterval(() => {
      recordActiveSecond();
      if (Object.values(activeTimeRef.current).reduce((total, seconds) => total + seconds, 0) % 15 === 0) flushActiveTime();
    }, 1000);
    window.addEventListener("pointerdown", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("scroll", markInteraction, { passive: true });
    document.addEventListener("visibilitychange", flushActiveTime);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("scroll", markInteraction);
      document.removeEventListener("visibilitychange", flushActiveTime);
      flushActiveTime();
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("ascend-workspace", workspaceName);
  }, [workspaceName]);
  useEffect(() => {
    if (profile) localStorage.setItem("ascend-profile", JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const nextUser = { name: data.session.user.user_metadata.name ?? "Ascend member", email: data.session.user.email ?? "", avatar: initials(data.session.user.user_metadata.name ?? "AM") };
        setUser(nextUser);
        const saved = await loadUserData(data.session.user.id);
        if (saved?.tasks) setTasks(saved.tasks as Task[]);
        if (saved?.habits) setHabits(saved.habits as Habit[]);
        if (saved?.focus_sessions) setFocusSessions(saved.focus_sessions as FocusSession[]);
        if (saved?.activity_dates) setActivityDates(saved.activity_dates as ActivityDate[]);
        if (saved?.active_time_by_date) {
          const activeTime = saved.active_time_by_date as Record<string, number>;
          activeTimeRef.current = activeTime;
          setActiveTimeByDate(activeTime);
        }
        if (typeof saved?.streak_coins === "number") setStreakCoins(saved.streak_coins);
        if (typeof saved?.streak_freezes === "number") setStreakFreezes(saved.streak_freezes);
      }
    });
  }, []);

  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuth={setUser} />;

  const completedTasks = tasks.filter((task) => task.completed).length;
  const xp = completedTasks * 20 + habits.filter((habit) => habit.completed).length * 15;
  const todayKey = localDateKey(new Date());
  const markActivity = () => setActivityDates((current) => current.includes(todayKey) ? current : [...current, todayKey]);
  const saveProfile = async (nextProfile: Profile) => {
    if (supabase) await supabase.auth.updateUser({ data: nextProfile });
    setProfile(nextProfile);
    const nextUser = user ? { ...user, name: nextProfile.name, avatar: initials(nextProfile.name) } : user;
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem("ascend-user", JSON.stringify(nextUser));
    }
  };
  const streakMetrics = getStreakMetrics(activityDates);
  const toggleTask = (id: number) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const completing = !task.completed;
    setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: completing } : item));
    if (completing) markActivity();
    if (completing && !rewardedTaskIds.includes(id)) {
      setRewardedTaskIds((current) => [...current, id]);
      setStreakCoins((current) => current + 10);
      setCoinNotice("+10 Ascend Coins earned for completing a task.");
    }
  };
  const toggleHabit = (id: number) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const completing = !habit.completed;
    setHabits((current) => current.map((item) => item.id === id ? { ...item, completed: completing, progress: completing ? Math.min(5, item.progress + 1) : Math.max(0, item.progress - 1) } : item));
    if (completing) markActivity();
    if (completing && !rewardedHabitIds.includes(id)) {
      setRewardedHabitIds((current) => [...current, id]);
      setStreakCoins((current) => current + 5);
      setCoinNotice("+5 Ascend Coins earned for a habit check-in.");
    }
  };
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks((current) => [...current, { id: Date.now(), title: newTaskTitle.trim(), category: "Personal", due: "Today", completed: false, priority: "Medium" }]);
    setNewTaskTitle(""); setShowAddTask(false);
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem("ascend-user"); setUser(null); };
  const setView = (view: View) => { setActiveNav(view); setMobileNav(false); };
  const buyFreeze = (cost: number, quantity: number) => {
    if (streakCoins < cost) return false;
    setStreakCoins((current) => current - cost);
    setStreakFreezes((current) => current + quantity);
    return true;
  };
  const openWorkspaceModal = () => {
    setWorkspaceDraft(workspaceName);
    setShowWorkspaceMenu(false);
    setShowWorkspaceModal(true);
  };
  const saveWorkspace = () => {
    const nextName = workspaceDraft.trim();
    if (!nextName) return;
    setWorkspaceName(nextName);
    setShowWorkspaceModal(false);
  };
  const focusElapsedMinutes = focusStartedAt === null ? 0 : (focusNow - focusStartedAt) / 60000;
  const totalFocusMinutes = focusSessions.reduce((total, session) => total + session.durationMinutes, 0) + focusElapsedMinutes;
  const totalActiveMinutes = Object.values(activeTimeByDate).reduce((total, seconds) => total + seconds, 0) / 60;
  const todayActiveSeconds = activeClockSeconds;
  const toggleFocus = () => {
    if (focusStartedAt !== null) {
      const durationMinutes = Math.max(0, (Date.now() - focusStartedAt) / 60000);
      if (durationMinutes >= 0.1) {
        setFocusSessions((current) => [...current, { id: Date.now(), startedAt: new Date(focusStartedAt).toISOString(), endedAt: new Date().toISOString(), durationMinutes }]);
        markActivity();
      }
      setFocusStartedAt(null);
      setFocusNow(Date.now());
      return;
    }
    setFocusStartedAt(Date.now());
    setFocusNow(Date.now());
  };
  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><AscendMark /><span>Ascend</span><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <div className="workspace-switcher-wrap"><button className="workspace-switcher" onClick={() => setShowWorkspaceMenu((open) => !open)} aria-expanded={showWorkspaceMenu}><div className="avatar avatar-small">{user.avatar}</div><div><strong>{workspaceName}</strong><span>{supabase ? "Cloud sync enabled" : "Personal plan"}</span></div><ChevronDown size={16} /></button>{showWorkspaceMenu && <div className="workspace-menu"><strong>Your workspaces</strong><button className="workspace-option active" onClick={() => setShowWorkspaceMenu(false)}><div className="workspace-option-icon">A</div><span>{workspaceName}<small>Current workspace</small></span><Check size={15} /></button><button className="workspace-menu-action" onClick={openWorkspaceModal}><Plus size={15} /> Create workspace</button><button className="workspace-menu-action" onClick={() => { setShowWorkspaceMenu(false); setView("Settings"); }}><Settings size={15} /> Workspace settings</button></div>}</div>
      <nav className="main-nav"><p className="nav-label">Workspace</p>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setView(label)}><Icon size={18} /><span>{label}</span>{label === "Overview" && <span className="nav-dot" />}</button>)}<p className="nav-label nav-label-spaced">Manage</p><button className={`nav-item ${activeNav === "Achievements" ? "active" : ""}`} onClick={() => setView("Achievements")}><Trophy size={18} /><span>Achievements</span></button><button className={`nav-item ${activeNav === "Settings" ? "active" : ""}`} onClick={() => setView("Settings")}><Settings size={18} /><span>Settings</span></button></nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16} /></div><strong>Unlock your potential</strong><p>Get smarter insights and unlimited goals.</p><button onClick={() => setView("Settings")}>Explore Ascend Pro <ArrowUpRight size={14} /></button></div><div className="help-row"><CircleHelp size={17} /> Help center <span>⌘ /</span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-btn search-btn" onClick={() => setShowSearch(true)} aria-label="Search"><Search size={18} /><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-btn" onClick={() => setShowNotifications((open) => !open)} aria-label="Notifications" aria-expanded={showNotifications}><Bell size={18} /><i className="notification-dot" /></button><ProfileMenu user={user} onLogout={logout} onSettings={() => setView("Settings")} /></div>{showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}</header>
      {coinNotice && <button className="coin-notice" onClick={() => setCoinNotice("")}>{coinNotice} <X size={13} /></button>}
      {activeNav === "Overview" ? <Overview user={user} dateLabel={dateLabel} tasks={tasks} habits={habits} xp={xp} totalActiveMinutes={totalActiveMinutes} todayActiveSeconds={todayActiveSeconds} activeTimeByDate={activeTimeByDate} focusRunning={focusStartedAt !== null} streak={streakMetrics.current} onToggleFocus={toggleFocus} onTask={toggleTask} onHabit={toggleHabit} onAdd={() => setShowAddTask(true)} onView={setView} onStreak={() => setShowStreakInsight(true)} onCoach={() => setShowCoach(true)} /> : <WorkspaceView view={activeNav} tasks={tasks} habits={habits} xp={xp} streakCoins={streakCoins} streakFreezes={streakFreezes} theme={theme} onTheme={setTheme} onTask={toggleTask} onHabit={toggleHabit} onAdd={() => setShowAddTask(true)} onView={setView} onBuyFreeze={buyFreeze} onAcademicProgress={markActivity} />}
      <footer className="page-footer"><span>Ascend is your space to make progress visible.</span><span>{supabase ? "Cloud sync ready" : "Guest mode · Your data is saved locally"}</span></footer>
    </main>
    {showAddTask && <div className="modal-backdrop" onClick={() => setShowAddTask(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">NEW TASK</p><h2>What will you accomplish?</h2></div><button className="icon-btn" onClick={() => setShowAddTask(false)}><X size={18} /></button></div><input autoFocus value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Finish chapter 3 notes" /><div className="modal-actions"><button className="secondary-button" onClick={() => setShowAddTask(false)}>Cancel</button><button className="primary-button" onClick={addTask}>Create task <Plus size={16} /></button></div></div></div>}
    {showSearch && <SearchOverlay tasks={tasks} onView={(view) => { setView(view); setShowSearch(false); }} onClose={() => setShowSearch(false)} />}
    {showStreakInsight && <StreakInsight metrics={streakMetrics} activityDates={activityDates} onClose={() => setShowStreakInsight(false)} />}
    {showCoach && <CoachPanel tasks={tasks} habits={habits} onClose={() => setShowCoach(false)} onTaskAction={(action) => {
      if (action.type === "add_task" && action.title) setTasks((current) => [...current, { id: Date.now(), title: action.title!, category: action.category ?? "Personal", due: action.due ?? "Today", completed: false, priority: action.priority ?? "Medium" }]);
      if (action.type === "delete_task" && action.taskId) setTasks((current) => current.filter((task) => task.id !== action.taskId));
      if (action.type === "complete_task" && action.taskId) { setTasks((current) => current.map((task) => task.id === action.taskId ? { ...task, completed: true } : task)); markActivity(); }
    }} />}
    {user && !profile?.name && <ProfileSetup initialName={profile?.name || user.name} onSave={saveProfile} />}
    {showWorkspaceModal && <div className="modal-backdrop" onClick={() => setShowWorkspaceModal(false)}><div className="modal workspace-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">WORKSPACE</p><h2>Create your focus space</h2><p className="modal-subtitle">Give this workspace a name that keeps your next step clear.</p></div><button className="icon-btn" onClick={() => setShowWorkspaceModal(false)} aria-label="Close workspace dialog"><X size={18} /></button></div><label className="workspace-name-field">Workspace name<input autoFocus value={workspaceDraft} onChange={(event) => setWorkspaceDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveWorkspace()} placeholder="e.g. Final year focus" /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowWorkspaceModal(false)}>Cancel</button><button className="primary-button" onClick={saveWorkspace} disabled={!workspaceDraft.trim()}>Save workspace <Check size={16} /></button></div></div></div>}
  </div>;
}

function AscendMark() {
  return <div className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" role="presentation"><path className="brand-path" d="M7 23.5h5v-6h5v-5h5v-4h3" /><path className="brand-arrow" d="m19 8.5 6-0.5-.5 6" /><circle className="brand-orbit" cx="16" cy="16" r="13" /></svg></div>;
}

function AuthScreen({ mode, setMode, onAuth }: { mode: "login" | "signup"; setMode: (mode: "login" | "signup") => void; onAuth: (user: User) => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordChecks = { length: password.length >= 8, upper: /[A-Z]/.test(password), lower: /[a-z]/.test(password), number: /\d/.test(password), special: /[^A-Za-z0-9]/.test(password) };
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!email || !passwordValid || (mode === "signup" && !name)) { setError(mode === "signup" ? "Add your name and meet every password requirement." : "Enter your email and a valid password."); return; }
    setLoading(true);
    if (supabase) {
      const result = mode === "signup" ? await supabase.auth.signUp({ email, password, options: { data: { name } } }) : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { setError(result.error.message); setLoading(false); return; }
      if (!result.data.session) { setError("Check your email to confirm your account, then sign in."); setLoading(false); return; }
    }
    const nextUser = { name: name || email.split("@")[0], email, avatar: initials(name || email) }; localStorage.setItem("ascend-user", JSON.stringify(nextUser)); onAuth(nextUser); setLoading(false);
  };
  const guest = () => { const nextUser = { name: "Alex Kim", email: "guest@ascend.local", avatar: "AK" }; localStorage.setItem("ascend-user", JSON.stringify(nextUser)); onAuth(nextUser); };
  const oauth = async (provider: "google" | "github") => { try { await signInWithOAuth(provider); } catch (oauthError) { setError(oauthError instanceof Error ? oauthError.message : "OAuth sign-in failed."); } };
  return <div className="auth-shell"><div className="auth-showcase"><div className="auth-brand"><AscendMark /><span>Ascend</span></div><div className="auth-pitch"><p className="eyebrow">YOUR PROGRESS, VISIBLE</p><h1>Small steps.<br /><em>Remarkable</em> momentum.</h1><p>One calm workspace to plan your goals, build better habits, and make progress you can actually see.</p><div className="auth-proof"><div className="proof-avatars"><span>AK</span><span>RM</span><span>JS</span><b>+2k</b></div><span>students building their rhythm</span></div></div><div className="auth-quote"><Sparkles size={15} /><span>&quot;Consistency is a superpower.&quot;</span></div></div><div className="auth-panel"><div className="auth-panel-inner">  <div className="auth-mobile-brand"><AscendMark /><span>Ascend</span></div><div className="auth-heading"><p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "START YOUR JOURNEY"}</p><h2>{mode === "login" ? "Sign in to Ascend" : "Create your account"}</h2><p>{mode === "login" ? "Pick up right where you left off." : "Your most consistent chapter starts here."}</p></div><form onSubmit={submit}>{mode === "signup" && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Kim" autoComplete="name" /></label>}<label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" /></label><label>Password <span className="label-hint">{mode === "login" ? "Forgot password?" : "Strong password required"}</span><input value={password} onChange={(event) => setPassword(event.target.value)} onFocus={() => setPasswordFocused(true)} type="password" placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{(mode === "signup" || passwordFocused) && <PasswordChecklist checks={passwordChecks} />}{error && <div className="form-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading || !passwordValid}>{loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"} <ArrowUpRight size={16} /></button></form><div className="auth-divider"><span>or continue with</span></div><div className="oauth-row"><button className="social-button" onClick={() => oauth("google")} disabled={loading}>Google</button><button className="social-button" onClick={() => oauth("github")} disabled={loading}>GitHub</button></div><button className="social-button guest-button" onClick={guest}><UserRound size={16} /> Continue as guest</button><p className="auth-switch">{mode === "login" ? "New to Ascend?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p><p className="auth-privacy"><ShieldCheck size={13} /> Your data stays private and secure.</p></div></div></div>;
}

function ProfileSetup({ initialName, onSave }: { initialName: string; onSave: (profile: Profile) => Promise<void> }) {
  const [name, setName] = useState(initialName);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [course, setCourse] = useState("");
  const [standard, setStandard] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const maxDob = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Your name is required.");
      return;
    }
    if (dob && (dob < "1925-01-01" || dob > maxDob)) {
      setError("Enter a valid date of birth between 1925 and today.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), dob, gender, course: course.trim(), standard: standard.trim() });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };
  return <div className="modal-backdrop profile-setup-backdrop"><div className="modal profile-setup" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">SET UP YOUR PROFILE</p><h2>Make your academic plan personal</h2><p className="modal-subtitle">Gemini uses this information to suggest a syllabus suited to your course and year.</p></div></div><form className="profile-setup-form" onSubmit={submit}><label><span className="field-label">Full name <span className="required-mark">*</span></span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="Your name" /></label><label><span className="field-label">Date of birth</span><input type="date" min="1925-01-01" max={maxDob} value={dob} onChange={(event) => setDob(event.target.value)} /></label><label><span className="field-label">Gender</span><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label><label><span className="field-label">Course</span><select value={course} onChange={(event) => setCourse(event.target.value)}><option value="">Select a course</option><option>B.Tech - CSE</option><option>B.Tech - CHE</option><option>B.Tech - CE</option><option>B.Tech - ECE</option><option>B.Tech - EE</option><option>B.Tech - ME</option><option>B.Tech - IT</option><option>B.Arch</option><option>B.Sc - Computer Science</option><option>BCA</option><option>M.Tech - CSE</option><option>MCA</option><option>MBBS</option><option>BDS</option><option>BAMS</option><option>BHMS</option><option>LLB</option><option>BBA</option><option>MBA</option><option>BA</option><option>B.Com</option><option>MA</option><option>M.Com</option><option>Class 1-5</option><option>Class 6-8</option><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option><option>Other</option></select></label><label><span className="field-label">Standard / semester</span><select value={standard} onChange={(event) => setStandard(event.target.value)}><option value="">Select standard or semester</option><option>Semester 1</option><option>Semester 2</option><option>Semester 3</option><option>Semester 4</option><option>Semester 5</option><option>Semester 6</option><option>Semester 7</option><option>Semester 8</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Class 1</option><option>Class 2</option><option>Class 3</option><option>Class 4</option><option>Class 5</option><option>Class 6</option><option>Class 7</option><option>Class 8</option><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option><option>Other</option></select></label>{error && <div className="form-error">{error}</div>}<button className="primary-button auth-submit" disabled={saving}>{saving ? "Saving profile..." : "Save and build my academic plan"} <ArrowUpRight size={16} /></button></form></div></div>;
}

function PasswordChecklist({ checks }: { checks: { length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean } }) {
  const items = [["length", "8+ characters"], ["upper", "One uppercase letter"], ["lower", "One lowercase letter"], ["number", "One number"], ["special", "One special character"]];
  return <div className="password-checklist" aria-live="polite">{items.map(([key, label]) => <span className={checks[key as keyof typeof checks] ? "valid" : ""} key={key}>{checks[key as keyof typeof checks] ? <Check size={12} /> : <span className="requirement-dot" />}{label}</span>)}</div>;
}

function Overview({ user, dateLabel, tasks, habits, xp, streak, totalActiveMinutes, todayActiveSeconds, activeTimeByDate, focusRunning, onToggleFocus, onTask, onHabit, onAdd, onView, onStreak, onCoach }: { user: User; dateLabel: string; tasks: Task[]; habits: Habit[]; xp: number; streak: number; totalActiveMinutes: number; todayActiveSeconds: number; activeTimeByDate: Record<string, number>; focusRunning: boolean; onToggleFocus: () => void; onTask: (id: number) => void; onHabit: (id: number) => void; onAdd: () => void; onView: (view: View) => void; onStreak: () => void; onCoach: () => void }) {
  const completed = tasks.filter((task) => task.completed).length; const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const focusLabel = totalActiveMinutes > 0 ? `${Math.floor(totalActiveMinutes / 60)}h ${Math.round(totalActiveMinutes % 60)}m` : "No activity logged";
  return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">{dateLabel}</p><h1>Good morning, {user.name.split(" ")[0]} <span>✦</span></h1><p className="subheading">A little progress every day adds up to remarkable results.</p></div><div className="header-buttons"><button className="secondary-button" onClick={() => onView("Planner")}><CalendarDays size={16} /> Plan your day</button><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add task</button></div></section><section className="stats-grid"><StatCard icon={<Flame size={18} />} label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} trend={streak ? "Based on completed activity" : "Complete a task or habit today"} tone="orange" onClick={() => onView("Insights")} /><StatCard icon={<Sparkles size={18} />} label="Total XP" value={xp.toLocaleString()} trend={xp ? "Earned from completed work" : "Complete work to earn XP"} tone="purple" onClick={() => onView("Insights")} /><StatCard icon={<Clock3 size={18} />} label="Active time" value={focusLabel} trend={focusRunning ? "Focus session in progress" : "Tracked while you use Ascend"} tone="blue" onClick={() => onView("Insights")} /><StatCard icon={<Target size={18} />} label="Weekly score" value={`${rate}%`} trend={rate ? "Based on task completion" : "Complete a task to build your score"} tone="green" onClick={() => onView("Insights")} /></section><section className="content-grid"><div className="left-column"><SectionHeading title="Today's focus" subtitle={`${completed} of ${tasks.length} tasks complete`} action="View planner" onClick={() => onView("Planner")} /><div className="focus-card"><div className="progress-line"><span style={{ width: `${rate}%` }} /></div><div className="focus-summary"><strong>{rate}% complete</strong><span>{tasks.length - completed} tasks remaining</span></div><div className="focus-session"><Clock3 size={15} /><span>{focusRunning ? "Focus session running" : `App active today: ${formatDuration(todayActiveSeconds)}`}</span><button className="secondary-button" onClick={onToggleFocus}>{focusRunning ? "Stop session" : "Start focus"}</button></div><div className="task-list">{tasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} onToggle={onTask} />)}</div><button className="add-task-link" onClick={onAdd}><Plus size={16} /> Add another task</button></div><SectionHeading title="Daily habits" subtitle="Small actions, compounded daily." action="Manage habits" onClick={() => onView("Habits")} /><div className="habits-grid">{habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={onHabit} />)}</div></div><RightRail xp={xp} onView={onView} onCoach={onCoach} activeTimeByDate={activeTimeByDate} /></section></div>;
}

function WorkspaceView({ view, tasks, habits, xp, streakCoins, streakFreezes, theme, onTheme, onTask, onHabit, onAdd, onView, onBuyFreeze, onAcademicProgress }: { view: Exclude<View, "Overview">; tasks: Task[]; habits: Habit[]; xp: number; streakCoins: number; streakFreezes: number; theme: Theme; onTheme: (theme: Theme) => void; onTask: (id: number) => void; onHabit: (id: number) => void; onAdd: () => void; onView: (view: View) => void; onBuyFreeze: (cost: number, quantity: number) => boolean; onAcademicProgress: () => void }) {
  const [taskFilter, setTaskFilter] = useState<"Today" | "Upcoming" | "Completed">("Today");
  const configs: Record<Exclude<View, "Overview">, { title: string; subtitle: string }> = { Planner: { title: "Plan your progress", subtitle: "Turn intention into a focused, achievable day." }, Habits: { title: "Build your rhythm", subtitle: "Small actions, repeated consistently, compound into change." }, Marketplace: { title: "Streak freeze marketplace", subtitle: "Protect your consistency when life gets busy." }, Academics: { title: "Academic command center", subtitle: "Keep subjects, deadlines, and study sessions in one place." }, Coding: { title: "Level up your craft", subtitle: "Practice deliberately and turn your coding goals into momentum." }, Insights: { title: "Your progress, decoded", subtitle: "Patterns and signals to help you work with more intention." }, Achievements: { title: "Your achievements", subtitle: "Every milestone is proof that your consistency is working." }, Settings: { title: "Workspace settings", subtitle: "Make Ascend work better for you." } };
  const config = configs[view];
  const visibleTasks = taskFilter === "Completed" ? tasks.filter((task) => task.completed) : taskFilter === "Upcoming" ? tasks.filter((task) => !task.completed && task.due !== "Today") : tasks.filter((task) => task.due.startsWith("Today") && !task.completed);
  return <div className="page-wrap"><section className="workspace-heading"><div><p className="eyebrow">ASCEND WORKSPACE</p><h1>{config.title}</h1><p className="subheading">{config.subtitle}</p></div><div className="header-buttons">{view === "Planner" && <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add task</button>}</div></section>{view === "Planner" && <div className="workspace-panel"><SectionHeading title="All tasks" subtitle={`${tasks.filter((task) => !task.completed).length} still in motion`} /><div className="planner-toolbar">{(["Today", "Upcoming", "Completed"] as const).map((filter) => <button key={filter} className={`filter-chip ${taskFilter === filter ? "active" : ""}`} onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div>{visibleTasks.length > 0 ? visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onTask} />) : <div className="empty-state">No {taskFilter.toLowerCase()} tasks yet.</div>}</div>}{view === "Habits" && <div className="detail-grid">{habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={onHabit} />)}<div className="add-placeholder" onClick={() => onView("Settings")}><Plus size={20} /><strong>Create a new habit</strong><span>Open settings to configure your routine.</span></div></div>}{view === "Marketplace" && <MarketplaceView coins={streakCoins} freezes={streakFreezes} onBuy={onBuyFreeze} />}{view === "Academics" && <AcademicView onProgress={onAcademicProgress} />}{view === "Coding" && <CodingView />}{view === "Insights" && <InsightsView tasks={tasks} xp={xp} />}{view === "Achievements" && <AchievementsView xp={xp} onView={onView} />}{view === "Settings" && <SettingsView theme={theme} onTheme={onTheme} />}</div>;
}

function RightRail({ xp, onView, onCoach, activeTimeByDate }: { xp: number; onView: (view: View) => void; onCoach: () => void; activeTimeByDate: Record<string, number> }) { const [showCoachMenu, setShowCoachMenu] = useState(false); const level = Math.floor(xp / 500) + 1; const nextLevelXp = level * 500; const xpToNext = nextLevelXp - xp; return <div className="right-column"><section className="level-card"><div className="level-top"><div><p className="card-overline">YOUR PROGRESS</p><h2>Level {String(level).padStart(2, "0")} <span>✦</span></h2></div><div className="level-badge">{String(level).padStart(2, "0")}</div></div><div className="level-progress"><div className="level-progress-label"><span><strong>{xp.toLocaleString()} XP</strong> <em>/ {nextLevelXp.toLocaleString()} XP</em></span><strong>Explorer</strong></div><div className="progress-line light"><span style={{ width: `${Math.min(100, (xp % 500) / 5)}%` }} /></div></div><div className="level-footer"><span><Trophy size={14} /> {xpToNext} XP to next level</span><button onClick={() => onView("Achievements")}>View rewards <ArrowUpRight size={14} /></button></div></section><section className="ai-card"><div className="ai-card-top"><button className="ai-spark" onClick={onCoach} aria-label="Open AI Coach"><BrainCircuit size={19} /></button><span className="live-pill">AI COACH <i /></span><div className="ai-menu-wrap"><button className="ai-more" onClick={() => setShowCoachMenu((open) => !open)} aria-label="AI Coach options"><MoreHorizontal size={18} /></button>{showCoachMenu && <div className="ai-menu"><button onClick={() => { setShowCoachMenu(false); onCoach(); }}>Review my rhythm</button><button onClick={() => setShowCoachMenu(false)}>Dismiss suggestion</button></div>}</div></div><h2>You&apos;re building a<br /><em>strong rhythm.</em></h2><p>AI Coach spots patterns in your tasks and habits, then suggests one practical next step.</p><button className="ai-action" onClick={onCoach}>Open AI Coach <ArrowUpRight size={14} /></button></section><ActivityCard onView={onView} activeTimeByDate={activeTimeByDate} /><section className="quote-card"><span className="quote-mark">“</span><p>Success is the sum of small efforts, repeated day in and day out.</p><small>— Robert Collier</small></section></div>; }

function ActivityCard({ onView, activeTimeByDate }: { onView: (view: View) => void; activeTimeByDate: Record<string, number> }) {
  const [range, setRange] = useState<"This week" | "Last week" | "This month">("This week");
  const [selectedDay, setSelectedDay] = useState(3);
  const isMonthly = range === "This month";
  const minutesByDate = useMemo(() => new Map(Object.entries(activeTimeByDate).map(([date, seconds]) => [date, seconds / 60])), [activeTimeByDate]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthWeekCount = Math.ceil((monthStart.getDay() + new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) / 7);
  const labels = isMonthly ? Array.from({ length: monthWeekCount }, (_, index) => `Week ${index + 1}`) : ["M", "T", "W", "T", "F", "S", "S"];
  const dates = isMonthly ? [] : Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    const mondayOffset = (now.getDay() + 6) % 7;
    date.setDate(now.getDate() - mondayOffset + index + (range === "Last week" ? -7 : 0));
    return date;
  });
  const hours = isMonthly
    ? labels.map((_, index) => Array.from(minutesByDate.entries()).filter(([date]) => {
      const dayOfMonth = Number(date.slice(8, 10));
      const weekIndex = Math.floor((monthStart.getDay() + dayOfMonth - 1) / 7);
      return weekIndex === index;
    }).reduce((total, [, minutes]) => total + minutes, 0) / 60)
    : dates.map((date) => (minutesByDate.get(localDateKey(date)) ?? 0) / 60);
  const loggedMinutes = hours.reduce((total, value) => total + value * 60, 0);
  const values = hours.map((value) => value > 0 ? Math.min(100, (value / 7) * 100) : 0);
  const ariaLabels = isMonthly ? labels : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const formatHours = (value: number) => `${Math.floor(value)}h ${Math.round((value % 1) * 60)}m`;
  return <section className="week-card activity-card" role="button" tabIndex={0} onClick={() => onView("Insights")} onKeyDown={(event) => event.key === "Enter" && onView("Insights")}><div className="week-heading"><div><p className="card-overline">{range.toUpperCase()}</p><h2>Activity overview</h2></div><select className="small-select" value={range} onChange={(event) => { event.stopPropagation(); setRange(event.target.value as typeof range); setSelectedDay(0); }} onClick={(event) => event.stopPropagation()} aria-label="Activity range"><option>This week</option><option>Last week</option><option>This month</option></select></div><div className="chart"><div className="chart-y"><span>7h</span><span>4h</span><span>0h</span></div><div className="chart-area"><div className="chart-grid"><i /><i /><i /></div><div key={range} className={`bars ${isMonthly ? "monthly-bars" : ""}`}>{values.map((height, index) => <button className={`bar-group ${index === selectedDay ? "today" : ""}`} key={`${range}-${index}`} onClick={(event) => { event.stopPropagation(); setSelectedDay(index); }} title={`${ariaLabels[index]}: ${hours[index] ? formatHours(hours[index]) + " active" : "No active time logged"}`} aria-label={`${ariaLabels[index]}: ${hours[index] ? formatHours(hours[index]) + " active" : "No active time logged"}`}><span className="bar" style={{ height: `${height}%` }} /><span>{labels[index]}</span></button>)}</div></div></div><div className="chart-legend"><span><i className="legend-dot purple-dot" /> Active time in Ascend</span><button onClick={(event) => { event.stopPropagation(); onView("Insights"); }}>{loggedMinutes ? `${formatHours(loggedMinutes / labels.length)} avg / period` : "No active time logged"}</button></div></section>;
}
function AcademicView({ onProgress }: { onProgress: () => void }) {
  const [subjects, setSubjects] = useState<AcademicSubject[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ascend-subjects") || "[]") as Partial<AcademicSubject>[];
      return saved.map((subject) => ({ id: subject.id ?? Date.now(), name: subject.name ?? "Untitled subject", code: subject.code ?? "", topics: subject.topics ?? [] }));
    } catch {
      return [];
    }
  });
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(() => JSON.parse(localStorage.getItem("ascend-assignments") || "[]") as AcademicAssignment[]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectSyllabus, setSubjectSyllabus] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentSubject, setAssignmentSubject] = useState("");
  const [assignmentDue, setAssignmentDue] = useState("");
  const [assignmentPriority, setAssignmentPriority] = useState<AcademicAssignment["priority"]>("Medium");
  const [aiNotice, setAiNotice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => { localStorage.setItem("ascend-subjects", JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem("ascend-assignments", JSON.stringify(assignments)); }, [assignments]);
  const addSubject = () => {
    if (!subjectName.trim()) return;
    const topics = subjectSyllabus.split(/\r?\n|,/).map((topic) => topic.trim()).filter(Boolean).map((title, index) => ({ id: Date.now() + index, title, covered: false }));
    setSubjects((current) => [...current, { id: Date.now(), name: subjectName.trim(), code: subjectCode.trim() || subjectName.trim().slice(0, 3).toUpperCase(), topics }]);
    setSubjectName("");
    setSubjectCode("");
    setSubjectSyllabus("");
  };
  const toggleTopic = (subjectId: number, topicId: number) => {
    setSubjects((current) => current.map((subject) => subject.id === subjectId ? { ...subject, topics: subject.topics.map((topic) => {
      if (topic.id !== topicId) return topic;
      if (!topic.covered) onProgress();
      return { ...topic, covered: !topic.covered };
    }) } : subject));
  };
  const addTopic = (subjectId: number, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setSubjects((current) => current.map((subject) => subject.id === subjectId ? { ...subject, topics: [...subject.topics, { id: Date.now(), title: cleanTitle, covered: false }] } : subject));
  };
  const addAssignment = () => {
    if (!assignmentTitle.trim() || !assignmentSubject) return;
    setAssignments((current) => [...current, { id: Date.now(), title: assignmentTitle.trim(), subject: assignmentSubject, due: assignmentDue || "No date", priority: assignmentPriority }]);
    setAssignmentTitle("");
    setAssignmentDue("");
  };
  const draftWithCoach = () => {
    if (!subjects.length) {
      setAiNotice("Add at least one subject so AI Coach can draft a study plan.");
      return;
    }
    const newAssignments = subjects.filter((subject) => !assignments.some((assignment) => assignment.subject === subject.name && assignment.title.startsWith("Review"))).map((subject) => ({ id: Date.now() + subject.id, title: `Review ${subject.name} core concepts`, subject: subject.name, due: "This week", priority: "Medium" as const }));
    setAssignments((current) => [...current, ...newAssignments]);
    setAiNotice(newAssignments.length ? `AI Coach drafted ${newAssignments.length} review block${newAssignments.length === 1 ? "" : "s"}.` : "Your review blocks are already drafted.");
  };
  const generateSyllabus = async () => {
    const savedProfile = localStorage.getItem("ascend-profile");
    if (!savedProfile) {
      setAiNotice("Complete your profile first so Gemini can tailor your syllabus.");
      return;
    }
    setAiLoading(true);
    setAiNotice("");
    try {
      const result = await requestAiCoach("explainer", "Create a syllabus for this student's course and standard. Return proposed subject actions with concise, human-sized topics. Do not invent a school or board.", { profile: JSON.parse(savedProfile) });
      const subjectActions = result.actions.filter((action) => action.type === "create_subject" && action.subjectName && action.topics?.length);
      if (!subjectActions.length) throw new Error("Gemini did not return syllabus subjects. Try again with a more specific course.");
      setSubjects((current) => [...current, ...subjectActions.map((action, index) => ({ id: Date.now() + index, name: action.subjectName!, code: action.code || action.subjectName!.slice(0, 3).toUpperCase(), topics: action.topics!.map((title, topicIndex) => ({ id: Date.now() + index * 100 + topicIndex, title, covered: false })) }))]);
      setAiNotice(`Gemini proposed ${subjectActions.length} syllabus subject${subjectActions.length === 1 ? "" : "s"}. Review the topics before starting.`);
    } catch (requestError) {
      setAiNotice(requestError instanceof Error ? requestError.message : "Gemini could not create the syllabus.");
    } finally {
      setAiLoading(false);
    }
  };
  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
  const coveredTopics = subjects.reduce((total, subject) => total + subject.topics.filter((topic) => topic.covered).length, 0);
  const overallProgress = totalTopics ? Math.round(coveredTopics / totalTopics * 100) : 0;
  return <div className="academic-grid"><div className="workspace-panel"><div className="academic-heading"><div><SectionHeading title="Your subjects" subtitle={`${subjects.length} subject${subjects.length === 1 ? "" : "s"} · ${overallProgress}% syllabus covered`} /></div><button className="secondary-button" onClick={generateSyllabus} disabled={aiLoading}><BrainCircuit size={15} /> {aiLoading ? "Generating..." : "Generate with Gemini"}</button></div><div className="academic-form academic-subject-form"><input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Subject name" /><input value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} placeholder="Code (optional)" /><textarea value={subjectSyllabus} onChange={(event) => setSubjectSyllabus(event.target.value)} placeholder="Syllabus topics, one per line or comma-separated" rows={3} /><button className="primary-button" onClick={addSubject}><Plus size={15} /> Add subject</button></div>{subjects.length ? subjects.map((subject) => { const covered = subject.topics.filter((topic) => topic.covered).length; const progress = subject.topics.length ? Math.round(covered / subject.topics.length * 100) : 0; return <div className="subject-card" key={subject.id}><div className="subject-row"><span className="subject-icon purple">{subject.code}</span><div><strong>{subject.name}</strong><small>{covered}/{subject.topics.length} topics covered</small></div><b>{progress}%</b></div><div className="progress-line academic-progress"><span style={{ width: `${progress}%` }} /></div>{subject.topics.length ? <div className="topic-list">{subject.topics.map((topic) => <label className="topic-item" key={topic.id}><input type="checkbox" checked={topic.covered} onChange={() => toggleTopic(subject.id, topic.id)} /><span className={topic.covered ? "covered" : ""}>{topic.title}</span></label>)}</div> : <p className="academic-muted">No syllabus topics yet. Add one below to begin at 0%.</p>}<TopicInput onAdd={(title) => addTopic(subject.id, title)} /></div>; }) : <div className="empty-state">No subjects yet. Add your first subject and syllabus above.</div>}</div><div className="workspace-panel deadline-panel"><div className="academic-heading"><div><p className="card-overline">UP NEXT</p><h2>Assignment deadlines</h2></div><button className="secondary-button" onClick={draftWithCoach}><BrainCircuit size={15} /> Draft with AI Coach</button></div><div className="academic-form"><input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Assignment or study goal" /><select value={assignmentSubject} onChange={(event) => setAssignmentSubject(event.target.value)} aria-label="Assignment subject"><option value="">Choose subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}</select><input value={assignmentDue} onChange={(event) => setAssignmentDue(event.target.value)} placeholder="Due date or timeframe" /><select value={assignmentPriority} onChange={(event) => setAssignmentPriority(event.target.value as AcademicAssignment["priority"])} aria-label="Assignment priority"><option>High</option><option>Medium</option><option>Low</option></select><button className="primary-button" onClick={addAssignment}><Plus size={15} /> Add</button></div>{aiNotice && <p className="academic-notice">{aiNotice}</p>}{assignments.length ? assignments.map((assignment) => <div className="deadline" key={assignment.id}><CalendarDays size={17} /><div><strong>{assignment.title}</strong><span>{assignment.subject} · {assignment.due}</span></div><b>{assignment.priority}</b></div>) : <div className="empty-state">Add an assignment or let AI Coach draft review blocks from your subjects.</div>}</div></div>;
}
function TopicInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return <div className="topic-add"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add syllabus topic" onKeyDown={(event) => { if (event.key === "Enter") { onAdd(title); setTitle(""); } }} /><button className="secondary-button" onClick={() => { onAdd(title); setTitle(""); }}><Plus size={13} /> Topic</button></div>;
}
function CodingView() { const [done, setDone] = useState(false); return <div className="coding-grid"><div className="challenge-card"><div className="challenge-kicker"><span className="ai-spark"><Code2 size={17} /></span><span>DAILY CHALLENGE</span><b>+40 XP</b></div><h2>Longest consecutive sequence</h2><p>Given an unsorted array of integers, find the length of the longest consecutive elements sequence.</p><div className="challenge-tags"><span>Medium</span><span>Arrays</span><span>15 min</span></div><button className={`primary-button ${done ? "done-button" : ""}`} onClick={() => setDone(true)}>{done ? <><Check size={16} /> Challenge completed</> : <>Start challenge <ArrowUpRight size={15} /></>}</button></div><div className="workspace-panel skill-panel"><SectionHeading title="Skill map" subtitle="Your current coding focus" /><div className="skill"><span>Data structures</span><div><i style={{ width: "78%" }} /></div><b>78%</b></div><div className="skill"><span>Algorithms</span><div><i style={{ width: "64%" }} /></div><b>64%</b></div><div className="skill"><span>System design</span><div><i style={{ width: "36%" }} /></div><b>36%</b></div></div></div>; }
function InsightsView({ tasks, xp }: { tasks: Task[]; xp: number }) { const completion = tasks.length ? Math.round(tasks.filter((task) => task.completed).length / tasks.length * 100) : 0; return <div className="insight-grid"><div className="insight-hero"><div><p className="card-overline">WEEKLY PRODUCTIVITY SCORE</p><strong>{completion}<span>/100</span></strong><p>{completion ? "Based on your completed work this week." : "Complete a task to start building your score."}</p></div><div className="score-ring"><span>{completion}%</span></div></div><div className="workspace-panel metric-panel"><SectionHeading title="Signals this week" subtitle="Based on your activity" /><div className="metric-row"><span>Task completion</span><b>{completion}%</b><i className="positive">{completion ? "Building" : "No activity"}</i></div><div className="metric-row"><span>XP earned</span><b>{xp} XP</b><i className="positive">{xp ? "Earned" : "No activity"}</i></div><div className="metric-row"><span>Best focus window</span><b>{xp ? "Tracking" : "Not enough data"}</b><i>{xp ? "In progress" : "Start a session"}</i></div></div><div className="workspace-panel insight-tip"><BrainCircuit size={20} /><div><strong>One useful adjustment</strong><p>{completion ? "Keep building consistency by completing one focused task at a time." : "Start with one small task or focus session to create your first progress signal."}</p></div></div></div>; }
function MarketplaceView({ coins, freezes, onBuy }: { coins: number; freezes: number; onBuy: (cost: number, quantity: number) => boolean }) {
  const [notice, setNotice] = useState("");
  const purchase = (cost: number, quantity: number, label: string) => {
    const success = onBuy(cost, quantity);
    setNotice(success ? `${label} added to your inventory.` : "You need more Ascend Coins for this bundle.");
  };
  return <div className="marketplace"><div className="market-balance"><div><p className="card-overline">YOUR WALLET</p><h2><span className="coin-symbol">✦</span> {coins.toLocaleString()} Ascend Coins</h2><p>Earn coins by completing meaningful work and maintaining your rhythm.</p></div><div className="freeze-inventory"><Flame size={18} /><div><strong>{freezes}</strong><span>streak freezes owned</span></div></div></div><div className="coin-earn-panel"><div className="coin-earn-icon">✦</div><div><strong>How to earn Ascend Coins</strong><p>Complete each task once to earn <b>+10</b> coins, or check in a habit for <b>+5</b>. Rewards are granted once per task or habit and cannot be farmed by toggling.</p></div></div><div className="marketplace-heading"><div><h2>Streak protection</h2><p>Use a freeze when you need a day off without losing your streak.</p></div>{notice && <span className="purchase-notice"><Check size={14} /> {notice}</span>}</div><div className="market-items"><MarketItem icon="◒" title="Single freeze" description="Protect your streak for one missed day." quantity="1 freeze" cost={100} onBuy={() => purchase(100, 1, "Single freeze")} /><MarketItem icon="🔥" title="Streak shield" description="A better value for your next busy week." quantity="3 freezes" cost={250} featured onBuy={() => purchase(250, 3, "Streak shield")} /><MarketItem icon="✦" title="Legendary shield" description="Stay covered through a full week away." quantity="7 freezes" cost={500} onBuy={() => purchase(500, 7, "Legendary shield")} /></div><div className="market-rules"><ShieldCheck size={18} /><div><strong>Fair play, by design</strong><p>Freezes protect an existing streak; they do not create one. One freeze is consumed automatically when a productive day is missed.</p></div></div></div>;
}
function MarketItem({ icon, title, description, quantity, cost, featured, onBuy }: { icon: string; title: string; description: string; quantity: string; cost: number; featured?: boolean; onBuy: () => void }) {
  return <div className={`market-item ${featured ? "featured" : ""}`}>{featured && <span className="best-value">BEST VALUE</span>}<div className="market-item-icon">{icon}</div><h3>{title}</h3><p>{description}</p><div className="market-item-footer"><span>{quantity}</span><button className="primary-button" onClick={onBuy}><span className="coin-symbol">✦</span>{cost}</button></div></div>;
}
function AchievementsView({ xp, onView }: { xp: number; onView: (view: View) => void }) { return <div className="achievement-grid"><div className="achievement-hero"><Trophy size={33} /><p className="card-overline">CURRENT LEVEL</p><h2>Explorer</h2><span>{xp.toLocaleString()} XP earned</span></div>{[["First ascent", "Complete your first task", true, "✦"], ["Seven-day rhythm", "Maintain a 7 day streak", true, "🔥"], ["Deep focus", "Log 20 hours of focus", false, "◒"], ["Habit builder", "Complete 50 habit check-ins", false, "◎"]].map(([title, desc, unlocked, icon]) => <div className={`achievement ${unlocked ? "unlocked" : ""}`} key={String(title)}><div className="achievement-icon">{icon}</div><div><strong>{title}</strong><p>{desc}</p></div>{unlocked ? <Check size={17} /> : <span className="locked">Locked</span>}</div>)}<button className="secondary-button" onClick={() => onView("Overview")}>Back to overview <ArrowUpRight size={15} /></button></div>; }
function SettingsView({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) { return <div className="settings-grid"><div className="workspace-panel settings-card"><SectionHeading title="Profile" subtitle="How you appear in Ascend" /><div className="settings-profile"><div className="avatar avatar-large">AK</div><div><strong>Alex Kim</strong><span>alex@example.com</span></div><button className="secondary-button"><Pencil size={14} /> Edit</button></div></div><div className="workspace-panel settings-card"><SectionHeading title="Preferences" subtitle="Tune your workspace" /><div className="theme-setting"><div><strong>Theme</strong><small>System is recommended and follows your device preference.</small></div><div className="theme-options">{(["system", "light", "dark"] as Theme[]).map((option) => <button key={option} className={theme === option ? "selected" : ""} onClick={() => onTheme(option)}>{option === "system" ? "System" : option === "light" ? "Light" : "Dark"}</button>)}</div></div><label className="setting-toggle"><span><strong>Daily reminders</strong><small>Get a gentle nudge for your planned work.</small></span><input type="checkbox" defaultChecked /></label><label className="setting-toggle"><span><strong>Weekly reflection</strong><small>Receive your progress summary every Sunday.</small></span><input type="checkbox" defaultChecked /></label><label className="setting-toggle"><span><strong>AI Coach suggestions</strong><small>Use your activity to personalize recommendations.</small></span><input type="checkbox" defaultChecked /></label></div><div className="workspace-panel settings-card"><SectionHeading title="Data & privacy" subtitle="You are in control." /><div className="privacy-row"><ShieldCheck size={18} /><span>Your data is stored locally in guest mode and never shared.</span><button className="text-button">Learn more <ArrowUpRight size={13} /></button></div></div></div>; }

function SearchOverlay({ tasks, onView, onClose }: { tasks: Task[]; onView: (view: View) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const matchingTasks = normalized ? tasks.filter((task) => `${task.title} ${task.category} ${task.due}`.toLowerCase().includes(normalized)) : tasks.slice(0, 3);
  const matchingViews = navItems.filter((item) => item.label.toLowerCase().includes(normalized));
  return <div className="search-backdrop" onClick={onClose} onKeyDown={(event) => event.key === "Escape" && onClose()}><div className="search-panel" onClick={(event) => event.stopPropagation()}><div className="search-input-wrap"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && onClose()} placeholder="Search tasks, habits, or workspace pages..." /><kbd>ESC</kbd><button onClick={onClose} aria-label="Close search"><X size={17} /></button></div><div className="search-results">{matchingViews.length > 0 && <div className="search-group"><p>WORKSPACE</p>{matchingViews.map(({ label, icon: Icon }) => <button key={label} onClick={() => onView(label)}><Icon size={16} /><span>{label}</span><ArrowUpRight size={14} /></button>)}</div>}{matchingTasks.length > 0 && <div className="search-group"><p>TASKS</p>{matchingTasks.map((task) => <button key={task.id} onClick={() => onView("Planner")}><span className={`category-dot ${task.category.toLowerCase()}`} /><div><strong>{task.title}</strong><small>{task.category} · {task.due}</small></div><ArrowUpRight size={14} /></button>)}</div>}{matchingViews.length === 0 && matchingTasks.length === 0 && <div className="search-empty"><Search size={22} /><strong>No results found</strong><span>Try a task name, category, or page.</span></div>}</div><div className="search-footer">Search across your Ascend workspace <span>Press <kbd>ESC</kbd> to close</span></div></div></div>;
}

function getStreakMetrics(activityDates: string[]) {
  const dates = new Set(activityDates);
  const today = new Date();
  const todayKey = localDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const anchor = dates.has(todayKey) ? today : dates.has(localDateKey(yesterday)) ? yesterday : null;
  let current = 0;
  if (anchor) {
    for (let offset = 0; offset < 366; offset += 1) {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() - offset);
      if (!dates.has(localDateKey(date))) break;
      current += 1;
    }
  }
  let longest = 0;
  const sorted = [...dates].sort();
  let run = 0;
  sorted.forEach((date, index) => {
    const previous = index > 0 ? parseDateKey(sorted[index - 1]) : null;
    const currentDate = parseDateKey(date);
    run = previous && (currentDate.getTime() - previous.getTime()) === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  const monthPrefix = localDateKey(today).slice(0, 7);
  return { current, longest, activeThisMonth: [...dates].filter((date) => date.startsWith(monthPrefix)).length };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function StreakInsight({ metrics, activityDates, onClose }: { metrics: ReturnType<typeof getStreakMetrics>; activityDates: string[]; onClose: () => void }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(today);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  return <div className="modal-backdrop" onClick={onClose}><div className="streak-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">STREAK INSIGHT</p><h2>Your consistency calendar</h2><p className="modal-subtitle">You&apos;ve continued your streak for <strong>{metrics.current} consecutive days</strong>.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close streak insight"><X size={18} /></button></div><div className="streak-summary"><div><Flame size={18} /><strong>{metrics.current} days</strong><span>Current streak</span></div><div><Trophy size={18} /><strong>{metrics.longest} days</strong><span>Longest streak</span></div><div><Check size={18} /><strong>{metrics.activeThisMonth} days</strong><span>Active this month</span></div></div><div className="calendar-card"><div className="calendar-heading"><h3>{monthName}</h3><span><i className="calendar-dot active" /> Active <i className="calendar-dot missed" /> No activity</span></div><div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((day, index) => { const key = day ? localDateKey(new Date(year, month, day)) : ""; return <div key={index} className={`calendar-day ${day && activityDates.includes(key) ? "active" : ""} ${day === today.getDate() ? "today" : ""}`}>{day && <span>{day}</span>}</div>; })}</div></div><p className="streak-note"><Sparkles size={14} /> Complete a task or habit today to keep your activity streak going.</p></div></div>;
}
function NotificationPanel({ onClose }: { onClose: () => void }) { return <div className="notification-panel"><div className="notification-heading"><strong>Notifications</strong><button onClick={onClose} aria-label="Close notifications"><X size={15} /></button></div><div className="notification-item"><Sparkles size={15} /><span><strong>AI Coach has a suggestion</strong><small>Review your focus rhythm for today.</small></span></div><div className="notification-item"><Flame size={15} /><span><strong>Your 12-day streak is active</strong><small>Complete one task to keep it going.</small></span></div><div className="notification-item"><CalendarDays size={15} /><span><strong>OS scheduling report is due soon</strong><small>Your deadline is in 2 days.</small></span></div><button className="notification-clear" onClick={onClose}>Mark all as read</button></div>; }
function CoachPanel({ tasks, habits, onClose, onTaskAction }: { tasks: Task[]; habits: Habit[]; onClose: () => void; onTaskAction: (action: AiAction) => void }) {
  const openTasks = tasks.filter((task) => !task.completed).length;
  const activeHabits = habits.filter((habit) => habit.completed).length;
  const recommendation = openTasks > 2 ? "Choose one priority task and protect a 25-minute focus block for it." : activeHabits === 0 ? "Start with one small habit check-in before your first task." : "Your rhythm is steady. Add a short reflection after your next focus block.";
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [actions, setActions] = useState<AiAction[]>([]);
  const askGemini = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await requestAiCoach("coach", prompt.trim(), { openTasks, activeHabits, tasks, habits });
      setResponse(result.content);
      setActions(result.actions);
      setPrompt("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gemini Coach could not respond.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal coach-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">GEMINI AI COACH</p><h2>Your next best step</h2><p className="modal-subtitle">Ask Gemini to review, add, complete, or delete tasks. Proposed changes always require your confirmation.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close AI Coach"><X size={18} /></button></div><div className="coach-recommendation"><div className="ai-spark"><BrainCircuit size={20} /></div><div><strong>{response || recommendation}</strong><p>{response ? "Generated by Gemini" : `${openTasks} open tasks · ${activeHabits} habits checked in`}</p></div></div>{actions.length > 0 && <div className="coach-proposals">{actions.map((action, index) => <div className="coach-proposal" key={`${action.type}-${action.taskId ?? action.title}-${index}`}><span>{action.type === "add_task" ? "Add task" : action.type === "delete_task" ? "Delete task" : "Complete task"}</span><strong>{action.title || tasks.find((task) => task.id === action.taskId)?.title || `Task ${action.taskId ?? ""}`}</strong><small>{action.reason || "Review this proposed change before applying it."}</small><button className="secondary-button" onClick={() => { onTaskAction(action); setActions((current) => current.filter((_, actionIndex) => actionIndex !== index)); }}>Confirm</button></div>)}</div>}{error && <div className="form-error">{error}</div>}<textarea className="coach-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask Gemini anything about your tasks, e.g. “Add a realistic 30-minute math task”" rows={3} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) askGemini(); }} /><div className="coach-actions"><button className="secondary-button" onClick={() => onTaskAction({ type: "add_task", title: "25-minute focused work block", category: "Personal", due: "Today", priority: "Medium" })}><Plus size={15} /> Add focus block</button><button className="primary-button" onClick={askGemini} disabled={loading || !prompt.trim()}><BrainCircuit size={15} /> {loading ? "Asking Gemini..." : "Ask Gemini"}</button><button className="secondary-button" onClick={onClose}>Close</button></div></div></div>;
}
function ProfileMenu({ user, onLogout, onSettings }: { user: User; onLogout: () => void; onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const closeAnd = (action: () => void) => {
    setOpen(false);
    action();
  };
  return <div className="profile-wrap"><button className="profile-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open profile menu"><div className="avatar">{user.avatar}</div><ChevronDown size={14} /></button>{open && <div className="profile-menu" role="menu"><strong>{user.name}</strong><span>{user.email}</span><button role="menuitem" onClick={() => closeAnd(onSettings)}><Settings size={13} /> Settings</button><button role="menuitem" onClick={() => closeAnd(onLogout)}><LogOut size={13} /> Sign out</button></div>}</div>;
}
function SectionHeading({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onClick}>{action} <ArrowUpRight size={14} /></button>}</div>; }
function StatCard({ icon, label, value, trend, tone, onClick }: { icon: ReactNode; label: string; value: string; trend: string; tone: string; onClick?: () => void }) { return <div className={`stat-card ${onClick ? "clickable-stat" : ""}`} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={(event) => onClick && event.key === "Enter" && onClick()}><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><p>{label}</p><strong>{value}</strong><span className={tone === "orange" ? "neutral-trend" : ""}>{trend}</span></div></div>; }
function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: number) => void }) { const [open, setOpen] = useState(false); return <div className={`task-row ${task.completed ? "task-done" : ""}`}><button className={`check-box ${task.completed ? "checked" : ""}`} onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}>{task.completed && <Check size={14} />}</button><div className="task-info"><strong>{task.title}</strong><span><i className={`category-dot ${task.category.toLowerCase()}`} />{task.category}<b>·</b>{task.due}</span></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><div className="task-more-wrap"><button className="more-button" onClick={() => setOpen((value) => !value)} aria-label={`Options for ${task.title}`}><MoreHorizontal size={17} /></button>{open && <div className="task-menu"><button onClick={() => { onToggle(task.id); setOpen(false); }}>{task.completed ? "Mark incomplete" : "Mark complete"}</button><button onClick={() => setOpen(false)}>Keep in focus</button></div>}</div></div>; }
function HabitCard({ habit, onToggle }: { habit: Habit; onToggle: (id: number) => void }) { return <div className="habit-card"><div className="habit-top"><div className={`habit-icon ${habit.color}`}>{habit.icon}</div><button className={`habit-check ${habit.completed ? "checked" : ""}`} onClick={() => onToggle(habit.id)}>{habit.completed ? <Check size={14} /> : ""}</button></div><strong>{habit.label}</strong><div className="habit-progress"><span style={{ width: `${(habit.progress / 5) * 100}%` }} /></div><div className="habit-bottom"><span>{habit.progress}/5 days</span><small>{habit.target}</small></div></div>; }
function initials(value: string) { return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
export default App;
