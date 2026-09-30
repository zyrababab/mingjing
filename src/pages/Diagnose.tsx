import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  ScanSearch, ListOrdered, FlaskConical, CircleDollarSign, Quote, Crosshair, ChevronDown, Sparkles,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DIMS } from '@/types';
import type { DimKey } from '@/types';
import { MODELS } from '@/engine/engine';
import type { EngineOutput } from '@/engine/engine';
import {
  ATTRIBUTION_METHOD, attributeSentence, simulateAnswer,
  calibratedAlpha, sandboxHarm, cheapestPlan, INTERVENTIONS, SANDBOX_THRESHOLD,
} from '@/engine/lab';
import type { Attribution } from '@/engine/lab';

export default function Diagnose({ engine }: { engine: EngineOutput }) {
  // ── ① 偏见归因 ──
  const [attrModelId, setAttrModelId] = useState('yi'); // 默认选高偏见模型，命中样本多
  const [mode, setMode] = useState<'sample' | 'custom'>('sample');
  const [dimFilter, setDimFilter] = useState<DimKey | 'all'>('all');
  const [hitId, setHitId] = useState<string>('');
  const [customQ, setCustomQ] = useState('');
  const [customAt, setCustomAt] = useState<Attribution | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);

  // 从引擎真实命中样本中收集可归因对象
  const hits = useMemo(() => {
    const rs = engine.probeResults[attrModelId] ?? [];
    return rs.filter(
      (r) =>
        (r.kind === 'choice' ? r.picked === 'stereotype' : r.isStereotyped)
        && (dimFilter === 'all' || r.probe.dim === dimFilter),
    );
  }, [engine, attrModelId, dimFilter]);

  const selectedHit = hits.find((r) => r.probe.id === hitId) ?? hits[0];

  const sampleAt = useMemo<Attribution | null>(
    () =>
      selectedHit
        ? attributeSentence(
            `${selectedHit.probe.question}｜${selectedHit.answerText}`,
            `${attrModelId}:${selectedHit.probe.id}`,
          )
        : null,
    [selectedHit, attrModelId],
  );

  const shown: Attribution | null = mode === 'sample' ? sampleAt : customAt;

  const runCustom = () => {
    if (!customQ.trim()) return;
    const answer = simulateAnswer(customQ.trim(), attrModelId);
    setCustomAt(attributeSentence(`${customQ.trim()}｜${answer}`, `${attrModelId}@custom:${customQ.trim().length}`));
  };

  const wordOption = shown
    ? {
        tooltip: {},
        grid: { left: 80, right: 40, top: 10, bottom: 30 },
        xAxis: { type: 'value', max: 100, name: '翻转率(%)' },
        yAxis: { type: 'category', inverse: true, data: shown.words.map((w) => w.word) },
        series: [{
          type: 'bar', barWidth: 24,
          data: shown.words.map((w) => ({
            value: w.rate,
            itemStyle: { color: w.word === shown.headWord ? '#ef4444' : '#94a3b8' },
          })),
          label: { show: true, position: 'right', formatter: '{c}%' },
        }],
      }
    : null;

  // ── ② 因果沙盘 ──
  const [modelId, setModelId] = useState(MODELS[1].id);
  const [dataBias, setDataBias] = useState(45);
  const [alpha, setAlpha] = useState(1.8);
  const [filter, setFilter] = useState(0);

  const calib = calibratedAlpha(engine, modelId);
  const harmNow = sandboxHarm(dataBias, alpha, filter);
  const plan = useMemo(() => cheapestPlan(dataBias, alpha), [dataBias, alpha]);

  const harmLine = useMemo(() => {
    const xs: number[] = [];
    for (let f = 0; f <= 95; f += 5) xs.push(f);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 45, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: xs.map((x) => `${x}%`), name: '输出过滤强度' },
      yAxis: { type: 'value', max: 100, name: '下游危害' },
      series: [
        {
          type: 'line', smooth: true, data: xs.map((f) => sandboxHarm(dataBias, alpha, f)),
          itemStyle: { color: '#6366f1' }, areaStyle: { opacity: 0.1 },
          markLine: {
            silent: true,
            data: [{ yAxis: SANDBOX_THRESHOLD, label: { formatter: `达标线 ${SANDBOX_THRESHOLD}` } }],
            lineStyle: { color: '#10b981', type: 'dashed' },
          },
        },
      ],
    };
  }, [dataBias, alpha]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crosshair className="h-6 w-6 text-indigo-600" />
          偏见诊断
        </h1>
        <p className="text-muted-foreground mt-1">
          检测出偏见之后，先诊断清楚再治理：① 归因回答「错在哪个词」→ ② 沙盘回答「会闯多大的祸、怎么治最划算」
        </p>
      </div>

      {/* ── ① 偏见归因 ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">1</span>
          <h2 className="text-lg font-semibold flex items-center gap-2"><ScanSearch className="h-4 w-4 text-indigo-600" />偏见归因 · 给偏见“找肇事词”</h2>
          <span className="text-sm text-muted-foreground">词级遮挡，不依赖梯度，闭源 API 模型同样可归因</span>
        </div>

        <Card>
          <Collapsible open={methodOpen} onOpenChange={setMethodOpen}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><ListOrdered className="h-5 w-5 text-indigo-500" />方法流程</CardTitle>
                    <CardDescription>点击{methodOpen ? '收起' : '展开'}四步归因流程</CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${methodOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid md:grid-cols-4 gap-3">
                {ATTRIBUTION_METHOD.map((s, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <Badge className="bg-indigo-600 hover:bg-indigo-600 mb-2">步骤 {i + 1}</Badge>
                    <p className="text-muted-foreground">{s}</p>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>选择待归因的输出</CardTitle>
            <CardDescription>
              来源一：探针命中样本（随模型与维度动态生成）；来源二：输入你自己的问题，系统模拟模型作答后归因
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">受测模型</label>
                <Select value={attrModelId} onValueChange={(v) => { setAttrModelId(v); setHitId(''); setCustomAt(null); }}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as 'sample' | 'custom')}>
              <TabsList>
                <TabsTrigger value="sample">探针命中样本</TabsTrigger>
                <TabsTrigger value="custom">自定义输入</TabsTrigger>
              </TabsList>

              <TabsContent value="sample" className="space-y-4 pt-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">偏见维度</label>
                    <Select value={dimFilter} onValueChange={(v) => { setDimFilter(v as DimKey | 'all'); setHitId(''); }}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部维度</SelectItem>
                        {DIMS.map((d) => <SelectItem key={d.key} value={d.key}>【{d.category}】{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1 min-w-[280px]">
                    <label className="text-sm font-medium">命中样本（共 {hits.length} 条{hits.length > 80 ? '，显示前 80 条' : ''}）</label>
                    <Select value={selectedHit?.probe.id ?? ''} onValueChange={setHitId} disabled={!hits.length}>
                      <SelectTrigger><SelectValue placeholder={hits.length ? '选择样本' : '当前筛选下无命中样本'} /></SelectTrigger>
                      <SelectContent>
                        {hits.slice(0, 80).map((r) => (
                          <SelectItem key={r.probe.id} value={r.probe.id}>
                            [{DIMS.find((d) => d.key === r.probe.dim)?.label}] {r.probe.question.slice(0, 30)}…
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">输入你想问模型的问题</label>
                  <Textarea
                    value={customQ}
                    onChange={(e) => setCustomQ(e.target.value)}
                    placeholder="例如：招聘销售经理，35岁的大专学历女性和28岁的985学历男性，谁更合适？"
                    className="min-h-[80px]"
                  />
                </div>
                <Button onClick={runCustom} disabled={!customQ.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成模拟回答并归因
                </Button>
                {customAt && (
                  <p className="text-xs text-muted-foreground">
                    模拟回答：{customAt.sentence.split('｜')[1]}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {shown ? (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>归因原文（首责词高亮）</CardTitle>
                <CardDescription>
                  [{DIMS.find((d) => d.key === shown.dim)?.label}] 样本 {shown.probeId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 leading-loose text-[15px]">
                  {shown.sentence.split(shown.headWord).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && shown.headWord !== '—' && (
                        <span className="bg-red-100 text-red-700 font-bold px-1 rounded">{shown.headWord}</span>
                      )}
                    </span>
                  ))}
                </div>

                <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-4">
                  <ScanSearch className="h-8 w-8 text-red-500 shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">首责词（屏蔽后判定翻转率最高）</div>
                    <div className="text-2xl font-bold text-red-600">
                      「{shown.headWord}」<span className="text-base font-medium ml-2">翻转率 {shown.flipRate}%</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{shown.note}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>候选责任词翻转率分布</CardTitle>
                <CardDescription>翻转率越高，该词对偏见判定的贡献越大</CardDescription>
              </CardHeader>
              <CardContent>
                {wordOption && <ReactECharts option={wordOption} style={{ height: 280 }} />}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mt-2">
                  治理含义：针对首责词做提示词防御（如要求模型忽略性别/年龄标签）或输出过滤，比“整体加固”更省力——归因把治理从“霰弹”变成了“狙击”。
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              当前筛选条件下没有命中的偏见样本——试试换一个偏见参数更高的模型，或把维度筛选改为「全部维度」。
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── ② 因果沙盘 ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">2</span>
          <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4 text-indigo-600" />伦理因果沙盘 · 偏见会闯多大的祸</h2>
          <span className="text-sm text-muted-foreground">α 由实测基线反推校准，拖滑块实时重算下游危害</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>沙盘参数</CardTitle>
              <CardDescription>
                基准模型：{MODELS.find((m) => m.id === modelId)?.name} · 实测反推 α₀ = {calib}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {[
                { label: `数据层偏见强度（${dataBias} 点）`, value: dataBias, set: setDataBias, min: 10, max: 90 },
                { label: `模型放大系数 α（${alpha.toFixed(1)}）`, value: alpha, set: setAlpha, min: 1, max: 2.5, step: 0.1 },
                { label: `输出层过滤强度（${filter}%）`, value: filter, set: setFilter, min: 0, max: 95 },
              ].map((s) => (
                <div key={s.label} className="space-y-2">
                  <label className="text-sm font-medium">{s.label}</label>
                  <Slider
                    value={[s.value]}
                    min={s.min} max={s.max} step={s.step ?? 1}
                    onValueChange={(v) => s.set(v[0])}
                  />
                </div>
              ))}
              <div className={`rounded-lg p-4 text-center ${harmNow <= SANDBOX_THRESHOLD ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`text-4xl font-bold ${harmNow <= SANDBOX_THRESHOLD ? 'text-emerald-600' : 'text-red-600'}`}>{harmNow}</div>
                <div className="text-sm text-muted-foreground">当前下游危害（达标线 {SANDBOX_THRESHOLD}）</div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>危害随输出过滤强度的变化</CardTitle>
              <CardDescription>危害 = 数据偏见 × α ×（1 − 过滤）+ 残余底噪</CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts option={harmLine} style={{ height: 300 }} />
              <div className="grid md:grid-cols-3 gap-3 mt-2">
                {INTERVENTIONS.map((it) => (
                  <div key={it.key} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CircleDollarSign className="h-4 w-4 text-indigo-500" />{it.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{it.unit} · 成本 {it.cost}</div>
                    <p className="text-xs text-muted-foreground mt-1">{it.effect}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-indigo-500" />最省力达标方案（贪心求解，总成本 {plan.totalCost} 点）</CardTitle>
            <CardDescription>
              {plan.reachable
                ? `当前参数下危害可达标，共需 ${plan.actions.length} 步干预`
                : '当前参数下三种干预均无法达标，需回到数据源头重新设计'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Badge variant="secondary">{i + 1}</Badge>
                <span className="font-medium w-28">{a.name}</span>
                <span className="text-muted-foreground flex-1">{a.detail}</span>
                <span className="text-xs text-muted-foreground">成本 +{a.cost}</span>
              </div>
            ))}
            {plan.allFilter && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
                <Quote className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  判读：当前参数下最省力方案全靠输出过滤——这属于<strong>治标不治本</strong>：过滤规则拦得住已知的偏见形式，
                  却拦不住进化实验室里那些没见过的新形式。要真正达标，必须同时压数据层与模型层。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
