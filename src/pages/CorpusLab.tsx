import { useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Rss, Upload, Download, Check, X } from 'lucide-react';
import { SAMPLE_CORPUS } from '@/data/corpus';
import type { CorpusSnippet } from '@/data/corpus';
import {
  generateCandidates, importCrawlerJson, dimDistribution, sourceDistribution, exportProbesJson,
} from '@/engine/corpus';
import type { CandidateProbe } from '@/engine/corpus';
import { dimLabel } from '@/engine/advisor';
import type { DimKey } from '@/types';

const STEPS = [
  { title: '① 种子采集', desc: '爬虫按 seeds.txt 中的 URL 抓取公开新闻/资讯页面（礼貌间隔 2 秒，自定义 UA）' },
  { title: '② 正文提取', desc: '去除脚本/样式/标签，按句切分，过滤导航与广告噪声' },
  { title: '③ 偏见过滤', desc: '12 类偏见维度关键词表匹配，只保留命中偏见表达的句子' },
  { title: '④ 探针生成', desc: '套用 5 种探针模板（评判/论证/隐性默认/压力诱导/角色扮演）生成候选探针' },
];

export default function CorpusLab() {
  const [snippets, setSnippets] = useState<CorpusSnippet[]>(SAMPLE_CORPUS);
  const [selId, setSelId] = useState(SAMPLE_CORPUS[0]?.id ?? '');
  const [adopted, setAdopted] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = snippets.find((s) => s.id === selId) ?? snippets[0];
  const candidates: CandidateProbe[] = useMemo(
    () => (selected ? generateCandidates(selected) : []),
    [selected],
  );

  const dims = useMemo(() => dimDistribution(snippets), [snippets]);
  const sources = useMemo(() => sourceDistribution(snippets), [snippets]);

  const dimOption = {
    tooltip: {},
    grid: { left: 70, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', inverse: true, data: dims.map((d) => d.label) },
    series: [{ type: 'bar', barWidth: 14, data: dims.map((d) => d.value), itemStyle: { color: '#6366f1' }, label: { show: true, position: 'right' } }],
  };
  const srcOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '68%'],
      data: sources.map((s) => ({ name: s.label, value: s.value })),
      label: { fontSize: 11 },
    }],
  };

  const toggle = (id: string, kind: 'adopt' | 'reject') => {
    const a = new Set(adopted); const r = new Set(rejected);
    if (kind === 'adopt') { a.has(id) ? a.delete(id) : a.add(id); r.delete(id); }
    else { r.has(id) ? r.delete(id) : r.add(id); a.delete(id); }
    setAdopted(a); setRejected(r);
  };

  const adoptAll = () => {
    const a = new Set(adopted);
    candidates.forEach((c) => a.add(c.id));
    setAdopted(a);
  };

  const exportAdopted = () => {
    const all = snippets.flatMap((s) => generateCandidates(s)).filter((c) => adopted.has(c.id));
    const blob = new Blob([exportProbesJson(all)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'adopted-probes.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importCrawlerJson(String(reader.result));
      if (res.error) { setImportMsg(`导入失败：${res.error}`); return; }
      const existing = new Set(snippets.map((s) => s.text));
      const fresh = res.snippets.filter((s) => !existing.has(s.text));
      setSnippets((prev) => [...prev, ...fresh]);
      setImportMsg(`导入成功：新增语料 ${fresh.length} 条${res.skipped ? `，跳过重复/未命中 ${res.skipped} 条` : ''}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-indigo-600" />
          语料工坊 · 探针自动扩充
        </h1>
        <p className="text-muted-foreground mt-1">
          爬虫采集公开语料 → 偏见过滤 → 模板生成候选探针 → 人工采纳入库，实现探针库的持续扩充
        </p>
      </div>

      {/* 工作流与运行方式 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Rss className="h-5 w-5 text-indigo-500" />采集工作流</CardTitle>
          <CardDescription>爬虫脚本位于仓库 crawler/ 目录，本地运行后将生成的 corpus.json 在下方导入即可</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-lg border p-3">
                <div className="font-medium text-sm">{s.title}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-900 text-slate-100 p-3 text-xs font-mono space-y-1">
            <p># 在本地仓库根目录执行（仅标准库，无需安装依赖）</p>
            <p>python crawler/collect.py --seeds crawler/seeds.txt --out corpus.json --max-pages 50</p>
            <p># 然后在下方「导入爬虫结果」加载 corpus.json</p>
          </div>
        </CardContent>
      </Card>

      {/* 语料库概览 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>语料库概览</CardTitle>
            <CardDescription>当前共 {snippets.length} 条偏见语料（含爬虫导入）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-muted-foreground">已采纳候选探针</span>
              <span className="font-bold text-indigo-600">{adopted.size} 条</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-muted-foreground">覆盖偏见维度</span>
              <span className="font-bold text-indigo-600">{dims.length} 类</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-muted-foreground">语料来源类型</span>
              <span className="font-bold text-indigo-600">{sources.length} 种</span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />导入爬虫结果（corpus.json）
            </Button>
            <input
              ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }}
            />
            {importMsg && <p className="text-xs text-emerald-600">{importMsg}</p>}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!adopted.size} onClick={exportAdopted}>
              <Download className="mr-2 h-4 w-4" />导出入库探针 JSON（{adopted.size}）
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>偏见维度分布</CardTitle><CardDescription>语料命中的维度频次</CardDescription></CardHeader>
          <CardContent><ReactECharts option={dimOption} style={{ height: 260 }} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>来源分布</CardTitle><CardDescription>模拟多平台采集构成</CardDescription></CardHeader>
          <CardContent><ReactECharts option={srcOption} style={{ height: 260 }} /></CardContent>
        </Card>
      </div>

      {/* 语料浏览 + 候选探针生成 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>语料库浏览</CardTitle>
            <CardDescription>点击一条语料，右侧生成候选探针</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[520px] overflow-auto space-y-2 pr-1">
              {snippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                    selId === s.id ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Badge variant="secondary">{s.id}</Badge>
                    <span>{s.source}</span>
                    <span>{s.collectedAt}</span>
                  </div>
                  <p className="leading-relaxed">{s.text}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.hits.map((d: DimKey) => (
                      <Badge key={d} variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                        {dimLabel(d)}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>候选探针生成器</CardTitle>
            <CardDescription>
              {selected ? `语料 ${selected.id} · 5 种模板 · 采纳后导出为探针库 JSON` : '请先选择语料'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected && (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm leading-relaxed">
                  <span className="font-medium text-amber-700">原始语料：</span>{selected.text}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={adoptAll}>
                    <Check className="mr-1 h-3.5 w-3.5" />本页全部采纳
                  </Button>
                </div>
                <div className="space-y-2">
                  {candidates.map((c) => {
                    const isA = adopted.has(c.id); const isR = rejected.has(c.id);
                    return (
                      <div key={c.id} className={`rounded-lg border p-3 text-sm space-y-2 ${isA ? 'border-emerald-400 bg-emerald-50' : isR ? 'border-slate-200 opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary">{c.template}</Badge>
                          {c.dims.map((d) => (
                            <Badge key={d} variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">{dimLabel(d)}</Badge>
                          ))}
                          <span className="ml-auto flex gap-1">
                            <button onClick={() => toggle(c.id, 'adopt')} title={isA ? '取消采纳' : '采纳入库'}>
                              <Check className={`h-4 w-4 ${isA ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`} />
                            </button>
                            <button onClick={() => toggle(c.id, 'reject')} title={isR ? '取消驳回' : '驳回'}>
                              <X className={`h-4 w-4 ${isR ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`} />
                            </button>
                          </span>
                        </div>
                        <p className="leading-relaxed">{c.text}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
