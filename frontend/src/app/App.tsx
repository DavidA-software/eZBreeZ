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
  saveDecisions:(u: string, d: AnalyzedDecision[])   => localStorage.setItem(`ez_decisions_${u}`, JSON.stringify(d)),
  loadDecisions:(u: string): AnalyzedDecision[]      => JSON.parse(localStorage.getItem(`ez_decisions_${u}`) || "[]"),
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "login" | "register" | "reset" | "dashboard" | "budget" | "chat" | "history" | "scores";
const AUTH_SCREENS: Screen[] = ["login", "register", "reset"];

interface Expense  { id: number; label: string; amount: string; period: "Month"|"Year" }
interface BudgetData { income: string; period: "Month"|"Year"; expenses: Expense[] }
interface Msg { id: number; text: string; from: "ai"|"user"; time: string }

interface DecisionResult {
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
}
interface AnalyzedDecision {
  id: number;
  description: string;
  amount: number;
  result: DecisionResult;
  date: string;
}

const DEFAULT_BUDGET: BudgetData = {
  income: "5200", period: "Month",
  expenses: [
    { id: 1, label: "Car Loan",  amount: "400",  period: "Month" },
    { id: 2, label: "Rent",      amount: "1200", period: "Month" },
    { id: 3, label: "Groceries", amount: "350",  period: "Month" },
  ],
};

// ─── Financial Decision Scorer AI ─────────────────────────────────────────────
function scoreDecision(description: string, amount: number, budget: BudgetData): DecisionResult {
  const desc = description.toLowerCase();
  const income = parseFloat(budget.income) || 5200;
  const totalExp = budget.expenses.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const saved = income - totalExp;
  const amtRatio = amount / income; // relative to monthly income

  const is = (pattern: RegExp) => pattern.test(desc);

  const isDebtPayoff    = is(/pay(ing)?\s*(off|down)|debt\s*free|payoff|pay off/);
  const isInvesting     = is(/invest|stock|fund|index|401k|ira|roth|etf|bond|dividend/);
  const isCrypto        = is(/crypto|bitcoin|ethereum|nft|altcoin|token|coin|defi/);
  const isEmergency     = is(/emergency|buffer|safety net/);
  const isSavings       = is(/sav(e|ing)|high.yield|savings account|cd |certificate/);
  const isHome          = is(/home|house|property|mortgage|real estate|condo/);
  const isEducation     = is(/school|college|education|degree|course|training|certif|bootcamp/);
  const isCarNew        = is(/new car|new vehicle|new truck/);
  const isCar           = is(/car|vehicle|auto|truck/) && !isCarNew;
  const isVacation      = is(/vacation|holiday|trip|travel|cruise|resort/);
  const isLuxury        = is(/luxury|jewel|designer|watch|yacht|boat|jewelry/);
  const isBusiness      = is(/business|startup|entrepreneur|franchise|side hustle/);
  const isInsurance     = is(/insurance|life insurance|protect|coverage/);
  const isRenovation    = is(/renovate|renovation|home improvement|kitchen|bathroom|remodel/);
  const isGambling      = is(/gambl|casino|bet|lottery|poker/);
  const isRetirement    = is(/retire|pension|annuity/);

  let baseScore = 55;
  const pros: string[] = [];
  const cons: string[] = [];

  if (isGambling) {
    baseScore = 8;
    pros.push("Entertainment value in controlled, budgeted amounts");
    cons.push("Expected return is mathematically negative");
    cons.push("High risk of losing the entire amount");
    cons.push("Can develop into compulsive behavior");
    cons.push("No wealth-building potential");
  } else if (isCrypto) {
    baseScore = 30;
    pros.push("High upside potential if market moves favorably");
    pros.push("Provides portfolio diversification from traditional assets");
    cons.push("Extreme volatility — drops of 50-80% are common");
    cons.push("No underlying cash flows or earnings to anchor value");
    cons.push("Regulatory uncertainty creates additional risk");
    cons.push("Not a recommended core financial strategy");
    if (amtRatio > 0.5) cons.push("Amount is large relative to income — limit speculative holdings to under 5% of net worth");
  } else if (isEmergency) {
    baseScore = 93;
    pros.push("Foundational financial safety net against unexpected events");
    pros.push("Prevents going into high-interest debt during emergencies");
    pros.push("Fully liquid and FDIC insured");
    pros.push("Reduces financial stress and improves decision-making");
    cons.push("Savings account yields less than long-term equity investing");
    cons.push("Inflation gradually erodes purchasing power of idle cash");
  } else if (isRetirement) {
    baseScore = 92;
    pros.push("Tax-advantaged growth significantly accelerates wealth accumulation");
    pros.push("Employer match (if available) is an immediate 50-100% return");
    pros.push("Compound interest over decades creates substantial wealth");
    pros.push("Reduces current taxable income");
    cons.push("Funds are locked until retirement age (59.5) without penalty");
    cons.push("Annual contribution limits apply");
  } else if (isDebtPayoff) {
    baseScore = 90;
    pros.push("Guaranteed return equal to the interest rate on the debt");
    pros.push("Improves credit utilization ratio and credit score");
    pros.push("Reduces monthly obligations and increases cash flow");
    pros.push("Eliminates financial stress associated with carrying debt");
    cons.push("Reduces liquid cash reserves in the short term");
    if (amtRatio > 3) cons.push("Large payment — ensure you maintain a 3-month emergency fund before fully paying off");
  } else if (isInvesting) {
    baseScore = 83;
    pros.push("Compound growth builds wealth substantially over time");
    pros.push("Historically equities return 7-10% annually over the long run");
    pros.push("Index funds provide diversification at low cost");
    if (amtRatio <= 1) pros.push("Amount is proportionate and manageable relative to your income");
    cons.push("Market volatility means short-term value can decrease");
    cons.push("Capital is less accessible while invested");
    if (amtRatio > 4) cons.push("Confirm your emergency fund (3-6 months of expenses) is funded before committing large sums");
  } else if (isSavings) {
    baseScore = 82;
    pros.push("High-yield accounts currently earn 4-5% APY");
    pros.push("Fully liquid — funds accessible at any time");
    pros.push("FDIC insured up to $250,000");
    pros.push("No market risk");
    cons.push("Returns are lower than long-term equity investing");
    cons.push("Inflation can erode real purchasing power over time");
  } else if (isHome) {
    baseScore = amtRatio <= 36 ? 73 : 56;
    pros.push("Builds equity over time rather than renting");
    pros.push("Potential for long-term property appreciation");
    pros.push("Stability and control over your living environment");
    pros.push("Mortgage interest may be tax-deductible");
    cons.push("Illiquid asset — difficult to sell quickly");
    cons.push("Additional costs: property tax, insurance, maintenance (1-3% of value annually)");
    if (amtRatio > 36) cons.push("Purchase price appears high relative to income — review debt-to-income ratio carefully");
  } else if (isEducation) {
    baseScore = 77;
    pros.push("Increases lifetime earning potential and career opportunities");
    pros.push("Skills and credentials provide durable long-term value");
    pros.push("May qualify for education tax credits");
    cons.push("Financial return varies by field and job market conditions");
    cons.push("Upfront cost with a delayed financial payoff period");
    if (amtRatio > 6) cons.push("Consider carefully whether student loans are preferable to depleting savings");
  } else if (isCarNew) {
    baseScore = 46;
    pros.push("Comes with full manufacturer warranty and latest safety features");
    pros.push("Lower initial maintenance costs and higher reliability");
    pros.push("Better financing rates typically available on new vehicles");
    cons.push("Depreciates 15-25% in the first year alone");
    cons.push("Higher insurance premiums than equivalent used vehicles");
    cons.push("Total cost of ownership significantly exceeds a comparable used car");
    if (amount > income * 0.15 * 12) cons.push("Monthly payments may exceed the recommended 15% of monthly income guideline");
  } else if (isCar) {
    baseScore = 61;
    pros.push("Lower purchase price and reduced depreciation impact");
    pros.push("Lower insurance costs than new vehicles");
    pros.push("Certified pre-owned options provide warranty coverage");
    cons.push("Higher potential maintenance and repair costs");
    cons.push("Less predictable reliability without full vehicle history");
    if (amount > income * 0.12 * 12) cons.push("Ensure total monthly car costs (payment + insurance + fuel) stay under 15% of income");
  } else if (isVacation) {
    baseScore = amtRatio <= 0.5 ? 63 : 47;
    pros.push("Mental health and well-being benefits are well-documented");
    pros.push("Experiences and memories provide lasting value");
    if (amtRatio <= 0.5) pros.push("Amount is reasonable relative to your monthly income");
    cons.push("No financial return — entirely a consumption expense");
    cons.push("Same funds invested would compound significantly over time");
    if (amtRatio > 0.5) cons.push("Amount is significant — consider a more budget-friendly itinerary");
    if (amtRatio > 1) cons.push("Exceeds one month of income — review whether this fits your savings goals");
  } else if (isLuxury) {
    baseScore = 27;
    pros.push("Personal enjoyment and satisfaction");
    pros.push("Certain items (art, specific watches) may retain or appreciate in value");
    cons.push("Depreciates rapidly — resale value is typically a fraction of purchase price");
    cons.push("High opportunity cost relative to investing or debt repayment");
    cons.push("Does not improve financial health or future security");
    if (amtRatio > 1) cons.push("Represents more than one month of income — consider whether this serves your long-term plan");
  } else if (isBusiness) {
    baseScore = 64;
    pros.push("Potential for significant income generation and wealth creation");
    pros.push("Business ownership provides tax advantages not available to employees");
    pros.push("Builds an asset that can be sold or generate passive income");
    cons.push("Approximately 50% of businesses fail within the first five years");
    cons.push("Capital is at risk with no guaranteed return");
    cons.push("Requires time investment well beyond the initial financial cost");
    if (amtRatio > 2) cons.push("Large commitment — ensure personal finances are stable before investing this amount");
  } else if (isInsurance) {
    baseScore = 85;
    pros.push("Protects against catastrophic financial loss");
    pros.push("Provides financial security for dependents and long-term planning");
    pros.push("Premiums may be tax-deductible depending on type");
    cons.push("Ongoing premium expense with no direct financial return if unused");
    cons.push("Policies vary significantly — review coverage terms carefully");
  } else if (isRenovation) {
    baseScore = 67;
    pros.push("Increases property value and quality of living");
    pros.push("Kitchen and bathroom renovations typically return 60-80% of cost on resale");
    pros.push("May improve energy efficiency and reduce ongoing utility costs");
    cons.push("Renovation costs frequently exceed initial estimates by 10-30%");
    cons.push("Return on investment depends heavily on local real estate conditions");
    if (amtRatio > 3) cons.push("Large project — obtain multiple contractor quotes before committing");
  } else {
    // Generic fallback
    baseScore = 55;
    pros.push("You are evaluating the decision before committing — a strong financial habit");
    pros.push("If it meets a genuine need, it can be a sound use of funds");
    cons.push("Opportunity cost — same funds could serve higher-priority financial goals");
    cons.push("Ensure this decision is consistent with your overall budget and savings targets");
    if (amtRatio > 2) cons.push("Amount is substantial relative to income — consider phasing or scaling down");
  }

  // Adjust score for outsized amounts
  if (amtRatio > 6 && baseScore > 50) baseScore = Math.max(baseScore - 10, 40);
  if (amtRatio > 12 && baseScore > 50) baseScore = Math.max(baseScore - 5, 35);
  if (amount <= 0) baseScore = 50;
  baseScore = Math.min(100, Math.max(1, baseScore));

  const label =
    baseScore >= 82 ? "Excellent" :
    baseScore >= 67 ? "Good" :
    baseScore >= 50 ? "Moderate" :
    baseScore >= 33 ? "Risky" : "Avoid";

  const summaryTone =
    baseScore >= 82 ? "This is a financially sound decision that aligns well with wealth-building principles." :
    baseScore >= 67 ? "This is a reasonable decision with some important considerations to keep in mind." :
    baseScore >= 50 ? "This decision has merit but carries notable risks worth weighing carefully." :
    baseScore >= 33 ? "This carries significant financial risk. Carefully review the cons before proceeding." :
    "This decision poses serious financial risk. Consider alternatives before committing.";

  return { score: baseScore, pros, cons, summary: `${label} — ${summaryTone}` };
}

// ─── Bree AI "brain" ──────────────────────────────────────────────────────────
function getBreeResponse(input: string, budget: BudgetData, username: string): string {
  const msg = input.toLowerCase().trim();
  const income  = parseFloat(budget.income) || 5200;
  const totalExp = budget.expenses.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const saved    = income - totalExp;
  const savedPct = Math.max(0, Math.round((saved / income) * 100));
  const expList  = budget.expenses.map(e => `  - ${e.label}: $${parseFloat(e.amount).toLocaleString()}/mo`).join("\n");

  if (/\b(hi|hello|hey|howdy|sup|good morning|good evening)\b/.test(msg))
    return `Hello ${username}. Quick snapshot: you are saving **$${saved.toLocaleString()}** (${savedPct}%) of your monthly income — ${savedPct >= 50 ? "well above average." : savedPct >= 20 ? "right on target." : "a good start."} What would you like to work on today?`;

  if (/score|rating|grade|rank|points/.test(msg)) {
    const tips = savedPct < 30 ? "First priority is boosting your savings rate above 30%." : "Building a full emergency fund and automating transfers is your next lever.";
    return `Your **eZBrez Score is 67/100**.\n\nTo push it higher:\n1. Build a 3-6 month emergency fund (~$${(totalExp * 4).toLocaleString()})\n2. ${tips}\n3. Keep all expense categories within their target ranges\n4. Avoid taking on new recurring debt\n\nAt your current savings rate you could realistically reach **80+ within 60 days**.`;
  }

  if (/sav(e|ing|ings?)|emergency fund|nest egg|rainy day/.test(msg)) {
    const months3 = Math.ceil((totalExp * 3) / saved);
    return `You are saving **$${saved.toLocaleString()}/mo (${savedPct}%)** — ${savedPct >= 50 ? "well above" : "above"} the recommended 20% rule.\n\nAt this rate:\n- 3-month emergency fund: **${months3} month${months3 !== 1 ? "s" : ""} away**\n- $10,000 goal: **${Math.ceil(10000/saved)} months away**\n\nConsider a high-yield savings account (currently 4-5% APY) to accelerate progress.`;
  }

  if (/spend(ing)?|expens(e|es|ive)?|cost|pay(ing|ment)?|bill|debt/.test(msg))
    return `Your full expense breakdown:\n\n${expList}\n\n**Total: $${totalExp.toLocaleString()}/mo** (${Math.round((totalExp/income)*100)}% of income)\nYou retain **$${saved.toLocaleString()}/mo** after all expenses. Want tips on reducing a specific line item?`;

  if (/food|groceries|eat(ing)?|restaurant|dining/.test(msg)) {
    const foodExp = budget.expenses.find(e => /food|grocer|eat|restaurant/i.test(e.label));
    const amt = foodExp ? parseFloat(foodExp.amount) : 350;
    const foodPct = Math.round((amt/income)*100);
    return `Your food-related spending is around **$${amt.toLocaleString()}/mo (${foodPct}% of income)**.\n\n${foodPct > 20 ? "This is slightly above the 15-20% target. Quick wins:" : "This is in a healthy range. To optimize further:"}\n- Meal prep 2-3 times per week saves approximately $80-120/mo\n- Set a weekly cash envelope budget for dining out\n- Grocery apps (Ibotta, Flipp) reduce spending by 8-15%\n\nEvery $50/mo reduction adds **$600/year** to your savings.`;
  }

  if (/car|loan|vehicle|auto|gas/.test(msg)) {
    const carExp = budget.expenses.find(e => /car|loan|auto|vehicle/i.test(e.label));
    const amt = carExp ? parseFloat(carExp.amount) : 400;
    const carPct = Math.round((amt/income)*100);
    return `Your car-related expenses are **$${amt.toLocaleString()}/mo (${carPct}% of income)**.\n\nThe guideline is to keep total vehicle costs under 15% of gross income (your ceiling: $${Math.round(income*0.15).toLocaleString()}/mo).\n\nYou are ${amt <= income*0.15 ? "within" : "slightly over"} that range.\n\nOptions: refinance if your rate exceeds 5%, compare insurance annually, and review whether a less expensive vehicle is feasible at renewal.`;
  }

  if (/income|earn(ing)?|salary|wage|pay(check)?|raise/.test(msg))
    return `Your monthly income is **$${income.toLocaleString()}** ($${(income*12).toLocaleString()}/year).\n\nAllocation:\n- Expenses: $${totalExp.toLocaleString()} (${Math.round((totalExp/income)*100)}%)\n- Saved: $${saved.toLocaleString()} (${savedPct}%)\n\nA 5% raise adds $${Math.round(income*0.05).toLocaleString()}/mo. A $500/mo side income adds $6,000/year and meaningfully accelerates every financial goal.`;

  if (/invest(ing|ment)?|stock|fund|retire|401k|ira/.test(msg)) {
    const invest = Math.round(saved*0.5);
    return `With $${saved.toLocaleString()}/mo available, investing makes sense.\n\nRecommended order:\n1. Max out employer 401k match — immediate 50-100% return\n2. Roth IRA — $500/mo up to $6,000/year limit\n3. Remaining — low-cost index funds (VTI, VXUS)\n\nIf you invest $${invest.toLocaleString()}/mo:\n- 10 years: ~$${Math.round(invest*12*10*1.7).toLocaleString()} at 7% average return\n- 20 years: ~$${Math.round(invest*12*20*2.6).toLocaleString()}\n\nTime in the market consistently outperforms timing the market.`;
  }

  if (/debt|credit card|owe|interest/.test(msg))
    return `Debt management is one of the highest-leverage moves you can make.\n\n**Avalanche method** (minimizes total interest paid):\n1. List all debts by interest rate, highest first\n2. Pay minimums on all, direct extra cash at the highest-rate debt\n3. Roll that payment to the next debt when one is cleared\n\nWith $${saved.toLocaleString()}/mo saved, you have strong capacity to accelerate payoff. An extra $200/mo on a $5,000 balance at 20% APR eliminates it roughly 2 years sooner.`;

  if (/budget|plan|financ|advice|tip|help|suggest|recommend/.test(msg))
    return `Based on your profile — $${income.toLocaleString()}/mo income, ${savedPct}% savings rate:\n\n**Next 30 days:**\n- Open a dedicated high-yield savings account\n- Automate a transfer of $${Math.round(saved*0.7).toLocaleString()} on each payday\n- Track all discretionary spending for one week\n\n**Next 90 days:**\n- Build $${(totalExp*2).toLocaleString()} in an emergency buffer\n- Audit and cancel unused subscriptions\n\nWhat specific goal do you want to focus on first?`;

  const fallbacks = [
    `Based on your budget — $${income.toLocaleString()}/mo income, ${savedPct}% savings rate — you are well-positioned financially. I can help with savings strategy, expense reduction, investing basics, or debt management. What is on your mind?`,
    `Based on your budget — $${income.toLocaleString()}/mo income, ${savedPct}% savings rate — you are well-positioned financially. I can help with savings strategy, expense reduction, investing basics, or debt management. What is on your mind?`,
    `At a ${savedPct}% savings rate, your next move is building a buffer so that no unexpected expense derails your progress. Would you like me to calculate how long that would take at your current pace?`,
    `Your fundamentals are strong. The gap between where you are and financial security is mostly consistency. What is the one financial goal you most want to reach in the next six months?`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

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
  active: Screen; go: (s: Screen) => void; username: string; onLogout: ()=>void; onClose?: ()=>void;
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
            <p className="text-[10px]" style={{ color:"rgba(255,255,255,0.4)" }}>Score 67/100</p>
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

function AppLayout({ screen, go, username, budget, onBudgetChange, decisions, onDecisionsChange, onLogout }: {
  screen: Screen; go: (s: Screen) => void; username: string;
  budget: BudgetData; onBudgetChange: (b: BudgetData) => void;
  decisions: AnalyzedDecision[]; onDecisionsChange: (d: AnalyzedDecision[]) => void;
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
          {screen === "dashboard" && <DashboardView go={go} budget={budget} username={username} />}
          {screen === "budget"    && <BudgetView budget={budget} onChange={onBudgetChange} go={go} />}
          {screen === "chat"      && <ChatView username={username} budget={budget} />}
          {screen === "history"   && <HistoryView />}
          {screen === "scores"    && <ScoresView budget={budget} decisions={decisions} onDecisionsChange={onDecisionsChange} username={username} />}
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
              Welcome to eZBreZ 👋
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

// ═════════════════════════════════════════════════════════════════════════════
// HISTORY (original monthly spending view)
// ═════════════════════════════════════════════════════════════════════════════
const MONTHS = ["July 2026","June 2026","May 2026"];
const MONTH_DATA: Record<string,{id:number;label:string;pct:number;amount:string;color:string}[]> = {
  "July 2026": [
    { id:1, label:"Unspent",     pct:70, amount:"$3,640", color:P.emerald },
    { id:2, label:"Food",        pct:22, amount:"$1,144", color:"#C0574A" },
    { id:3, label:"Car Loan",    pct:5,  amount:"$260",   color:"#D4A21A" },
    { id:4, label:"Misc",        pct:3,  amount:"$156",   color:P.teal    },
  ],
  "June 2026": [
    { id:1, label:"Personal",    pct:40, amount:"$1,840", color:P.teal    },
    { id:2, label:"Miscellaneous",pct:80,amount:"$3,680", color:"#C0574A" },
    { id:3, label:"Car",         pct:20, amount:"$920",   color:"#D4A21A" },
    { id:4, label:"Misc",        pct:96, amount:"$4,416", color:P.navy    },
  ],
  "May 2026": [
    { id:1, label:"Unspent",     pct:65, amount:"$3,380", color:P.emerald },
    { id:2, label:"Food",        pct:25, amount:"$1,300", color:"#C0574A" },
    { id:3, label:"Car Loan",    pct:7,  amount:"$364",   color:"#D4A21A" },
    { id:4, label:"Utilities",   pct:3,  amount:"$156",   color:P.teal    },
  ],
};

function HistoryView() {
  const [activeMonth, setActiveMonth] = useState("July 2026");
  const data = MONTH_DATA[activeMonth];
  return (
    <div className="px-6 py-7 max-w-2xl mx-auto flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>Budget History</h1>
        <p className="text-sm mt-1" style={{ fontFamily:"'DM Sans',sans-serif", color:"#6B9AA8" }}>Monthly spending breakdown by category</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {MONTHS.map(m=>(
          <Btn key={m} sound="click" onClick={()=>setActiveMonth(m)}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-105"
            style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background: activeMonth===m ? `linear-gradient(135deg,${P.navy},${P.teal})` : "#fff",
              color: activeMonth===m ? "#fff" : P.navy,
              border: activeMonth===m ? "none" : "1px solid rgba(34,87,122,0.15)",
            }}>{m}</Btn>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {data.map(item=>(
          <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm" style={{ border:"1px solid rgba(34,87,122,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ background:item.color }}/>
                <span className="text-sm font-semibold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ fontFamily:"'DM Sans',sans-serif", color:"#9CB8C8" }}>{item.amount}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background:`${item.color}18`, color:item.color }}>{item.pct}%</span>
              </div>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background:"#EEF9F4" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${item.pct}%`, background:`linear-gradient(90deg,${item.color}CC,${item.color})` }}/>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-6" style={{ background:`linear-gradient(135deg,${P.navy} 0%,${P.teal} 100%)` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              eZBrez Score — {activeMonth}
            </p>
            <p className="text-white text-3xl font-bold mt-1" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>67 / 100</p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:"rgba(255,255,255,0.12)" }}>
            <Star size={24} style={{ color:P.mint }}/>
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full" style={{ width:"67%", background:P.mint }}/>
        </div>
        <p className="text-white/60 text-xs mt-2" style={{ fontFamily:"'DM Sans',sans-serif" }}>Good standing — +3 pts from last month</p>
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

function ScoresView({ budget, decisions, onDecisionsChange, username }: {
  budget: BudgetData; decisions: AnalyzedDecision[];
  onDecisionsChange: (d: AnalyzedDecision[]) => void; username: string;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [latest, setLatest] = useState<AnalyzedDecision|null>(null);
  const uid = useRef(decisions.length + 1);

  const analyze = () => {
    if (!description.trim()) return;
    playSound("confirm");
    setAnalyzing(true);
    setTimeout(() => {
      const result = scoreDecision(description, parseFloat(amount)||0, budget);
      const decision: AnalyzedDecision = {
        id: uid.current++,
        description: description.trim(),
        amount: parseFloat(amount)||0,
        result,
        date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      };
      const updated = [decision, ...decisions].slice(0, 20);
      onDecisionsChange(updated);
      setLatest(decision);
      setDescription("");
      setAmount("");
      setAnalyzing(false);
    }, 1000 + Math.random() * 800);
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
                Latest Analysis — {latest.date}
              </p>
              <p className="text-base font-bold" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>
                {latest.description.length > 80 ? latest.description.slice(0,80)+"..." : latest.description}
              </p>
              {latest.amount > 0 && (
                <p className="text-sm font-semibold mt-1" style={{ color:P.teal, fontFamily:"'DM Sans',sans-serif" }}>
                  Amount: ${latest.amount.toLocaleString()}
                </p>
              )}
            </div>
            <ScoreGauge score={latest.result.score} />
          </div>

          <p className="text-sm leading-relaxed" style={{ fontFamily:"'DM Sans',sans-serif", color:"#4A7080" }}>
            {latest.result.summary}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background:"rgba(87,204,153,0.06)", border:"1px solid rgba(87,204,153,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color:P.emerald, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <CheckCircle size={13}/> Pros
              </p>
              <ul className="flex flex-col gap-2">
                {latest.result.pros.map((pro,i)=>(
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed"
                    style={{ fontFamily:"'DM Sans',sans-serif", color:P.dark }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background:P.emerald }}/>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background:"rgba(192,87,74,0.06)", border:"1px solid rgba(192,87,74,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color:"#C0574A", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <XCircle size={13}/> Cons
              </p>
              <ul className="flex flex-col gap-2">
                {latest.result.cons.map((con,i)=>(
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed"
                    style={{ fontFamily:"'DM Sans',sans-serif", color:P.dark }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background:"#C0574A" }}/>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Past decisions */}
      {decisions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:"#9CB8C8" }}>
            Past Analyses
          </h2>
          {decisions.map(d=>{
            const color =
              d.result.score >= 82 ? P.emerald :
              d.result.score >= 67 ? P.teal :
              d.result.score >= 50 ? "#D4A21A" :
              d.result.score >= 33 ? "#E07B30" : "#C0574A";
            return (
              <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4"
                style={{ border:"1px solid rgba(34,87,122,0.07)" }}>
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                  style={{ background:`${color}15` }}>
                  <span className="text-xl font-black" style={{ color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{d.result.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:P.navy }}>
                    {d.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {d.amount > 0 && <span className="text-xs font-medium" style={{ color:P.teal, fontFamily:"'DM Sans',sans-serif" }}>${d.amount.toLocaleString()}</span>}
                    <span className="text-xs" style={{ color:"#9CB8C8", fontFamily:"'DM Sans',sans-serif" }}>{d.date}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background:`${color}15`, color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {d.result.score >= 82 ? "Excellent" : d.result.score >= 67 ? "Good" : d.result.score >= 50 ? "Moderate" : d.result.score >= 33 ? "Risky" : "Avoid"}
                </span>
              </div>
            );
          })}
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
  const [decisions, setDecisions] = useState<AnalyzedDecision[]>([]);

  const go = (s: Screen) => { playSound("click"); setScreen(s); };

  const handleLogin = (uname: string, b: BudgetData, d: AnalyzedDecision[]) => {
    setUsername(uname); setBudget(b); setDecisions(d); go("dashboard");
  };
  const handleLogout = () => { setUsername(""); setBudget(DEFAULT_BUDGET); setDecisions([]); go("login"); };
  const handleBudgetChange = (b: BudgetData) => { setBudget(b); if (username) LS.saveBudget(username, b); };
  const handleDecisionsChange = (d: AnalyzedDecision[]) => { setDecisions(d); if (username) LS.saveDecisions(username, d); };

  return (
    <div className="size-full" style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {AUTH_SCREENS.includes(screen)
        ? <AuthLayout screen={screen} go={go} onLogin={handleLogin} />
        : <AppLayout
            screen={screen} go={go} username={username}
            budget={budget} onBudgetChange={handleBudgetChange}
            decisions={decisions} onDecisionsChange={handleDecisionsChange}
            onLogout={handleLogout}
          />}
    </div>
  );
}
