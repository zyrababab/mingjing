import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Radar, Bug, FileSearch, ShieldCheck, Landmark, GraduationCap, Building2 } from 'lucide-react';
import { DIMS, DIM_CATEGORIES } from '@/types';
import { MODELS, dimScore, overallScore, stereotypeRate, hallucinationRate } from '@/engine/engine';
import type { EngineOutput } from '@/engine/engine';
import { PROBES, FACT_QA } from '@/data/probes';

export default function Overview({ engine }: { engine: EngineOutput }) {
  const avgBias = Math.round(MODELS.reduce((s, m) => s + overallScore(engine.probeResults[m.id]), 0) / MODELS.length);
  const avgHallu = Math.round(MODELS.reduce((s, m) => s + hallucinationRate(engine.factResults[m.id]), 0) / MODELS.length);
  const worstModel = [...MODELS].sort((a, b) => overallScore(engine.probeResults[b.id]) - overallScore(engine.probeResults[a.id]))[0];

  const kpis = [
    { icon: Gauge, label: '受测模型', value: String(MODELS.length), sub: '在线 API ×8 · 本地离线 ×4' },
    { icon: Radar, label: '偏见探针', value: String(PROBES.length), sub: '「镜鉴」中文探针集 v1.0' },
    { icon: FileSearch, label: '平均综合偏见分', value: String(avgBias), sub: `最高：${worstModel.name}` },
    { icon: Bug, label: '平均幻觉率', value: `${avgHallu}%`, sub: `${FACT_QA.length} 条事实问答比对` },
  ];

  const compareOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['综合偏见分', '刻板认同率', '幻觉率'], bottom: 0 },
    grid: { left: 50, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'category', data: MODELS.map((m) => m.name) },
    yAxis: { type: 'value', max: 100 },
    series: [
      { name: '综合偏见分', type: 'bar', data: MODELS.map((m) => overallScore(engine.probeResults[m.id])), itemStyle: { color: '#6366f1' } },
      { name: '刻板认同率', type: 'bar', data: MODELS.map((m) => stereotypeRate(engine.probeResults[m.id])), itemStyle: { color: '#f59e0b' } },
      { name: '幻觉率', type: 'bar', data: MODELS.map((m) => hallucinationRate(engine.factResults[m.id])), itemStyle: { color: '#ef4444' } },
    ],
  };

  const radarOption = {
    tooltip: {},
    legend: { bottom: 0, data: MODELS.map((m) => m.name) },
    radar: {
      indicator: DIM_CATEGORIES.map((c) => ({ name: c, max: 100 })),
      radius: '60%',
    },
    series: [{
      type: 'radar',
      data: MODELS.map((m) => ({
        name: m.name,
        value: DIM_CATEGORIES.map((c) => {
          const ds = DIMS.filter((d) => d.category === c).map((d) => dimScore(engine.probeResults[m.id], d.key));
          return Math.round(ds.reduce((s, x) => s + x, 0) / ds.length);
        }),
      })),
    }],
  };

  const apps = [
    { icon: Building2, title: '企业大模型准入审计', desc: '企业在引入大模型前，先用明镜做偏见与幻觉体检，作为采购与上线的合规门槛。' },
    { icon: Landmark, title: '公共决策算法监管', desc: '为教育、就业、信贷等公共场景的算法备案提供第三方偏见评估证据。' },
    { icon: ShieldCheck, title: '涉密/内网环境自检', desc: '完全离线模式（Ollama 本地部署），敏感场景不出内网即可评估模型安全性。' },
    { icon: GraduationCap, title: 'AI 伦理教学实训', desc: '把抽象的“算法歧视”变成可交互实验：学生亲自让模型“说错话”再纠正它。' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">总览</h1>
        <p className="text-muted-foreground mt-1">
          偏见检测 · 画像 · 幻觉检测 · 去偏治理 · 审计报告 一体化平台（演示模式：内置确定性模拟引擎，可无缝切换真实模型）
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
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
            <CardTitle>模型横向对比</CardTitle>
            <CardDescription>综合偏见分 / 刻板认同率 / 幻觉率（0–100）</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts option={compareOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>四类偏见画像雷达</CardTitle>
            <CardDescription>按一级分类聚合：群体 / 思维行为 / 表征语言 / 元偏见（维度级明细见「模型全面体检」页）</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts option={radarOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>平台能应用在哪里</CardTitle>
          <CardDescription>「明镜」的四类典型应用场景</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {apps.map((a) => (
            <div key={a.title} className="flex gap-4 p-4 rounded-lg border bg-card">
              <a.icon className="h-8 w-8 text-indigo-500 shrink-0 mt-1" />
              <div>
                <div className="font-semibold flex items-center gap-2">{a.title} <Badge variant="secondary">应用场景</Badge></div>
                <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
