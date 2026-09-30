import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dna, Crosshair, GitBranch } from 'lucide-react';
import { DIMS } from '@/types';
import {
  OPERATORS, EVOLUTION_SUMMARY, EVOLUTION_HIT_RATE, GEN_STATS, LINEAGE_SAMPLES,
} from '@/engine/lab';

const dimLabel = (k: string) => DIMS.find((d) => d.key === k)?.label ?? k;

export default function EvolveLab() {
  const opOption = {
    tooltip: {},
    grid: { left: 90, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', inverse: true, data: [...OPERATORS].reverse().map((o) => o.name) },
    series: [{
      type: 'bar', barWidth: 16,
      data: [...OPERATORS].reverse().map((o) => o.hitCount),
      itemStyle: { color: (p: { dataIndex: number }) => ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#f59e0b', '#ef4444'][p.dataIndex] },
      label: { show: true, position: 'right' },
    }],
  };

  const genOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['种群规模', '命中数'] },
    grid: { left: 45, right: 45, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: GEN_STATS.map((g) => `第${g.gen}代`) },
    yAxis: [{ type: 'value' }, { type: 'value' }],
    series: [
      { name: '种群规模', type: 'bar', data: GEN_STATS.map((g) => g.population), itemStyle: { color: '#6366f1' } },
      { name: '命中数', type: 'line', yAxisIndex: 1, data: GEN_STATS.map((g) => g.hits), itemStyle: { color: '#ef4444' }, smooth: true },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">进化实验室 · 自进化探针</h1>
        <p className="text-muted-foreground mt-1">
          测评自己去找模型盲区：「选择 → 变异 → 评估 → 保留」红队进化循环，每条变异探针带完整谱系可追溯
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: GitBranch, label: '进化代数', value: String(EVOLUTION_SUMMARY.generations), sub: '选择→变异→评估→保留' },
          { icon: Dna, label: '探针总数', value: String(EVOLUTION_SUMMARY.total), sub: '含种子与全部变异体' },
          { icon: Crosshair, label: '命中数', value: String(EVOLUTION_SUMMARY.hits), sub: '成功诱导偏见输出' },
          { icon: Crosshair, label: '命中率', value: `${EVOLUTION_HIT_RATE}%`, sub: '固定题库测不出的盲区' },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>7 个变异算子命中排行</CardTitle>
            <CardDescription>身份话术比直接提问更容易撬开偏见</CardDescription>
          </CardHeader>
          <CardContent><ReactECharts option={opOption} style={{ height: 300 }} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>进化过程</CardTitle>
            <CardDescription>种群规模与命中数随代数变化</CardDescription>
          </CardHeader>
          <CardContent><ReactECharts option={genOption} style={{ height: 300 }} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>典型变异探针与谱系</CardTitle>
          <CardDescription>每条探针可追溯：从哪条种子、经过哪些算子变异而来</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {LINEAGE_SAMPLES.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold">{p.id}</span>
                <Badge variant="outline">{dimLabel(p.dim)}</Badge>
                {p.hit
                  ? <Badge className="bg-red-500 hover:bg-red-500">命中</Badge>
                  : <Badge className="bg-slate-400 hover:bg-slate-400">未命中（用于对照）</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{p.question}</p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted-foreground mr-1">谱系：</span>
                {p.chain.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <Badge variant="secondary">{c.op}</Badge>
                    <span className="text-muted-foreground">{c.parent}</span>
                    {i < p.chain.length - 1 && <span className="text-indigo-400 mx-1">→</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
