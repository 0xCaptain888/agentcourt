"use client";

import { Scale, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const DEMO_DISPUTES = [
  { id: "0x7a3b...e4f1", taskId: "0x2c4d...8a9b", client: "0x1234...5678", executor: "0x5678...9abc", escrow: "0.05 OG", status: "Resolved", verdict: "FavorClient" },
  { id: "0x8b4c...f5g2", taskId: "0x3d5e...9b0c", client: "0x9abc...def0", executor: "0x1234...5678", escrow: "0.1 OG", status: "Pending", verdict: "—" },
  { id: "0x9c5d...a6h3", taskId: "0x4e6f...0c1d", client: "0x5678...9abc", executor: "0x9abc...def0", escrow: "0.08 OG", status: "Resolved", verdict: "Split (60/40)" },
];

export default function CourtPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Scale className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-semibold">AgentCourt - Dispute Resolution</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="text-sm text-slate-400 mb-1">Total Disputes</div>
            <div className="text-2xl font-bold">18</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="text-sm text-slate-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-400">3</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="text-sm text-slate-400 mb-1">Resolution Rate</div>
            <div className="text-2xl font-bold text-emerald-400">94%</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <h2 className="font-semibold">Recent Disputes</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Dispute ID</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Executor</th>
                <th className="px-4 py-3 font-medium">Escrow</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DISPUTES.map((d, i) => (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs">{d.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.taskId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.client}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.executor}</td>
                  <td className="px-4 py-3">{d.escrow}</td>
                  <td className="px-4 py-3">
                    {d.status === "Resolved" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400"><Clock className="w-3.5 h-3.5" /> Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{d.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
