import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2 } from 'lucide-react';
import { DIMS } from '@/types';
import type { Strategy } from '@/types';
import { PROBES } from '@/data/probes';
import { MODELS, runDebias, STRATEGY_LABEL } from '@/engine/engine';

const STRAT_COLORS: Record<Strategy, string> = { baseline: '#ef4444', ethical: '#f59e0b', rag: '#10b981' };

export default function DebiasLab() {
  const [modelId, setModelId] = useState(MODELS[1].id); // 默认选偏见最高的本地模型
  const [probeId, setProbeId] = useState(PROBES[2].id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(() => runDebias(MODELS[1].id, PROBES[2]));

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setResult(runDebias(modelId, PROBES.find((p) => p.id === probeId)!));
      setRunning(false);
    }, 800);
  };

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: result.runs.map((r) => STRATEGY_LABEL[r.strategy]) },
    yAxis: { type: 'value', max: 100, name: '偏见分' },
    series: [{
      type: 'bar', barWidth: 70,
      data: result.runs.map((r) => ({ value: r.biasScore, itemStyle: { color: STRAT_COLORS[r.strategy] } })),
      label: { show: true, position: 'top' },
    }],
  }), [result]);

  const eff = (s: Strategy) =>
    result.baselineScore > 0
      ? Math.round(((result.baselineScore - result.runs.find((r) => r.strategy === s)!.biasScore) / result.baselineScore) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">去偏工作台</h1>
        <p className="text-muted-foreground mt-1">
          同一探针、三种生成策略并行对比：普通提示词（基线） vs 伦理系统提示词 vs RAG 事实纠偏
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>实验配置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">受测模型</label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[280px]">
            <label className="text-sm font-medium">探针问题</label>
            <Select value={probeId} onValueChange={setProbeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROBES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{DIMS.find((d) => d.key === p.dim)?.label}] {p.question.slice(0, 32)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={running} className="bg-indigo-600 hover:bg-indigo-700">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            运行对比实验
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>偏见分对比</CardTitle>
            <CardDescription>
              去偏有效率：伦理提示词 {eff('ethical')}% · RAG 纠偏 {eff('rag')}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts option={chartOption} style={{ height: 300 }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>三策略回答原文</CardTitle>
            <CardDescription>{result.probe.question}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.runs.map((r) => (
              <div key={r.strategy} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge style={{ background: STRAT_COLORS[r.strategy] }}>{STRATEGY_LABEL[r.strategy]}</Badge>
                  <span className="text-xs text-muted-foreground">偏见分 {r.biasScore}</span>
                  {r.refused && <Badge variant="outline" className="text-amber-600 border-amber-300">过度回避副作用</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{r.answerText}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
