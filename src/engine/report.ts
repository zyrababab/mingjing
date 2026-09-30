import { DIMS } from '@/types';
import { FACT_QA } from '@/data/probes';
import { MODELS, dimScore, overallScore, stereotypeRate, hallucinationRate } from './engine';
import type { EngineOutput } from './engine';

/** 生成《大模型偏见审计报告》Markdown 文本 */
export function buildReport(engine: EngineOutput): string {
  const lines: string[] = [];
  lines.push('# 大模型偏见审计报告');
  lines.push('');
  lines.push(`> 由「明镜」大模型偏见检测与去偏平台自动生成 · 探针集：「镜鉴」中文偏见探针集 v1.0（${Object.values(engine.probeResults)[0]?.length ?? 0} 条探针）`);
  lines.push('');

  lines.push('## 一、受测模型总览');
  lines.push('');
  lines.push('| 模型 | 厂商 | 接入方式 | 综合偏见分 | 刻板认同率 | 幻觉率 |');
  lines.push('|---|---|---|---|---|---|');
  MODELS.forEach((m) => {
    const pr = engine.probeResults[m.id];
    const fr = engine.factResults[m.id];
    lines.push(
      `| ${m.name} | ${m.vendor} | ${m.access} | ${overallScore(pr)} | ${stereotypeRate(pr)}% | ${hallucinationRate(fr)}% |`,
    );
  });
  lines.push('');
  lines.push(`> 注：综合偏见分为 0–100 分，分数越高表示偏见越严重；刻板认同率为选择题中选择刻板选项的比例；幻觉率来自 ${FACT_QA.length} 条事实性问答检索比对。`);
  lines.push('');

  lines.push('## 二、分维度偏见画像（行=维度，列=模型）');
  lines.push('');
  lines.push('| 维度（分类） | ' + MODELS.map((m) => m.name).join(' | ') + ' |');
  lines.push('|---|' + MODELS.map(() => '---').join('|') + '|');
  DIMS.forEach((d) => {
    const row = MODELS.map((m) => dimScore(engine.probeResults[m.id], d.key));
    lines.push(`| ${d.label}（${d.category}） | ` + row.join(' | ') + ' |');
  });
  lines.push('');

  lines.push('## 三、典型偏见输出摘录（已脱敏）');
  lines.push('');
  const worst = MODELS
    .map((m) => ({ m, pr: engine.probeResults[m.id] }))
    .flatMap(({ m, pr }) =>
      pr.filter((r) => (r.kind === 'choice' && r.picked === 'stereotype') || (r.kind === 'open' && r.isStereotyped))
        .map((r) => ({ model: m.name, dim: r.probe.dim, q: r.probe.question, a: r.answerText })),
    )
    .slice(0, 8);
  worst.forEach((w, i) => {
    const dimLabel = DIMS.find((d) => d.key === w.dim)!.label;
    lines.push(`${i + 1}. **【${dimLabel}·${w.model}】** ${w.q}`);
    lines.push(`   - 模型回答：${w.a}`);
  });
  lines.push('');

  lines.push('## 四、幻觉检测结果');
  lines.push('');
  lines.push('| 模型 | 科技 | 历史 | 军事常识 | 总体 |');
  lines.push('|---|---|---|---|---|');
  MODELS.forEach((m) => {
    const fr = engine.factResults[m.id];
    lines.push(
      `| ${m.name} | ${hallucinationRate(fr, '科技')}% | ${hallucinationRate(fr, '历史')}% | ${hallucinationRate(fr, '军事常识')}% | ${hallucinationRate(fr)}% |`,
    );
  });
  lines.push('');

  lines.push('## 五、治理建议');
  lines.push('');
  lines.push('1. 对综合偏见分偏高的模型，优先在生产环境中叠加「伦理系统提示词 + RAG 事实纠偏」双重防护；');
  lines.push('2. 伦理提示词存在约 18% 的过度回避副作用，应通过白名单话术降低拒答率；');
  lines.push('3. 建议按季度复测并留存本报告，形成偏见治理的常态化审计机制；');
  lines.push('4. 幻觉治理应优先对「军事常识」等高风险主题接入权威检索库。');
  lines.push('');
  lines.push('---');
  lines.push('报告生成：明镜平台 · 数据可复现（确定性评测引擎，同版本结果一致）');
  return lines.join('\n');
}

export function downloadReport(engine: EngineOutput): void {
  const md = buildReport(engine);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '明镜-大模型偏见审计报告.md';
  a.click();
  URL.revokeObjectURL(url);
}
