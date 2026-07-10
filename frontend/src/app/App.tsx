import { useState, useRef, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Mic, Send, Plus, Settings, LogOut, Menu, X,
  LayoutDashboard, Wallet, MessageCircle, Clock,
  TrendingUp, TrendingDown, DollarSign, ChevronDown,
  ArrowRight, Sparkles, Target, ChevronRight, AlertCircle,
  Bot, User, Star, Award, CheckCircle, XCircle,
} from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  navy:    "#22577A",
  teal:    "#38A3A5",
  emerald: "#57CC99",
  mint:    "#80ED99",
  foam:    "#C7F9CC",
  bg:      "#F0FDF8",
  dark:    "#0D2B3A",
};

// ─── Sound effects ────────────────────────────────────────────────────────────
function playSound(type: "click" | "confirm" | "pop" = "click") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
    if (type === "confirm") {
      osc.frequency.setValueAtTime(460, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.14);
      g.gain.setValueAtTime(0.16, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else if (type === "pop") {
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.09);
      g.gain.setValueAtTime(0.12, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.14);
    } else {
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.07);
      g.gain.setValueAtTime(0.09, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch (_) {}
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { sound?: "click"|"confirm"|"pop" }
function Btn({ sound = "click", onClick, children, className = "", ...rest }: BtnProps) {
  return (
    <button className={`transition-all active:scale-[0.97] ${className}`}
      onClick={(e) => { playSound(sound); onClick?.(e); }} {...rest}>{children}</button>
  );
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
interface StoredUser { username: string; email: string; password: string; bd: string }
const LS = {
  users:        (): StoredUser[] => JSON.parse(localStorage.getItem("ez_users") || "[]"),
  saveUser:     (u: StoredUser) => { const all = LS.users(); localStorage.setItem("ez_users", JSON.stringify([...all, u])); },
  findUser:     (username: string, password: string) => LS.users().find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) || null,
  userExists:   (username: string) => LS.users().some(u => u.username.toLowerCase() === username.toLowerCase()),
  saveBudget:   (u: string, d: BudgetData)          => localStorage.setItem(`ez_budget_${u}`, JSON.stringify(d)),
  loadBudget:   (u: string): BudgetData | null       => JSON.parse(localStorage.getItem(`ez_budget_${u}`) || "null"),
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "login" | "register" | "reset" | "dashboard" | "budget" | "chat" | "history" | "scores";
const AUTH_SCREENS: Screen[] = ["login", "register", "reset"];

interface Expense  { id: number; label: string; amount: string; period: "Month"|"Year" }
interface BudgetData { income: string; period: "Month"|"Year"; expenses: Expense[] }
interface Msg { id: number; text: string; from: "ai"|"user"; time: string }

const DEFAULT_BUDGET: BudgetData = {
  income: "5200", period: "Month",
  expenses: [
    { id: 1, label: "Car Loan",  amount: "400",  period: "Month" },
    { id: 2, label: "Rent",      amount: "1200", period: "Month" },
    { id: 3, label: "Groceries", amount: "350",  period: "Month" },
  ],
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Logo({ inv = false, size = "text-3xl" }: { inv?: boolean; size?: string }) {
  return (
    <span className={`${size} tracking-wider font-black select-none`}
      style={{ fontFamily: "'Black Ops One', cursive", color: inv ? "#fff" : P.navy }}>
      EZBREZ
    </span>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, error }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.dark }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none border bg-white transition-shadow`}
        style={{ fontFamily: "'DM Sans', sans-serif", borderColor: error ? "#f87171" : "rgba(34,87,122,0.18)", color: P.dark }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = P.teal; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${P.foam}`; }}
        onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = error ? "#f87171" : "rgba(34,87,122,0.18)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
      />
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

function FormCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6" style={{ border: "1px solid rgba(34,87,122,0.08)" }}>
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#5E8A7A" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, sound = "confirm", full = false, disabled = false }: {
  children: React.ReactNode; onClick?: () => void;
  sound?: "click"|"confirm"|"pop"; full?: boolean; disabled?: boolean;
}) {
  return (
    <Btn sound={sound} onClick={onClick} disabled={disabled}
      className={`${full ? "w-full" : ""} rounded-xl py-3 px-6 font-bold text-sm text-white hover:brightness-105 flex items-center justify-center gap-2 disabled:opacity-40`}
      style={{ background: `linear-gradient(135deg, ${P.navy} 0%, ${P.teal} 100%)`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {children}
    </Btn>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH LAYOUT
// ═════════════════════════════════════════════════════════════════════════════
function AuthLayout({ screen, go, onLogin }: {
  screen: Screen; go: (s: Screen) => void;
  onLogin: (username: string, budget: BudgetData, decisions: AnalyzedDecision[]) => void;
}) {
  return (
      <div className="size-full flex flex-col md:flex-row overflow-hidden" style={{ background: P.bg }}>
        <div className="hidden md:flex md:w-2/5 flex-col items-center justify-center px-12 py-16 gap-8 shrink-0"
             style={{ background: P.navy }}>
          <Logo inv size="text-5xl" />
          <p className="text-white/70 text-center text-base leading-relaxed max-w-xs"
             style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Smart budgeting made easy. Track spending, grow savings, and hit your financial goals with AI-powered insights.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-xs mt-2">
            {[{ icon: <Target size={18}/>, t:"Set financial goals"}, {icon:<TrendingUp size={18}/>, t:"Track spending patterns"}, {icon:<Sparkles size={18}/>, t:"Get AI budget coaching"}]
                .map(({ icon, t }) => (
                    <div key={t} className="flex items-center gap-3 text-white/80 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(87,204,153,0.25)", color: P.emerald }}>{icon}</span>
                      {t}
                    </div>
                ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="md:hidden mb-8 text-center"><Logo size="text-4xl" /></div>
            {screen === "login"    && <LoginForm    go={go} onLogin={onLogin} />}
            {screen === "register" && <RegisterForm go={go} onLogin={onLogin} />}
            {screen === "reset"    && <ResetForm    go={go} />}
          </div>
        </div>
      </div>
  );
}

function LoginForm({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8081/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (!res.ok) {
        throw new Error("Invalid email or password");
      }
      const user = await res.json();
      localStorage.setItem("userId", user.id.toString());
      go("dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
      <FormCard title="Welcome back" subtitle="Sign in to your EZBREZ account">
        <div className="flex flex-col gap-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <Btn sound="click" onClick={() => go("reset")}
               className="font-medium hover:underline" style={{ color: P.teal }}>
            Forgot password?
          </Btn>
          <Btn sound="click" onClick={() => go("register")}
               className="font-medium hover:underline" style={{ color: P.teal }}>
            Create account
          </Btn>
        </div>
        <PrimaryBtn onClick={handleLogin} fullWidth>
          {loading ? "Signing in..." : "Sign In →"}
        </PrimaryBtn>
      </FormCard>
  );
}

function RegisterForm({ go }: { go: (s: Screen) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8081/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          dateOfBirth: dob, // must be "YYYY-MM-DD" for LocalDate to parse correctly
        }),
      });
      if (!res.ok) {
        throw new Error("Signup failed — email may already be in use");
      }
      const user = await res.json();
      localStorage.setItem("userId", user.id.toString());
      go("budget");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
      <FormCard title="Create account" subtitle="Start your budgeting journey today">
        <div className="flex flex-col gap-4">
          <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="Alex" />
          <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Rivera" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Date of Birth" type="date" value={dob} onChange={setDob} />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <PrimaryBtn onClick={handleSignup} fullWidth>
          {loading ? "Creating account..." : "Create Account →"}
        </PrimaryBtn>
        <Btn sound="click" onClick={() => go("login")}
             className="text-sm text-center font-medium hover:underline"
             style={{ fontFamily: "'DM Sans', sans-serif", color: "#5E8A7A" }}>
          ← Back to sign in
        </Btn>
      </FormCard>
  );
}

function ResetForm({ go }: { go: (s: Screen) => void }) {
  const [email,setEmail]=useState(""); const [newPass,setNewPass]=useState(""); const [done,setDone]=useState(false);
  const submit = () => {
    if (!email || newPass.length < 6) return;
    const all = LS.users(); const idx = all.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) { all[idx].password = newPass; localStorage.setItem("ez_users", JSON.stringify(all)); }
    setDone(true);
  };
  if (done) return (
    <FormCard title="Password updated" subtitle="You can now sign in with your new password.">
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(87,204,153,0.15)" }}>
          <CheckCircle size={28} style={{ color: P.emerald }} />
        </div>
        <PrimaryBtn onClick={() => go("login")} full>Go to Sign In</PrimaryBtn>
      </div>
    </FormCard>
  );
  return (
    <FormCard title="Reset password" subtitle="Enter your email and choose a new password">
      <div className="flex flex-col gap-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="New Password" type="password" value={newPass} onChange={setNewPass} placeholder="Min. 6 characters" />
      </div>
      <PrimaryBtn onClick={submit} full>Reset Password</PrimaryBtn>
      <Btn sound="click" onClick={()=>go("login")} className="text-sm text-center font-medium hover:underline"
        style={{ fontFamily:"'DM Sans',sans-serif", color:"#5E8A7A" }}>Back to sign in</Btn>
    </FormCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APP LAYOUT
// ═════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode }[] = [
  { screen: "dashboard", label: "Dashboard",     icon: <LayoutDashboard size={18}/> },
  { screen: "budget",    label: "My Budget",     icon: <Wallet size={18}/> },
  { screen: "chat",      label: "Bree AI",       icon: <MessageCircle size={18}/> },
  { screen: "history",   label: "History",       icon: <Clock size={18}/> },
  { screen: "scores",    label: "EZBREZ Scores", icon: <Award size={18}/> },
];

function Sidebar({ active, go, username, onLogout, onClose }: {
  active: Screen; go: (s: Screen) => void; username: string; onLogout: ()=>void; onClose?: ()=>void
}) {
  return (
    <div className="flex flex-col h-full py-6 px-4" style={{ background: P.navy }}>
      <div className="flex items-center justify-between px-2 mb-8">
        <Logo inv size="text-2xl" />
        {onClose && <Btn sound="click" onClick={onClose} className="text-white/50 hover:text-white md:hidden"><X size={20}/></Btn>}
      </div>
      {username && (
        <div className="px-3 mb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(87,204,153,0.25)", color: P.mint }}>
            {username[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-white" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{username}</p>
            {/*<p className="text-[10px]" style={{ color:"rgba(255,255,255,0.4)" }}>Score {userScore}/100</p> */}
          </div>
        </div>
      )}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ screen, label, icon }) => {
          const isActive = active === screen;
          return (
            <Btn key={screen} sound="click" onClick={() => { go(screen); onClose?.(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors"
              style={{
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                color: isActive ? P.mint : "rgba(255,255,255,0.6)",
                borderLeft: isActive ? `3px solid ${P.emerald}` : "3px solid transparent",
              }}>
              <span style={{ color: isActive ? P.emerald : "rgba(255,255,255,0.4)" }}>{icon}</span>
              {label}
            </Btn>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 pt-4 border-t" style={{ borderColor:"rgba(255,255,255,0.1)" }}>
        <Btn sound="click" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-white/10 transition-colors"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:"rgba(255,255,255,0.5)" }}>
          <Settings size={18}/> Settings
        </Btn>
        <Btn sound="click" onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-white/10 transition-colors"
          style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:"rgba(255,255,255,0.5)" }}>
          <LogOut size={18}/> Log Out
        </Btn>
      </div>
    </div>
  );
}

function AppLayout({ screen, go, username, budget, onBudgetChange, onLogout }: {
  screen: Screen; go: (s: Screen) => void; username: string;
  budget: BudgetData; onBudgetChange: (b: BudgetData) => void;
  onLogout: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="size-full flex overflow-hidden" style={{ background: P.bg }}>
      <aside className="hidden md:flex flex-col w-60 shrink-0 overflow-y-auto">
        <Sidebar active={screen} go={go} username={username} onLogout={onLogout} />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 h-full"><Sidebar active={screen} go={go} username={username} onLogout={onLogout} onClose={() => setSidebarOpen(false)} /></div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-5 py-4"
          style={{ background: P.navy, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <Btn sound="click" onClick={() => setSidebarOpen(true)} className="text-white"><Menu size={22}/></Btn>
          <Logo inv size="text-2xl" />
          <div className="w-8" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {screen === "dashboard" && <DashboardView go={go} />}
          {screen === "budget"    && <BudgetView budget={budget} onChange={onBudgetChange} go={go} />}
          {screen === "chat"      && <ChatView username={username} budget={budget} />}
          {screen === "history"   && <HistoryView />}
          {screen === "scores"    && <ScoresView budget={budget} />}
        </div>
      </main>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
      <div className="bg-white rounded-xl px-4 py-2.5 shadow-lg text-sm font-semibold"
           style={{ border: `1px solid ${d.color}30`, color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {d.name}: <span style={{ color: d.color }}>{d.value}%</span>
      </div>
  );
};

function StatCard({ label, value, sub, icon, up }: {
  label: string; value: string; sub: string; icon: React.ReactNode; up: boolean;
}) {  return (
      <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
           style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider"
             style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>
            {label}
          </p>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: up ? "rgba(87,204,153,0.12)" : "rgba(192,87,74,0.1)", color: up ? P.emerald : "#C0574A" }}>
          {icon}
        </span>
        </div>
        <p className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
          {value}
        </p>
        <p className="text-xs font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
          {sub}
        </p>
      </div>
  );
}

/// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
interface ExpenseItem {
  id: number;
  name: string;
  monthlyAmount: number;
}

interface BudgetResponse {
  id: number;
  monthlyIncome: number;
  expenseItems: ExpenseItem[];
}

const CHART_COLORS = [
  "#C0574A", // red
  "#D4A21A", // amber
  "#7C5CBF", // purple
  "#0EA5B0", // cyan
  "#E07B30", // orange
  "#3B7BC4", // blue
  "#B5527A", // rose
  P.teal,
];

/*function DashboardView({ go, budget, username, userScore }: { go:(s:Screen)=>void; budget:BudgetData; username:string; userScore:number }) {
  const income   = parseFloat(budget.income) || 5200;
  const totalExp = budget.expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const saved    = income - totalExp;
  const savedPct = Math.max(0, Math.round((saved/income)*100));

  const stats = [
    { label:"Monthly Income",   value:`$${income.toLocaleString()}`,   sub:`${budget.period}ly`,         icon:<DollarSign  size={20}/>, up:true  },
    { label:"Total Expenses",   value:`$${totalExp.toLocaleString()}`, sub:`${100-savedPct}% of income`, icon:<TrendingDown size={20}/>, up:false },
    { label:"Saved This Month", value:`$${saved.toLocaleString()}`,    sub:`${savedPct}% savings rate`,  icon:<TrendingUp size={20}/>,  up:true  },
    { label:"eZBrez Score",     value: `${userScore}/100`, sub:"Good standing", icon:<Sparkles size={20}/>, up:true  },
  ];
    */
function getBudgetHealthIcon(savedPct: number) {
  if (savedPct >= 20) {
    return { icon: <TrendingUp size={20} />, color: P.emerald, label: "On track" };
  } else if (savedPct >= 0) {
    return { icon: <AlertCircle size={20} />, color: "#D4A21A", label: "Tight" };
  } else {
    return { icon: <TrendingDown size={20} />, color: "#C0574A", label: "Overspending" };
  }
}

function DashboardView({ go }: { go: (s: Screen) => void }) {
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8081/api/budgets/${userId}`)
        .then(res => {
          if (!res.ok) throw new Error("No budget found — set one up first");
          return res.json();
        })
        .then((data: BudgetResponse) => {
          setBudget(data);
        })
        .catch(err => {
          console.error("Dashboard fetch error:", err);
          setError(err.message || "Something went wrong");
        })
        .finally(() => {
          setLoading(false);
        });
  }, []);

  if (loading) {
    return <div className="px-6 py-7 max-w-screen-xl mx-auto">Loading your dashboard…</div>;
  }

  if (error || !budget) {
    return (
        <div className="px-6 py-7 flex flex-col gap-7 max-w-screen-xl mx-auto">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
              Welcome to eZBreZ 👋 {/* TODO: add current date - {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}*/}
            </h1>
            <p className="text-sm mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
              Set up your budget to see your personalized dashboard
            </p>
          </div>

          {/* Empty stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Monthly Income", icon: <DollarSign size={20} /> },
              { label: "Total Spent", icon: <TrendingDown size={20} /> },
              { label: "Saved This Month", icon: <TrendingUp size={20} /> },
            ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
                     style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider"
                       style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>
                      {s.label}
                    </p>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(156,184,200,0.12)", color: "#9CB8C8" }}>
                  {s.icon}
                </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#C7D6DE" }}>
                    —
                  </p>
                </div>
            ))}
          </div>

          {/* Empty charts row */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 text-center"
                 style={{ border: "1px dashed rgba(34,87,122,0.15)", minHeight: 260 }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: "rgba(87,204,153,0.12)", color: P.emerald }}>
                <Wallet size={22} />
              </div>
              <p className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
                No spending data yet
              </p>
              <p className="text-xs max-w-[220px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
                Your spending breakdown will appear here once you set up a budget
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 text-center"
                 style={{ border: "1px dashed rgba(34,87,122,0.15)", minHeight: 260 }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: "rgba(56,163,165,0.12)", color: P.teal }}>
                <LayoutDashboard size={22} />
              </div>
              <p className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
                No expense totals yet
              </p>
              <p className="text-xs max-w-[220px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
                Add your expected expenses to see them broken down here
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4"
               style={{ background: `linear-gradient(135deg, ${P.navy} 0%, ${P.teal} 100%)` }}>
            <div>
              <p className="text-white font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Ready to take control of your budget?
              </p>
              <p className="text-white/70 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Add your income and expenses to unlock your dashboard
              </p>
            </div>
            <Btn sound="confirm" onClick={() => go("budget")}
                 className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold hover:brightness-105"
                 style={{ background: "#fff", color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Set Up My Budget <ArrowRight size={15} />
            </Btn>
          </div>
        </div>
    );
  }

  // ─── Derived numbers from real data ───────────────────────────────────
  const income = budget.monthlyIncome;
  const totalSpent = budget.expenseItems.reduce((sum, e) => sum + e.monthlyAmount, 0);
  const saved = income - totalSpent;
  const savedPct = income > 0 ? Math.round((saved / income) * 100) : 0;
  const spentPct = income > 0 ? Math.round((totalSpent / income) * 100) : 0;
  const health = getBudgetHealthIcon(savedPct);
  const isHealthy = savedPct >= 20;


  const pieData = [
    ...budget.expenseItems.map((e, i) => ({
      name: e.name,
      value: income > 0 ? Math.round((e.monthlyAmount / income) * 1000) / 10 : 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    {
      name: "Unspent",
      value: income > 0 ? Math.round((saved / income) * 1000) / 10 : 0,
      color: health.color,
    },
  ];

  const statCards = [
    { label: "Monthly Income", value: `$${income.toLocaleString()}`, sub: "", icon: <DollarSign size={20} />, up: true },
    { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, sub: `${spentPct}% of income`, icon: isHealthy ? <TrendingUp size={20} /> : <TrendingDown size={20} />, up: isHealthy },
    { label: "Saved This Month", value: `$${saved.toLocaleString()}`, sub: health.label, icon: isHealthy ? <TrendingUp size={20} /> : <TrendingDown size={20} />, up: isHealthy },
  ];

  return (
      <div className="px-6 py-7 flex flex-col gap-7 max-w-screen-xl mx-auto">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
              Your Budget Snapshot
            </h1>
            <p className="text-sm mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
              Based on your current budget
            </p>
          </div>
          <Btn sound="confirm" onClick={() => go("budget")}
               className="hidden sm:flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white hover:brightness-105"
               style={{ background: `linear-gradient(135deg, ${P.navy}, ${P.teal})`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Edit Budget <ArrowRight size={15} />
          </Btn>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie chart card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm"
               style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
            <h2 className="text-base font-bold mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
              Spending Breakdown
            </h2>
            <div className="flex items-center gap-6">
              <div style={{ width: 180, height: 180 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={84}
                         dataKey="value" startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.dark }}>
                        {d.name}
                      </span>
                          <span className="text-xs font-bold" style={{ color: d.color }}>{d.value}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF9F4" }}>
                          <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm"
               style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
            <h2 className="text-base font-bold mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
              Expense Totals
            </h2>
            <div className="flex flex-col gap-4">
              {budget.expenseItems.map((item, i) => {
                const pct = income > 0 ? Math.round((item.monthlyAmount / income) * 100) : 0;
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.dark }}>
                      {item.name}
                    </span>
                        <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
                        ${item.monthlyAmount.toLocaleString()}
                      </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${color}18`, color }}>
                        {pct}%
                      </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF9F4" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                             style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BUDGET
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// BUDGET
// ═════════════════════════════════════════════════════════════════════════════
function BudgetView({ budget, onChange, go }: { budget: BudgetData; onChange: (b: BudgetData) => void; go: (s: Screen) => void }) {
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState("");
  const uid = useRef(100);

  // Fetch existing budget on mount so the form reflects what's actually saved
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoadingExisting(false);
      return;
    }

    fetch(`http://localhost:8081/api/budgets/${userId}`)
        .then(res => {
          if (!res.ok) throw new Error("No existing budget");
          return res.json();
        })
        .then((data: { monthlyIncome: number; expenseItems: { id: number; name: string; monthlyAmount: number }[] }) => {
          onChange({
            income: data.monthlyIncome.toString(),
            period: "Month",
            expenses: data.expenseItems.map(item => ({
              id: item.id,
              label: item.name,
              amount: item.monthlyAmount.toString(),
              period: "Month" as const,
            })),
          });
        })
        .catch(() => {
          // No existing budget yet — that's fine, keep default/empty state
        })
        .finally(() => setLoadingExisting(false));
  }, []);

  const setIncome = (v: string) => onChange({ ...budget, income: v });
  const setExp = (id: number, field: keyof Expense, val: string) =>
      onChange({ ...budget, expenses: budget.expenses.map(e => e.id === id ? { ...e, [field]: val } : e) });
  const addExp = () => { playSound("pop"); onChange({ ...budget, expenses: [...budget.expenses, { id: uid.current++, label: "New Expense", amount: "", period: "Month" }] }); };
  const removeExp = (id: number) => { playSound("pop"); onChange({ ...budget, expenses: budget.expenses.filter(e => e.id !== id) }); };

  const handleSave = async () => {
    setError("");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("Not logged in");
      return;
    }

    const payload = {
      userId: parseInt(userId),
      monthlyIncome: parseFloat(budget.income) || 0,
      expenseItems: budget.expenses.map(e => ({
        name: e.label,
        monthlyAmount: parseFloat(e.amount) || 0,
      })),
    };

    setSaving(true);
    try {
      const res = await fetch("http://localhost:8081/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save budget");
      go("dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong saving your budget");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return <div className="px-6 py-7 max-w-2xl mx-auto">Loading your budget…</div>;
  }

  return (
      <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>My Budget</h1>
          <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>Set your income and expected monthly expenses</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4" style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>Income</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5 flex-1 min-w-[140px]" style={{ borderColor: "rgba(34,87,122,0.18)" }}>
              <span className="font-bold" style={{ color: P.teal }}>$</span>
              <input value={budget.income} onChange={e => setIncome(e.target.value)}
                     className="flex-1 outline-none text-sm font-semibold bg-transparent" style={{ color: P.dark }} placeholder="0" />
            </div>
            <span className="text-sm font-semibold shrink-0" style={{ color: "#9CB8C8", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/ month</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4" style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>Expected Expenses</h2>
          <div className="flex flex-col gap-3">
            {budget.expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3">
                  <input value={exp.label} onChange={e => setExp(exp.id, "label", e.target.value)}
                         className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none min-w-0"
                         style={{ borderColor: "rgba(34,87,122,0.15)", color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  <div className="flex items-center gap-1 rounded-xl border px-3 py-2.5 w-28 shrink-0" style={{ borderColor: "rgba(34,87,122,0.15)" }}>
                    <span className="text-sm font-bold" style={{ color: P.teal }}>$</span>
                    <input value={exp.amount} onChange={e => setExp(exp.id, "amount", e.target.value)}
                           className="flex-1 outline-none text-sm font-semibold min-w-0"
                           style={{ color: P.dark, fontFamily: "'DM Sans', sans-serif" }} placeholder="0" />
                  </div>
                  <span className="text-xs font-medium shrink-0" style={{ color: "#9CB8C8" }}>/ mo</span>
                  <Btn sound="pop" onClick={() => removeExp(exp.id)}
                       className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 shrink-0"
                       style={{ color: "#C0574A" }}><X size={15} /></Btn>
                </div>
            ))}
          </div>
          <Btn sound="pop" onClick={addExp}
               className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl w-fit hover:brightness-105"
               style={{ background: "rgba(87,204,153,0.12)", color: P.emerald, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Plus size={15} /> Add Expense
          </Btn>
        </div>

        {error && <p className="text-sm" style={{ color: "#C0574A" }}>{error}</p>}

        <div className="flex justify-end">
          <Btn sound="confirm" onClick={handleSave}
               className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white hover:brightness-105"
               style={{ background: `linear-gradient(135deg,${P.navy},${P.teal})`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {saving ? "Saving..." : "Save and View Dashboard"} <ArrowRight size={15} />
          </Btn>
        </div>
      </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHAT (Bree AI)
// ═════════════════════════════════════════════════════════════════════════════
/*
const NOW_STR = () => new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
function ChatView({ username, budget }: { username:string; budget:BudgetData }) {
  const uid = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([{
    id: uid.current++, from:"ai", time: NOW_STR(),
    text: `Hello ${username}. I have reviewed your budget. You have $${budget.income} in monthly income and ${budget.expenses.length} tracked expenses. What would you like to work on today?`,
  }]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, thinking]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    playSound("confirm");
    setInput("");
    const newMsgs: Msg[] = [...messages, { id:uid.current++, from:"user", text:content, time:NOW_STR() }];
    setMessages(newMsgs);
    setThinking(true);
    setTimeout(() => {
      const reply = getBreeResponse(content, budget, username);
      setThinking(false);
      setMessages(p => [...p, { id:uid.current++, from:"ai", text:reply, time:NOW_STR() }]);
    }, 700 + Math.random() * 600);
  };

  const renderText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part,i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2,-2)}</strong>
        : <span key={i}>{part}</span>
    );

  const CHIPS = ["How is my score?", "Where am I overspending?", "How much can I save?", "Investment tips"];

  return (
    <div className="flex flex-col" style={{ height:"calc(100vh - 56px)", minHeight:500 }}>
      <div className="px-6 py-4 bg-white flex items-center gap-4" style={{ borderBottom:"1px solid rgba(34,87,122,0.08)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:P.foam }}>
          <Bot size={20} style={{ color:P.teal }}/>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>Bree</p>
          <p className="text-xs" style={{ fontFamily:"'DM Sans',sans-serif", color:P.emerald }}>AI Budget Coach</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs font-medium" style={{ color:P.emerald, fontFamily:"'DM Sans',sans-serif" }}>
          <span className="w-2 h-2 rounded-full" style={{ background:P.emerald }}/>Online
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="px-6 py-3 flex flex-wrap gap-2" style={{ background:P.bg, borderBottom:"1px solid rgba(34,87,122,0.06)" }}>
          {CHIPS.map(q=>(
            <Btn key={q} sound="click" onClick={()=>send(q)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold hover:brightness-105"
              style={{ background:"rgba(87,204,153,0.12)", color:P.teal, fontFamily:"'Plus Jakarta Sans',sans-serif", border:`1px solid ${P.emerald}30` }}>
              {q}
            </Btn>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4" style={{ background:P.bg }}>
        {messages.map(m=>(
          <div key={m.id} className={`flex items-end gap-3 ${m.from==="user"?"flex-row-reverse":""}`}>
            {m.from==="ai" && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background:P.foam }}>
                <Bot size={17} style={{ color:P.teal }}/>
              </div>
            )}
            {m.from==="user" && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background:`linear-gradient(135deg,${P.navy},${P.teal})`, color:"#fff" }}>
                {username[0]?.toUpperCase()}
              </div>
            )}
            <div className="max-w-[72%] flex flex-col gap-1">
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.from==="user"?"rounded-br-md":"rounded-bl-md"}`}
                style={{
                  background: m.from==="ai" ? "#fff" : `linear-gradient(135deg,${P.navy},${P.teal})`,
                  color: m.from==="ai" ? P.dark : "#fff",
                  fontFamily:"'DM Sans',sans-serif",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  border: m.from==="ai" ? "1px solid rgba(34,87,122,0.07)" : "none",
                }}>
                {renderText(m.text)}
              </div>
              <span className={`text-[11px] ${m.from==="user"?"text-right":""}`}
                style={{ fontFamily:"'DM Sans',sans-serif", color:"#9CB8C8" }}>{m.time}</span>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-end gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background:P.foam }}>
              <Bot size={17} style={{ color:P.teal }}/>
            </div>
            <div className="rounded-2xl rounded-bl-md px-5 py-3.5 bg-white flex items-center gap-1.5"
              style={{ border:"1px solid rgba(34,87,122,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              {[0,1,2].map(i=>(
                <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background:P.teal, animationDelay:`${i*0.15}s` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="px-6 py-4 bg-white flex items-center gap-3" style={{ borderTop:"1px solid rgba(34,87,122,0.08)" }}>
        <Btn sound="click" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:brightness-105"
          style={{ background:"rgba(87,204,153,0.12)", color:P.emerald }}><Mic size={17}/></Btn>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!thinking&&send()}
          placeholder="Ask Bree anything about your budget..."
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background:P.bg, border:"1px solid rgba(34,87,122,0.12)", fontFamily:"'DM Sans',sans-serif", color:P.dark }}/>
        <Btn sound="confirm" onClick={()=>send()} disabled={thinking||!input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white hover:brightness-110 disabled:opacity-40"
          style={{ background:`linear-gradient(135deg,${P.navy},${P.teal})` }}><Send size={16}/></Btn>
      </div>
    </div>
  );
}
*/
// ═════════════════════════════════════════════════════════════════════════════
// HISTORY (Connected to Spring Boot Backend Pipeline)
// ═════════════════════════════════════════════════════════════════════════════
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// TypeScript interface matching the static inner DTO class in Score.java
interface EzBrezScoreHistory {
  id: number;
  score: number;
  amountSpent: number;
  mlDecision: string;
  createdAt: string; // ISO string from backend LocalDateTime
}

// calculate ezbreez score + add , decisions: Date
function ezbrezScore(decisions: DecisionResult[], month: Date) {
  const targetYear = month.getFullYear();
  const targetMonth = month.getMonth();

  return decisions
    .filter(
      (entry) =>
        entry.date.getFullYear() === targetYear &&
        entry.date.getMonth() === targetMonth
    )
    .reduce((total, entry) => total + entry.score, 0);
}

function getMonths(entries: EzBrezScoreHistory[]): Date[] {
  const months: Date[] = [];
  let currentYear: number | null = null;
  let currentMonth: number | null = null;

  for (const entry of entries) {
    const curDate = new Date(entry.createdAt);
    const year = curDate.getFullYear();
    const month = curDate.getMonth();

    if (year !== currentYear || month !== currentMonth) {
      months.push(new Date(year, month, 1));
      currentYear = year;
      currentMonth = month;
    }

  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const last = months[months.length - 1];
  const alreadyIncluded =
    last &&
    last.getFullYear() === currentMonthStart.getFullYear() &&
    last.getMonth() === currentMonthStart.getMonth();

  return alreadyIncluded ? months : [...months, currentMonthStart];
}





function HistoryView() {
  const [history, setHistory] = useState<EzBrezScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  //const months = getMonths(decisions);
  //const [activeMonth, setActiveMonth] = useState(months[months.length - 1]);

  //var prevMonthDiff = 0;
  //if (months.length >= 2) {
   // prevMonthDiff = userScore - ezbreezScore(decisions, months[months.length - 2]);


  useEffect(() => {
    // Get the logged-in user's ID stored during authentication
    const userId = localStorage.getItem("userId") || "1";

    // Hits your Spring Boot pipeline: Controller -> Service -> Repository
    fetch(`http://localhost:8081/api/scores/history/${userId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch history data");
          return res.json();
        })
        .then((data: EzBrezScoreHistory[]) => {
          setHistory(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading score history from backend:", err);
          setLoading(false);
        });
  }, []);

  if (loading) {
    return (
        <div className="px-6 py-12 text-center text-sm font-semibold" style={{ fontFamily: "'DM Sans',sans-serif", color: P.navy }}>
          Loading your score history pipeline...
        </div>
    );
  }

  if (history.length === 0) {
    return (
        <div className="px-6 py-12 text-center text-sm font-medium" style={{ fontFamily: "'DM Sans',sans-serif", color: "#6B9AA8" }}>
          No historical eZBrez analyses found for this account.
        </div>
    );
  }

  // Grab values from the latest record (first item in the list due to OrderByCreatedAtDesc)
  const latestRecord = history[0];
  const userScore = latestRecord.score;
  const latestDate = new Date(latestRecord.createdAt);

  return (
      <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: P.navy }}>Budget History</h1>
          <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans',sans-serif", color: "#6B9AA8" }}>Monthly spending breakdown by category</p>
        </div>

        {/* Active Selection Block displaying the most recent updated month */}
        <div className="flex gap-2 flex-wrap">
          <Btn sound="click" onClick={() => {}}
               className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
               style={{
                 fontFamily: "'Plus Jakarta Sans',sans-serif",
                 background: `linear-gradient(135deg,${P.navy},${P.teal})`,
                 color: "#fff",
                 border: "none"
               }}>
            {`${MONTH_NAMES[latestDate.getMonth()]} ${latestDate.getFullYear()}`}
          </Btn>
        </div>

        {/* Score Tracker Display Header Card */}
        <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg,${P.navy} 0%,${P.teal} 100%)` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                eZBrez Score — {MONTH_NAMES[latestDate.getMonth()]}
              </p>
              <p className="text-white text-3xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{userScore} / 100</p>
            </div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Star size={24} style={{ color: P.mint }} />
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full" style={{ width: `${userScore}%`, background: P.mint }} />
          </div>
          <p className="text-white/60 text-xs mt-2" style={{ fontFamily: "'DM Sans',sans-serif" }}>
            Current real-time status parsed directly from machine learning output history.
          </p>
        </div>

        {/* Live Pipeline Analysis Iteration Loop */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#9CB8C8" }}>
            Past Analyses
          </h2>
          {history.map((d) => {
            const itemDate = new Date(d.createdAt);
            {/*
              <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4"
                style={{ border:"1px solid rgba(34,87,122,0.07)" }}>
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                  style={{ background:`${color}15` }}>
                  <span className="text-xl font-black" style={{ color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{d.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>
                    {d.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {d.amount > 0 && <span className="text-xs font-medium" style={{ color:P.teal, fontFamily:"'DM Sans',sans-serif" }}>${d.amount.toLocaleString()}</span>}
                    <span className="text-xs" style={{ color:"#9CB8C8", fontFamily:"'DM Sans',sans-serif" }}>{`${d.date.getDate()} ${MONTH_NAMES[d.date.getMonth()]} ${d.date.getFullYear()}`}</span>
                    */}
            const color =
                d.score >= 82 ? P.emerald :
                    d.score >= 67 ? P.teal :
                        d.score >= 50 ? "#D4A21A" :
                            d.score >= 33 ? "#E07B30" : "#C0574A";

            return (
                <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4" style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
                  <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                    <span className="text-xl font-black" style={{ color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{d.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: P.navy }}>
                      {d.mlDecision || "No structured evaluation details provided"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {d.amountSpent > 0 && (
                          <span className="text-xs font-medium" style={{ color: P.teal, fontFamily: "'DM Sans',sans-serif" }}>
                      ${d.amountSpent.toLocaleString()}
                    </span>
                      )}
                      <span className="text-xs" style={{ color: "#9CB8C8", fontFamily: "'DM Sans',sans-serif" }}>
                    {`${itemDate.getDate()} ${MONTH_NAMES[itemDate.getMonth()]} ${itemDate.getFullYear()}`}
                  </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${color}15`, color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {d.score >= 82 ? "Excellent" : d.score >= 67 ? "Good" : d.score >= 50 ? "Moderate" : d.score >= 33 ? "Risky" : "Avoid"}
              </span>
                </div>
            );
                {/*
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background:`${color}15`, color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {d.score >= 82 ? "Excellent" : d.score >= 67 ? "Good" : d.score >= 50 ? "Moderate" : d.score >= 33 ? "Risky" : "Avoid"}
                </span>
               */}

          })}
        </div>
      </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EZBREZ SCORES
// ═════════════════════════════════════════════════════════════════════════════
function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 82 ? P.emerald :
    score >= 67 ? P.teal :
    score >= 50 ? "#D4A21A" :
    score >= 33 ? "#E07B30" : "#C0574A";
  const label =
    score >= 82 ? "Excellent" :
    score >= 67 ? "Good" :
    score >= 50 ? "Moderate" :
    score >= 33 ? "Risky" : "Avoid";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center rounded-full"
        style={{ background:`conic-gradient(${color} ${score}%, #EEF9F4 0%)` }}>
        <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
          <span className="text-3xl font-black" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color }}>{score}</span>
          <span className="text-xs font-semibold" style={{ color:"#9CB8C8" }}>/ 100</span>
        </div>
      </div>
      <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background:`${color}18`, color }}>{label}</span>
    </div>
  );
}

function ScoresView({ budget }: {budget: BudgetData}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [latest, setLatest] = useState<EzBrezScoreHistory|null>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!description.trim()) return;

    setError("");
    playSound("confirm");
    setAnalyzing(true);

    // Build payload matching your MlRequest.java backend DTO
    const payload = {
      description: description.trim(),
      amount: parseFloat(amount) || 0.0
    };

    try {
      // Connects directly to your spring boot endpoint
      const res = await fetch("http://localhost:8080/api/ml/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("ML analysis service pipeline returned an error.");

      // result matches your Score.HistoryResponse object structure
      const result = await res.json();
      setLatest(result);

      // Clear input fields on successful response completion
      setDescription("");
      setAmount("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process decision metrics.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
      <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>EZBREZ Scores</h1>
          <p className="text-sm mt-1" style={{ fontFamily:"'DM Sans',sans-serif", color:"#6B9AA8" }}>
            Describe any financial decision and receive an AI-generated pros, cons, and a 1-100 score.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-5" style={{ border:"1px solid rgba(34,87,122,0.07)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:"#9CB8C8" }}>
            Analyze a Decision
          </h2>

          {error && (
              <p className="text-xs font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </p>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.dark }}>
              Describe the financial decision
            </label>
            <textarea
                value={description}
                onChange={e=>setDescription(e.target.value)}
                placeholder="e.g. I am considering buying a new car for $28,000. I currently drive an older vehicle with high maintenance costs..."
                rows={4}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none"
                style={{
                  fontFamily:"'DM Sans',sans-serif", color:P.dark,
                  borderColor:"rgba(34,87,122,0.18)", lineHeight:1.6,
                }}
                onFocus={e=>{e.target.style.borderColor=P.teal; e.target.style.boxShadow=`0 0 0 3px ${P.foam}`;}}
                onBlur={e=>{e.target.style.borderColor="rgba(34,87,122,0.18)"; e.target.style.boxShadow="none";}}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.dark }}>
              Amount involved
            </label>
            <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5 w-48"
                 style={{ borderColor:"rgba(34,87,122,0.18)" }}>
              <span className="font-bold text-sm" style={{ color:P.teal }}>$</span>
              <input
                  type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 outline-none text-sm font-semibold bg-transparent"
                  style={{ color:P.dark, fontFamily:"'DM Sans',sans-serif" }}
              />
            </div>
          </div>
          <PrimaryBtn onClick={analyze} disabled={analyzing||!description.trim()}>
            {analyzing ? (
                <span className="flex items-center gap-2">
              {[0,1,2].map(i=>(
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay:`${i*0.15}s` }}/>
              ))}
                  Analyzing...
            </span>
            ) : (
                <span className="flex items-center gap-2"><Award size={15}/> Analyze Decision</span>
            )}
          </PrimaryBtn>
        </div>

        {/* Latest result */}
        {latest && (
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6" style={{ border:`2px solid ${P.emerald}40` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:"#9CB8C8", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    Latest Analysis — {`${(new Date(latest.createdAt)).getDate()} ${MONTH_NAMES[(new Date(latest.createdAt)).getMonth()]} ${(new Date(latest.createdAt)).getFullYear()}`}
                  </p>
                  <p className="text-base font-bold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>
                    {latest.mlDecision.length > 80 ? latest.mlDecision.slice(0,80)+"..." : latest.mlDecision}
                  </p>
                  {latest.amountSpent > 0 && (
                      <p className="text-sm font-semibold mt-1" style={{ color:P.teal, fontFamily:"'DM Sans',sans-serif" }}>
                        Amount: ${latest.amountSpent.toLocaleString()}
                      </p>
                  )}
                </div>
                <ScoreGauge score={latest.score} />
              </div>

              <p className="text-sm leading-relaxed" style={{ fontFamily:"'DM Sans',sans-serif", color:"#4A7080" }}>
                {latest.mlDecision}
              </p>

            </div>
        )}
      </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [username, setUsername] = useState("");
  const [budget, setBudget] = useState<BudgetData>(DEFAULT_BUDGET);

  const go = (s: Screen) => { playSound("click"); setScreen(s); };

  const handleLogin = (uname: string, b: BudgetData) => {
    setUsername(uname); setBudget(b); go("dashboard");
  };
  const handleLogout = () => { setUsername(""); setBudget(DEFAULT_BUDGET); go("login"); };
  const handleBudgetChange = (b: BudgetData) => { setBudget(b); if (username) LS.saveBudget(username, b); };

  return (
    <div className="size-full" style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {AUTH_SCREENS.includes(screen)
        ? <AuthLayout screen={screen} go={go} onLogin={handleLogin} />
        : <AppLayout
            screen={screen} go={go} username={username}
            budget={budget} onBudgetChange={handleBudgetChange}
            onLogout={handleLogout}
          />}
    </div>
  );
}

// todo: theres two options for history tab
//  1. (the more work but better for app option technically in the long run but
//   its useless in the short run) when we load up the page, we fetch a list of the
//   available months that we have history for from the backend as well as a
//   list of the decisions from the current month. when a user clicks to
//   another month, frontend will fetch from backend the corresponding data
//  2. (the easier option) when the user logs in, we simultaneously fetch and
//   store their entire decision history for parsing in frontend
//
// also probably exists various TODOs across this document
//
// we might want to delete the bree ai and have the app just be for the ezbreez
// score but thats kinda buns im ngl
//
// settings needs or does not need functionality LOL the button exists
