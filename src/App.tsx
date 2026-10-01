import { useMemo, useState } from 'react';
import {
  LayoutDashboard, FileText, ScanEye, Compass, Dna, Crosshair, Shield, Stethoscope, Database,
} from 'lucide-react';
import { runFullEngine } from '@/engine/engine';
import Overview from '@/pages/Overview';
import ModelExam from '@/pages/ModelExam';
import Diagnose from '@/pages/Diagnose';
import ReportPage from '@/pages/ReportPage';
import Advisor from '@/pages/Advisor';
import DebiasEvolveLab from '@/pages/DebiasEvolveLab';
import MilitaryApp from '@/pages/MilitaryApp';
import CorpusLab from '@/pages/CorpusLab';

const NAV = [
  { key: 'overview', label: '总览', icon: LayoutDashboard },
  { key: 'corpus', label: '爬虫语料工坊', icon: Database },
  { key: 'advisor', label: '任务选型助手', icon: Compass },
  { key: 'exam', label: '模型全面体检', icon: Stethoscope },
  { key: 'diagnose', label: '偏见诊断', icon: Crosshair },
  { key: 'debiasEvolve', label: '去偏进化实验室', icon: Dna },
  { key: 'military', label: '军事应用', icon: Shield },
  { key: 'report', label: '审计报告', icon: FileText },
];

export default function App() {
  const [page, setPage] = useState('overview');
  // 全量评测结果在启动时一次性计算（确定性引擎，结果可复现）
  const engine = useMemo(() => runFullEngine(), []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800">
          <ScanEye className="h-6 w-6 text-indigo-400" />
          <div>
            <div className="text-white font-bold leading-tight">明镜</div>
            <div className="text-[10px] text-slate-400 leading-tight">大模型偏见检测与去偏平台</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                page === n.key ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 text-[10px] text-slate-500 border-t border-slate-800">
          《大数据导论》课程大作业 · 演示模式
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {page === 'overview' && <Overview engine={engine} />}
        {page === 'advisor' && <Advisor engine={engine} />}
        {page === 'exam' && <ModelExam engine={engine} />}
        {page === 'diagnose' && <Diagnose engine={engine} />}
        {page === 'debiasEvolve' && <DebiasEvolveLab />}
        {page === 'corpus' && <CorpusLab />}
        {page === 'military' && <MilitaryApp engine={engine} />}
        {page === 'report' && <ReportPage engine={engine} />}
      </main>
    </div>
  );
}
