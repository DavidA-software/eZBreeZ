import { useState, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Mic, Send, Plus, Settings, LogOut, Menu, X,
  LayoutDashboard, Wallet, MessageCircle, Clock,
  TrendingUp, TrendingDown, DollarSign, ChevronDown,
  ArrowRight, Sparkles, Target,
} from "lucide-react";

// ─── Brand palette ────────────────────────────────────────────────────────────
const P = {
  navy:    "#22577A",   // Baltic Blue – sidebar, headings
  teal:    "#38A3A5",   // Tropical Teal – secondary accents
  emerald: "#57CC99",   // Emerald – primary CTAs
  mint:    "#80ED99",   // Light Green – input fills, chips
  foam:    "#C7F9CC",   // Tea Green – page bg tint
  bg:      "#F0FDF8",   // page background
  dark:    "#0D2B3A",   // text
};

// ─── Sound effects ────────────────────────────────────────────────────────────
function playSound(type: "click" | "confirm" | "pop" = "click") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
    if (type === "confirm") {
      osc.frequency.setValueAtTime(460, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.14);
      g.gain.setValueAtTime(0.16, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else if (type === "pop") {
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.09);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.14);
    } else {
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.07);
      g.gain.setValueAtTime(0.09, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch (_) {}
}

// ─── Sound-aware button ───────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  sound?: "click" | "confirm" | "pop";
}
function Btn({ sound = "click", onClick, children, className = "", ...rest }: BtnProps) {
  return (
    <button
      className={`transition-all active:scale-[0.97] ${className}`}
      onClick={(e) => { playSound(sound); onClick?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Screen types ─────────────────────────────────────────────────────────────
type Screen = "login" | "register" | "reset" | "dashboard" | "budget" | "chat" | "history";
const AUTH_SCREENS: Screen[] = ["login", "register", "reset"];

// ─── Logo mark ────────────────────────────────────────────────────────────────
function Logo({ inverted = false, size = "text-3xl" }: { inverted?: boolean; size?: string }) {
  return (
    <span
      className={`${size} tracking-wider font-black select-none`}
      style={{ fontFamily: "'Black Ops One', cursive", color: inverted ? "#fff" : P.navy }}
    >
      EZBREZ
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH LAYOUT  (login / register / reset)
// ═════════════════════════════════════════════════════════════════════════════
function AuthLayout({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  return (
    <div className="size-full flex flex-col md:flex-row overflow-hidden" style={{ background: P.bg }}>
      {/* Left branding panel */}
      <div
        className="hidden md:flex md:w-2/5 flex-col items-center justify-center px-12 py-16 gap-8 shrink-0"
        style={{ background: P.navy }}
      >
        <Logo inverted size="text-5xl" />
        <p className="text-white/70 text-center text-base leading-relaxed max-w-xs"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Smart budgeting made easy. Track spending, grow savings, and hit your financial goals with AI-powered insights.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
          {[
            { icon: <Target size={18} />, label: "Set financial goals" },
            { icon: <TrendingUp size={18} />, label: "Track spending patterns" },
            { icon: <Sparkles size={18} />, label: "Get AI budget coaching" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-white/80 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(87,204,153,0.25)", color: P.emerald }}>
                {icon}
              </span>
              {label}
            </div>
          ))}
        </div>
        {/* Score preview pill */}
        <div className="mt-auto w-full max-w-xs rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-white/50 text-xs mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Your eZBrez Score
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div className="h-full rounded-full" style={{ width: "67%", background: P.emerald }} />
            </div>
            <span className="text-white font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              67/100
            </span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 text-center"><Logo size="text-4xl" /></div>
          {screen === "login"    && <LoginForm    go={go} />}
          {screen === "register" && <RegisterForm go={go} />}
          {screen === "reset"    && <ResetForm    go={go} />}
        </div>
      </div>
    </div>
  );
}

// ─── Field row helper ──────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-600 text-foreground"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, color: P.dark }}>
        {label}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none border bg-white focus:ring-2 focus:ring-offset-0 transition-shadow"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          borderColor: "rgba(34,87,122,0.18)",
          color: P.dark,
        }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = P.teal; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${P.foam}`; }}
        onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = "rgba(34,87,122,0.18)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
      />
    </div>
  );
}

function FormCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6"
      style={{ border: "1px solid rgba(34,87,122,0.08)" }}>
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#5E8A7A" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, sound = "confirm", fullWidth = false }: {
  children: React.ReactNode; onClick?: () => void; sound?: "click"|"confirm"|"pop"; fullWidth?: boolean;
}) {
  return (
    <Btn sound={sound} onClick={onClick}
      className={`${fullWidth ? "w-full" : ""} rounded-xl py-3 px-6 font-bold text-sm text-white hover:brightness-105`}
      style={{ background: `linear-gradient(135deg, ${P.navy} 0%, ${P.teal} 100%)`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {children}
    </Btn>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginForm({ go }: { go: (s: Screen) => void }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState("");
  return (
    <FormCard title="Welcome back" subtitle="Sign in to your EZBREZ account">
      <div className="flex flex-col gap-4">
        <Field label="Username" value={user} onChange={setUser} placeholder="Enter your username" />
        <Field label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
      </div>
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
      <PrimaryBtn onClick={() => go("budget")} fullWidth>Sign In →</PrimaryBtn>
    </FormCard>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
function RegisterForm({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState(""); const [username, setUsername] = useState("");
  const [bd, setBd] = useState(""); const [password, setPassword] = useState("");
  return (
    <FormCard title="Create account" subtitle="Start your budgeting journey today">
      <div className="flex flex-col gap-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="Username" value={username} onChange={setUsername} placeholder="Choose a username" />
        <Field label="Date of Birth" value={bd} onChange={setBd} placeholder="MM/DD/YYYY" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
      </div>
      <PrimaryBtn onClick={() => go("budget")} fullWidth>Create Account →</PrimaryBtn>
      <Btn sound="click" onClick={() => go("login")}
        className="text-sm text-center font-medium hover:underline"
        style={{ fontFamily: "'DM Sans', sans-serif", color: "#5E8A7A" }}>
        ← Back to sign in
      </Btn>
    </FormCard>
  );
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function ResetForm({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState(""); const [newPass, setNewPass] = useState("");
  return (
    <FormCard title="Reset password" subtitle="Enter your email and a new password">
      <div className="flex flex-col gap-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="New Password" type="password" value={newPass} onChange={setNewPass} placeholder="Min. 8 characters" />
      </div>
      <PrimaryBtn onClick={() => go("login")} fullWidth>Reset Password</PrimaryBtn>
      <Btn sound="click" onClick={() => go("login")}
        className="text-sm text-center font-medium hover:underline"
        style={{ fontFamily: "'DM Sans', sans-serif", color: "#5E8A7A" }}>
        ← Back to sign in
      </Btn>
    </FormCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APP LAYOUT  (sidebar + main content)
// ═════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode }[] = [
  { screen: "dashboard", label: "Dashboard",   icon: <LayoutDashboard size={18} /> },
  { screen: "budget",    label: "My Budget",   icon: <Wallet size={18} /> },
  { screen: "chat",      label: "Bree AI",     icon: <MessageCircle size={18} /> },
  { screen: "history",   label: "History",     icon: <Clock size={18} /> },
];

function Sidebar({ active, go, onClose }: { active: Screen; go: (s: Screen) => void; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full py-6 px-4" style={{ background: P.navy }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-2 mb-8">
        <Logo inverted size="text-2xl" />
        {onClose && (
          <Btn sound="click" onClick={onClose} className="text-white/50 hover:text-white md:hidden">
            <X size={20} />
          </Btn>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ screen, label, icon }) => {
          const isActive = active === screen;
          return (
            <Btn
              key={screen} sound="click" onClick={() => { go(screen); onClose?.(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                color: isActive ? P.mint : "rgba(255,255,255,0.6)",
                borderLeft: isActive ? `3px solid ${P.emerald}` : "3px solid transparent",
              }}
            >
              <span style={{ color: isActive ? P.emerald : "rgba(255,255,255,0.45)" }}>{icon}</span>
              {label}
            </Btn>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <Btn sound="click"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-white/10"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(255,255,255,0.55)" }}>
          <Settings size={18} /> Settings
        </Btn>
        <Btn sound="click" onClick={() => go("login")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-white/10"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(255,255,255,0.55)" }}>
          <LogOut size={18} /> Log Out
        </Btn>
      </div>
    </div>
  );
}

function AppLayout({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="size-full flex overflow-hidden" style={{ background: P.bg }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 overflow-y-auto">
        <Sidebar active={screen} go={go} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 h-full">
            <Sidebar active={screen} go={go} onClose={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-5 py-4"
          style={{ background: P.navy, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
          <Btn sound="click" onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu size={22} />
          </Btn>
          <Logo inverted size="text-2xl" />
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {screen === "dashboard" && <DashboardView go={go} />}
          {screen === "budget"    && <BudgetView    go={go} />}
          {screen === "chat"      && <ChatView      go={go} />}
          {screen === "history"   && <HistoryView   go={go} />}
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
const PIE_DATA = [
  { name: "Car",     value: 7.5,  color: "#D4A21A", range: "5–10%"  },
  { name: "Food",    value: 22.5, color: "#C0574A", range: "20–25%" },
  { name: "Unspent", value: 70,   color: P.emerald, range: "70–80%" },
];

const STAT_CARDS = [
  { label: "Monthly Income",   value: "$5,200",  sub: "July 2026",     icon: <DollarSign  size={20} />, up: true  },
  { label: "Total Spent",      value: "$1,456",  sub: "28% of income", icon: <TrendingDown size={20} />, up: false },
  { label: "Saved This Month", value: "$3,744",  sub: "72% saved",     icon: <TrendingUp  size={20} />, up: true  },
  { label: "eZBrez Score",     value: "67/100",  sub: "Good standing", icon: <Sparkles    size={20} />, up: true  },
];

const CATEGORIES = [
  { name: "Unspent",     pct: 70,   color: P.emerald,  amount: "$3,640" },
  { name: "Food",        pct: 22.5, color: "#C0574A",  amount: "$1,170" },
  { name: "Car Loan",    pct: 5,    color: "#D4A21A",  amount: "$260"   },
  { name: "Misc",        pct: 2.5,  color: P.teal,     amount: "$130"   },
];

const TIPS = [
  { title: "Well done on savings!", body: "You're saving 72% of your income — far above the recommended 20%. Keep it up." },
  { title: "Food spending in range", body: "Food sits at 22%, within your 20–25% target. Monitor restaurant vs. groceries." },
  { title: "Build an emergency fund", body: "With a high savings rate, consider allocating 3–6 months of expenses to an emergency fund." },
];

function StatCard({ label, value, sub, icon, up }: typeof STAT_CARDS[0]) {
  return (
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

function DashboardView({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="px-6 py-7 flex flex-col gap-7 max-w-screen-xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
            Good morning, Alex 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
            Wednesday, July 9 · Here&apos;s your budget snapshot
          </p>
        </div>
        <Btn sound="confirm" onClick={() => go("budget")}
          className="hidden sm:flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white hover:brightness-105"
          style={{ background: `linear-gradient(135deg, ${P.navy}, ${P.teal})`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Edit Budget <ArrowRight size={15} />
        </Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
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
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={52} outerRadius={84}
                    dataKey="value" startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
                    {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.dark }}>
                        {d.name}
                      </span>
                      <span className="text-xs font-bold" style={{ color: d.color }}>{d.range}</span>
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
            Category Totals
          </h2>
          <div className="flex flex-col gap-4">
            {CATEGORIES.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.dark }}>
                    {c.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
                      {c.amount}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${c.color}18`, color: c.color }}>
                      {c.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF9F4" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div>
        <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
          Budget Insights
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {TIPS.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
              <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center"
                style={{ background: "rgba(87,204,153,0.12)", color: P.emerald }}>
                <Sparkles size={16} />
              </div>
              <p className="text-sm font-bold mb-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
                {t.title}
              </p>
              <p className="text-xs leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BUDGET SETUP
// ═════════════════════════════════════════════════════════════════════════════
interface Expense { id: number; label: string; amount: string; period: "Month" | "Year" }
interface Category { id: number; name: string; color: string }

const CAT_COLORS = [P.emerald, P.teal, "#D4A21A", "#C0574A", "#7C5CBF", "#0EA5B0"];

function BudgetView({ go }: { go: (s: Screen) => void }) {
  const [earning, setEarning] = useState("5200");
  const [period, setPeriod] = useState<"Month" | "Year">("Month");
  const [showPeriod, setShowPeriod] = useState(false);
  const uid = useRef(50);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, label: "Car Loan",    amount: "400",  period: "Month" },
    { id: 2, label: "Rent",        amount: "1200", period: "Month" },
    { id: 3, label: "Groceries",   amount: "350",  period: "Month" },
  ]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: "Miscellaneous", color: P.teal    },
    { id: 2, name: "Car",           color: "#D4A21A" },
    { id: 3, name: "Food",          color: "#C0574A" },
    { id: 4, name: "Savings",       color: P.emerald },
  ]);
  const [catInput, setCatInput] = useState("");

  const addExpense = () => {
    playSound("pop");
    setExpenses(p => [...p, { id: uid.current++, label: "New Expense", amount: "", period: "Month" }]);
  };

  const addCat = (name: string) => {
    if (!name.trim()) return;
    playSound("pop");
    setCategories(p => [...p, { id: uid.current++, name: name.trim(), color: CAT_COLORS[p.length % CAT_COLORS.length] }]);
    setCatInput("");
  };

  return (
    <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
          My Budget
        </h1>
        <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
          Set your income, expected expenses, and spending categories
        </p>
      </div>

      {/* Income card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4"
        style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
        <h2 className="text-sm font-bold uppercase tracking-wider"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>
          Income
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5 flex-1 min-w-[140px] bg-white focus-within:ring-2"
            style={{ borderColor: "rgba(34,87,122,0.18)", fontFamily: "'DM Sans', sans-serif" }}>
            <span className="font-bold" style={{ color: P.teal }}>$</span>
            <input value={earning} onChange={e => setEarning(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent font-semibold"
              style={{ color: P.dark }} placeholder="0" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#9CB8C8" }}>per</span>
          <div className="relative">
            <Btn sound="click" onClick={() => setShowPeriod(p => !p)}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-gray-50"
              style={{ borderColor: "rgba(34,87,122,0.18)", color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {period} <ChevronDown size={14} />
            </Btn>
            {showPeriod && (
              <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl z-20 overflow-hidden"
                style={{ border: "1px solid rgba(34,87,122,0.12)", minWidth: "100px" }}>
                {(["Month", "Year"] as const).map(p => (
                  <Btn key={p} sound="click"
                    onClick={() => { setPeriod(p); setShowPeriod(false); }}
                    className="block w-full px-4 py-2.5 text-sm font-semibold text-left hover:bg-gray-50"
                    style={{ color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {p}
                  </Btn>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4"
        style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
        <h2 className="text-sm font-bold uppercase tracking-wider"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>
          Expected Expenses
        </h2>
        <div className="flex flex-col gap-3">
          {expenses.map(exp => (
            <div key={exp.id} className="flex items-center gap-3">
              <input
                value={exp.label}
                onChange={e => setExpenses(p => p.map(x => x.id === exp.id ? { ...x, label: e.target.value } : x))}
                className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none min-w-0 hover:border-teal-300 focus:ring-2"
                style={{ borderColor: "rgba(34,87,122,0.15)", color: P.navy, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
              <div className="flex items-center gap-1 rounded-xl border px-3 py-2.5 w-32 shrink-0"
                style={{ borderColor: "rgba(34,87,122,0.15)" }}>
                <span className="text-sm font-bold" style={{ color: P.teal }}>$</span>
                <input
                  value={exp.amount}
                  onChange={e => setExpenses(p => p.map(x => x.id === exp.id ? { ...x, amount: e.target.value } : x))}
                  className="flex-1 outline-none text-sm font-semibold min-w-0"
                  style={{ color: P.dark, fontFamily: "'DM Sans', sans-serif" }} placeholder="0"
                />
              </div>
              <span className="text-xs font-medium shrink-0" style={{ color: "#9CB8C8" }}>/ mo</span>
              <Btn sound="pop"
                onClick={() => { playSound("pop"); setExpenses(p => p.filter(e => e.id !== exp.id)); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 shrink-0"
                style={{ color: "#C0574A" }}>
                <X size={15} />
              </Btn>
            </div>
          ))}
        </div>
        <Btn sound="pop" onClick={addExpense}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl w-fit hover:brightness-105"
          style={{ background: "rgba(87,204,153,0.12)", color: P.emerald, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Plus size={15} /> Add Expense
        </Btn>
      </div>

      {/* Categories card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4"
        style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
        <h2 className="text-sm font-bold uppercase tracking-wider"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#9CB8C8" }}>
          Spending Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat.id} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold"
              style={{ background: `${cat.color}18`, color: cat.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {cat.name}
              <Btn sound="pop"
                onClick={() => { playSound("pop"); setCategories(p => p.filter(c => c.id !== cat.id)); }}
                className="w-4 h-4 rounded-full flex items-center justify-center ml-0.5 hover:opacity-70">
                <X size={12} />
              </Btn>
            </span>
          ))}
          <div className="flex items-center rounded-full px-3 py-1.5 border-2 border-dashed"
            style={{ borderColor: "rgba(34,87,122,0.2)" }}>
            <input
              value={catInput}
              onChange={e => setCatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCat(catInput)}
              placeholder="+ Add category"
              className="outline-none text-sm font-semibold bg-transparent w-28"
              style={{ color: "#9CB8C8", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Btn sound="confirm" onClick={() => go("dashboard")}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white hover:brightness-105"
          style={{ background: `linear-gradient(135deg, ${P.navy}, ${P.teal})`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Save & View Dashboard <ArrowRight size={15} />
        </Btn>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHAT (Bree AI)
// ═════════════════════════════════════════════════════════════════════════════
interface Msg { id: number; text: string; from: "ai" | "user"; time: string }
const NOW = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const INIT_MSGS: Msg[] = [
  { id: 1, from: "ai",   text: "Hi Alex! I'm Bree, your AI budget coach. 👋 I've reviewed your July budget — you're saving 72% of your income. That's excellent!", time: "9:00 AM" },
  { id: 2, from: "user", text: "How can I improve my eZBrez score?",                                                                                                time: "9:01 AM" },
  { id: 3, from: "ai",   text: "Great question! Your score is 67/100. To boost it: (1) Build a 3-month emergency fund, (2) Reduce food spend to under 20%, (3) Set up automatic savings transfers.", time: "9:01 AM" },
];

function ChatView({ go: _ }: { go: (s: Screen) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(INIT_MSGS);
  const [input, setInput] = useState("");
  const uid = useRef(10);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    playSound("confirm");
    const text = input.trim();
    setInput("");
    setMsgs(p => [...p, { id: uid.current++, from: "user", text, time: NOW() }]);
    setTimeout(() => {
      setMsgs(p => [...p, {
        id: uid.current++, from: "ai", time: NOW(),
        text: "Thanks for asking! Based on your current budget patterns, I'd recommend reviewing your miscellaneous expenses — they can add up quickly. Would you like a detailed breakdown?",
      }]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Chat header */}
      <div className="px-6 py-4 bg-white flex items-center gap-4"
        style={{ borderBottom: "1px solid rgba(34,87,122,0.08)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: P.foam }}>🦆</div>
        <div>
          <p className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
            Bree
          </p>
          <p className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color: P.emerald }}>
            AI Budget Coach · Online
          </p>
        </div>
        <div className="ml-auto w-2.5 h-2.5 rounded-full" style={{ background: P.emerald }} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4" style={{ background: P.bg }}>
        {msgs.map(m => (
          <div key={m.id} className={`flex items-end gap-3 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
            {m.from === "ai" && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: P.foam }}>🦆</div>
            )}
            <div className="max-w-[70%] flex flex-col gap-1">
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.from === "user" ? "rounded-br-md" : "rounded-bl-md"}`}
                style={{
                  background: m.from === "ai" ? "#fff" : `linear-gradient(135deg, ${P.navy}, ${P.teal})`,
                  color: m.from === "ai" ? P.dark : "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: m.from === "ai" ? "1px solid rgba(34,87,122,0.07)" : "none",
                }}>
                {m.text}
              </div>
              <span className={`text-[11px] ${m.from === "user" ? "text-right" : ""}`}
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 bg-white flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(34,87,122,0.08)" }}>
        <Btn sound="click"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:brightness-105"
          style={{ background: "rgba(87,204,153,0.12)", color: P.emerald }}>
          <Mic size={17} />
        </Btn>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask Bree anything about your budget…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{
            background: P.bg, border: "1px solid rgba(34,87,122,0.12)",
            fontFamily: "'DM Sans', sans-serif", color: P.dark,
          }}
        />
        <Btn sound="confirm" onClick={send}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${P.navy}, ${P.teal})` }}>
          <Send size={16} />
        </Btn>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═════════════════════════════════════════════════════════════════════════════
const MONTHS = ["July 2026", "June 2026", "May 2026"];
const MONTH_DATA: Record<string, { id: number; label: string; pct: number; amount: string; color: string }[]> = {
  "July 2026": [
    { id: 1, label: "Unspent",     pct: 70, amount: "$3,640", color: P.emerald  },
    { id: 2, label: "Food",        pct: 22, amount: "$1,144", color: "#C0574A"  },
    { id: 3, label: "Car Loan",    pct: 5,  amount: "$260",   color: "#D4A21A"  },
    { id: 4, label: "Misc",        pct: 3,  amount: "$156",   color: P.teal     },
  ],
  "June 2026": [
    { id: 1, label: "Personal",    pct: 40, amount: "$1,840", color: P.teal     },
    { id: 2, label: "Miscellaneous", pct: 80, amount: "$3,680", color: "#C0574A" },
    { id: 3, label: "Car",         pct: 20, amount: "$920",   color: "#D4A21A"  },
    { id: 4, label: "Misc",        pct: 96, amount: "$4,416", color: P.navy     },
  ],
  "May 2026": [
    { id: 1, label: "Unspent",     pct: 65, amount: "$3,380", color: P.emerald  },
    { id: 2, label: "Food",        pct: 25, amount: "$1,300", color: "#C0574A"  },
    { id: 3, label: "Car Loan",    pct: 7,  amount: "$364",   color: "#D4A21A"  },
    { id: 4, label: "Utilities",   pct: 3,  amount: "$156",   color: P.teal     },
  ],
};

function HistoryView({ go: _ }: { go: (s: Screen) => void }) {
  const [activeMonth, setActiveMonth] = useState("July 2026");
  const data = MONTH_DATA[activeMonth];

  return (
    <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
          Budget History
        </h1>
        <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B9AA8" }}>
          Monthly spending breakdown by category
        </p>
      </div>

      {/* Month tabs */}
      <div className="flex gap-2 flex-wrap">
        {MONTHS.map(m => (
          <Btn key={m} sound="click" onClick={() => setActiveMonth(m)}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-105"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: activeMonth === m ? `linear-gradient(135deg, ${P.navy}, ${P.teal})` : "#fff",
              color: activeMonth === m ? "#fff" : P.navy,
              border: activeMonth === m ? "none" : "1px solid rgba(34,87,122,0.15)",
            }}>
            {m}
          </Btn>
        ))}
      </div>

      {/* Progress bars */}
      <div className="flex flex-col gap-4">
        {data.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ border: "1px solid rgba(34,87,122,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.navy }}>
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#9CB8C8" }}>
                  {item.amount}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${item.color}18`, color: item.color }}>
                  {item.pct}%
                </span>
              </div>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "#EEF9F4" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${item.pct}%`, background: `linear-gradient(90deg, ${item.color}CC, ${item.color})` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Score card */}
      <div className="rounded-2xl p-6"
        style={{ background: `linear-gradient(135deg, ${P.navy} 0%, ${P.teal} 100%)` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              eZBrez Score — {activeMonth}
            </p>
            <p className="text-white text-3xl font-bold mt-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              67 / 100
            </p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: "rgba(255,255,255,0.12)" }}>
            ⭐
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full" style={{ width: "67%", background: P.mint }} />
        </div>
        <p className="text-white/60 text-xs mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Good standing · +3 pts from last month
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const go = (s: Screen) => { playSound("click"); setScreen(s); };
  const isAuth = AUTH_SCREENS.includes(screen);

  return (
    <div
      className="size-full"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {isAuth
        ? <AuthLayout screen={screen} go={go} />
        : <AppLayout  screen={screen} go={go} />}
    </div>
  );
}
