"use client";

import { useState } from "react";
import { Shield, Activity, Scale, Users, ExternalLink, CheckCircle2 } from "lucide-react";

interface TaskRow {
  taskId: string;
  agent: string;
  agentId: string;
  logRootHash: string;
  block: number;
  txHash: string;
  timestamp: number;
}

// Demo data for showcase
const DEMO_TASKS: TaskRow[] = [
  {
    taskId: "0x7a3b...e4f1",
    agent: "0x1234...5678",
    agentId: "0xabcd...ef01",
    logRootHash: "0x9f8e...2a3b",
    block: 1847523,
    txHash: "0xdef1...2345",
    timestamp: Date.now() - 30000,
  },
  {
    taskId: "0x2c4d...8a9b",
    agent: "0x5678...9abc",
    agentId: "0x1234...5678",
    logRootHash: "0x3d4e...5f6a",
    block: 1847519,
    txHash: "0xabc1...def2",
    timestamp: Date.now() - 120000,
  },
  {
    taskId: "0x6e7f...0b1c",
    agent: "0x9abc...def0",
    agentId: "0xef01...2345",
    logRootHash: "0x8a9b...0c1d",
    block: 1847515,
    txHash: "0x5678...9abc",
    timestamp: Date.now() - 300000,
  },
];

export default function HomePage() {
  const [tasks] = useState<TaskRow[]>(DEMO_TASKS);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">AgentCourt</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              0G Mainnet
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <a href="/" className="text-slate-100">Dashboard</a>
            <a href="/court" className="hover:text-slate-200">Court</a>
            <a href="/agents" className="hover:text-slate-200">Agents</a>
            <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition">
              Connect Wallet
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Activity className="w-5 h-5" />} label="Tasks Anchored" value="1,247" change="+23 today" />
          <StatCard icon={<Shield className="w-5 h-5" />} label="TEE Verified" value="1,247" change="100%" />
          <StatCard icon={<Scale className="w-5 h-5" />} label="Disputes Resolved" value="18" change="94% success" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Active Agents" value="42" change="+5 this week" />
        </div>

        {/* Live Stream */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Live Execution Stream</h2>
              <p className="text-slate-400 text-sm mt-1">Every TEE-attested AI agent inference, anchored on 0G Chain in real time.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400">Live</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Task ID</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Log Root Hash</th>
                  <th className="px-4 py-3 font-medium">Block</th>
                  <th className="px-4 py-3 font-medium">TEE Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs">{t.taskId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.agent}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.logRootHash}</td>
                    <td className="px-4 py-3 text-slate-400">{t.block.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/proof/${t.taskId}`} className="text-cyan-400 hover:underline inline-flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-8">
          <h3 className="text-lg font-semibold mb-4">0G Integration Architecture</h3>
          <div className="grid grid-cols-5 gap-4">
            <IntegrationCard name="0G Compute" desc="TeeML Sealed Inference" status="active" />
            <IntegrationCard name="0G Storage KV" desc="Fast Index Layer" status="active" />
            <IntegrationCard name="0G Storage Log" desc="Permanent Archive" status="active" />
            <IntegrationCard name="0G Chain" desc="L1 Anchor + Arbitration" status="active" />
            <IntegrationCard name="Agent ID" desc="Identity + Reputation" status="active" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-slate-500">
          <span>AgentCourt - The Legal Infrastructure for AI Agent Economy</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/0xCaptain888/agentcourt" className="hover:text-slate-300">GitHub</a>
            <a href="https://chainscan.0g.ai" className="hover:text-slate-300">0G Explorer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-emerald-400 mt-1">{change}</div>
    </div>
  );
}

function IntegrationCard({ name, desc, status }: { name: string; desc: string; status: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 mx-auto mb-2 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="font-medium text-sm">{name}</div>
      <div className="text-xs text-slate-400 mt-1">{desc}</div>
    </div>
  );
}
