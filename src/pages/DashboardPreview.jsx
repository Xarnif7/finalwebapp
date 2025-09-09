import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BellRing, TrendingUp, Activity, Send, ShieldAlert, Rocket, Workflow,
  PieChart as PieChartIcon, LineChart as LineChartIcon, Settings, Menu, X,
  CheckCircle2, Zap, Target, FolderGit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";

// ---------- Dummy Data (edit freely) ----------
const kpis = [
  { label: "Avg Rating (30d)", value: "4.6", delta: "+0.2" },
  { label: "Response Time", value: "1h 42m", delta: "-27m" },
  { label: "Review Velocity", value: "38/day", delta: "+12%" },
];

const actionQueue = [
  { id: 1, type: "Reply", title: "4★ review on Google (Downtown)", impact: "High", due: "2h" },
  { id: 2, type: "Escalate", title: "1★ Yelp complaint about wait time", impact: "Critical", due: "Now" },
  { id: 3, type: "Request", title: "Ask 20 recent buyers for Google reviews", impact: "Medium", due: "Today" },
  { id: 4, type: "Publish", title: "Post 5★ photo review to Website widget", impact: "Low", due: "Today" },
];

const velocitySeries = [
  { d: "M", v: 24 }, { d: "T", v: 29 }, { d: "W", v: 41 }, { d: "T", v: 37 }, { d: "F", v: 55 }, { d: "S", v: 48 }, { d: "S", v: 42 },
];

const sourceMix = [
  { name: "Google", value: 62 },
  { name: "Facebook", value: 18 },
  { name: "Yelp", value: 11 },
  { name: "Other", value: 9 },
];

const temporalBias = [
  { hour: "9a", avg: 4.2 }, { hour: "12p", avg: 4.7 }, { hour: "3p", avg: 4.5 }, { hour: "6p", avg: 4.9 }, { hour: "9p", avg: 4.1 },
];

const competitorHoles = [
  { topic: "Wait time", theirs: 2.9, yours: 4.6 },
  { topic: "Phone support", theirs: 3.1, yours: 4.4 },
  { topic: "Billing clarity", theirs: 3.2, yours: 4.5 },
];

const revenueFromReviews = [
  { d: "Week 1", rev: 14200 }, { d: "Week 2", rev: 17900 }, { d: "Week 3", rev: 19300 }, { d: "Week 4", rev: 21100 },
];

const playbooks = [
  { name: "1–3★ → DM + voucher", status: "On" },
  { name: "4–5★ → ask photo consent", status: "On" },
  { name: "After-hours pause (8p–8a)", status: "Off" },
];

const brandKit = [
  { id: "R-5021", quote: "Flawless service and fast check-in!", source: "Google", consent: true },
  { id: "R-4998", quote: "Staff was incredibly helpful.", source: "Facebook", consent: true },
  { id: "R-4980", quote: "Parking was tricky but resolved quickly.", source: "Yelp", consent: false },
];

// Colors for charts
const chartColors = ["#7A5FFF", "#4BC9F0", "#FDBA8C", "#94A3B8"];

// ---------- Layout Shell ----------
function Card({
  title, subtitle, icon, action, children, className
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={cn("rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5", className)}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {icon && <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center">{icon}</div>}
          <div>
            <h3 className="text-slate-900 font-semibold">{title}</h3>
            {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export default function DashboardPreview() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const trustHealth = useMemo(() => {
    const weights = { velocity: 0.35, recency: 0.25, response: 0.2, sourceMix: 0.2 };
    const score = 86;
    return { score, weights };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Glassy Topbar */}
      <header className="isolate sticky top-0 z-50 h-16 backdrop-blur-xl bg-white/40 supports-[backdrop-filter]:bg-white/30 border-b border-slate-200">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 rounded-lg hover:bg-black/5" onClick={() => setSidebarOpen(v => !v)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="font-extrabold tracking-tight">Blipp</div>
            <span className="ml-2 px-2 py-0.5 rounded bg-slate-900 text-white text-xs">Preview</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-slate-700">View Docs</Button>
            <Button size="sm" className="bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] text-white">Start Trial</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className={cn(
          "col-span-12 md:col-span-3 lg:col-span-2", sidebarOpen ? "block" : "hidden md:block"
        )}>
          <nav className="sticky top-[88px] space-y-1">
            {[
              { label: "Overview", icon: Activity },
              { label: "Inbox", icon: BellRing },
              { label: "Growth", icon: TrendingUp },
              { label: "Insights", icon: LineChartIcon },
              { label: "Competitors", icon: Target },
              { label: "Settings", icon: Settings },
            ].map(({ label, icon: I }) => (
              <a key={label} className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-white ring-1 ring-transparent hover:ring-slate-200 transition">
                <I className="h-4 w-4" /> {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <Card key={k.label} title={k.label} icon={<Zap className="h-5 w-5 text-[#7A5FFF]" />}>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{k.value}</div>
                  <span className="text-emerald-600 text-sm">{k.delta}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-12 gap-6">
            <Card
              title="Today’s Action Queue"
              subtitle="Auto-prioritized by impact"
              icon={<Workflow className="h-5 w-5 text-[#4BC9F0]" />}
              action={<Button variant="outline" size="sm">Open Inbox</Button>}
              className="col-span-12 lg:col-span-6"
            >
              <ul className="divide-y divide-slate-100">
                {actionQueue.map(a => (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.type} • Impact: {a.impact}</p>
                    </div>
                    <Button size="sm" className="bg-slate-900 text-white">Do in {a.due}</Button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="Trust Health Score"
              subtitle="Explainable composite of 4 signals"
              icon={<ShieldAlert className="h-5 w-5 text-[#7A5FFF]" />}
              className="col-span-12 lg:col-span-6"
            >
              <div className="flex items-center justify-between">
                <div className="text-5xl font-extrabold">{trustHealth.score}</div>
                <ul className="text-sm text-slate-600">
                  <li>Velocity • weight {Math.round(trustHealth.weights.velocity*100)}%</li>
                  <li>Recency • weight {Math.round(trustHealth.weights.recency*100)}%</li>
                  <li>Response • weight {Math.round(trustHealth.weights.response*100)}%</li>
                  <li>Source Mix • weight {Math.round(trustHealth.weights.sourceMix*100)}%</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-6">
            <Card
              title="Review Velocity (7d)"
              icon={<LineChartIcon className="h-5 w-5 text-[#7A5FFF]" />}
              className="col-span-12 lg:col-span-7"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocitySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="d" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="v" stroke={chartColors[0]} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Source Mix Optimizer"
              subtitle="Where to request next"
              icon={<PieChartIcon className="h-5 w-5 text-[#4BC9F0]" />}
              className="col-span-12 lg:col-span-5"
              action={<Button variant="outline" size="sm">Adjust Weights</Button>}
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                      {sourceMix.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-12 gap-6">
            <Card
              title="Temporal Bias (send-time sweet spots)"
              icon={<ClockIcon />}
              className="col-span-12 lg:col-span-6"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={temporalBias}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="hour" stroke="#94A3B8" />
                    <YAxis domain={[3.5, 5]} stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="avg" fill={chartColors[1]} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Competitor Sentiment Holes"
              subtitle="Exploit gaps with targeted copy"
              icon={<Target className="h-5 w-5 text-[#7A5FFF]" />}
              className="col-span-12 lg:col-span-6"
              action={<Button variant="outline" size="sm">Generate Copy</Button>}
            >
              <div className="space-y-3">
                {competitorHoles.map(r => (
                  <div key={r.topic} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="font-medium">{r.topic}</div>
                    <div className="text-sm text-slate-600">Them {r.theirs.toFixed(1)} ★ • You {r.yours.toFixed(1)} ★</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-12 gap-6">
            <Card
              title="Revenue Attributed to Reviews"
              subtitle="Joined with orders/CRM (demo)"
              icon={<TrendingUp className="h-5 w-5 text-[#4BC9F0]" />}
              className="col-span-12 lg:col-span-7"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueFromReviews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="d" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="rev" fill={chartColors[0]} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Autopilot Playbooks"
              subtitle="Toggle review workflows"
              icon={<Rocket className="h-5 w-5 text-[#7A5FFF]" />}
              className="col-span-12 lg:col-span-5"
            >
              <ul className="space-y-2">
                {playbooks.map(p => (
                  <li key={p.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <span>{p.name}</span>
                    <Button variant={p.status === "On" ? "default" : "outline"} size="sm">
                      {p.status}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-12 gap-6">
            <Card
              title="Brand Kit (consented UGC)"
              subtitle="Drag into landing pages & widgets"
              icon={<FolderGit2 className="h-5 w-5 text-[#4BC9F0]" />}
              className="col-span-12"
              action={<Button variant="outline" size="sm">Export JSON-LD</Button>}
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brandKit.map(b => (
                  <div key={b.id} className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="text-slate-800">{b.quote}</p>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <span>{b.source}</span>
                      <span className={cn("inline-flex items-center gap-1",
                        b.consent ? "text-emerald-600" : "text-amber-600")}> 
                        <CheckCircle2 className="h-4 w-4" />
                        {b.consent ? "Consent" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between rounded-2xl bg-white ring-1 ring-slate-200 p-5">
            <div>
              <h4 className="font-semibold text-slate-900">Looks good? Wire real data next.</h4>
              <p className="text-slate-600 text-sm">Swap each card’s dataset with API calls when ready.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">View API Map</Button>
              <Button className="bg-slate-900 text-white">Connect Google</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Small helper for one icon name we used inline
function ClockIcon() { return <Activity className="h-5 w-5 text-[#4BC9F0]" />; }


