// 「明镜」核心类型定义
// 维度体系：一级分类（4 大类）× 二级维度（19 个）
// 分类依据：社会科学理论框架（详见 docs/LABELING_GUIDE.md 第三节）
export type DimKey =
  | 'gender' | 'region' | 'age' | 'occupation' | 'ethnicity' | 'identity'
  | 'appearance' | 'disability' | 'marital' | 'wealth'
  | 'cognitive' | 'sycophancy' | 'victim'
  | 'default' | 'naming' | 'epistemic' | 'cultural'
  | 'meta' | 'temporal';

export type DimCategory = '群体偏见' | '思维与行为偏见' | '表征与语言偏见' | '元偏见';

export const DIM_CATEGORIES: DimCategory[] = ['群体偏见', '思维与行为偏见', '表征与语言偏见', '元偏见'];

export const DIMS: { key: DimKey; label: string; category: DimCategory }[] = [
  // ── A. 群体偏见（社会群体清单层） ──
  { key: 'gender', label: '性别', category: '群体偏见' },
  { key: 'region', label: '地域', category: '群体偏见' },
  { key: 'age', label: '年龄', category: '群体偏见' },
  { key: 'occupation', label: '学历/职业', category: '群体偏见' },
  { key: 'ethnicity', label: '民族', category: '群体偏见' },
  { key: 'identity', label: '身份/群体', category: '群体偏见' },
  { key: 'appearance', label: '外貌/身材', category: '群体偏见' },
  { key: 'disability', label: '健康/残障', category: '群体偏见' },
  { key: 'marital', label: '婚育/家庭', category: '群体偏见' },
  { key: 'wealth', label: '经济/阶层', category: '群体偏见' },
  // ── B. 思维与行为偏见（行为经济学 / 社会心理层） ──
  { key: 'cognitive', label: '认知/思维偏见', category: '思维与行为偏见' },
  { key: 'sycophancy', label: '谄媚性', category: '思维与行为偏见' },
  { key: 'victim', label: '受害者归因', category: '思维与行为偏见' },
  // ── C. 表征与语言偏见（语言表征 / 认识论层） ──
  { key: 'default', label: '默认人群假设', category: '表征与语言偏见' },
  { key: 'naming', label: '名称/符号偏见', category: '表征与语言偏见' },
  { key: 'epistemic', label: '知识覆盖偏见', category: '表征与语言偏见' },
  { key: 'cultural', label: '文化/西方中心', category: '表征与语言偏见' },
  // ── D. 元偏见（对偏见的偏见 / 时变层） ──
  { key: 'meta', label: '反刻板惩罚/过度矫正', category: '元偏见' },
  { key: 'temporal', label: '时间偏见', category: '元偏见' },
];

export type ProbeType = 'choice' | 'open';

export interface Probe {
  id: string;
  dim: DimKey;
  type: ProbeType;
  question: string;
  /** 选择题：刻板印象选项 */
  stereotypeOption?: string;
  /** 选择题：反刻板选项 */
  antiOption?: string;
}

export interface FactQA {
  id: string;
  topic: '科技' | '历史' | '军事常识';
  question: string;
  answer: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  vendor: string;
  access: '在线 API' | '本地离线';
  desc: string;
  /** 各维度偏见倾向强度 0~1（模拟引擎参数，真实场景由测试得出） */
  bias: Record<DimKey, number>;
  /** 幻觉倾向 0~1 */
  hallucination: number;
}

export interface ChoiceResult {
  kind: 'choice';
  probe: Probe;
  modelId: string;
  picked: 'stereotype' | 'anti';
  answerText: string;
}

export interface OpenResult {
  kind: 'open';
  probe: Probe;
  modelId: string;
  answerText: string;
  biasScore: number; // 0~100
  isStereotyped: boolean;
}

export type ProbeResult = ChoiceResult | OpenResult;

export interface FactResult {
  qa: FactQA;
  modelId: string;
  judged: 'correct' | 'hallucinated';
  answerText: string;
}

export type Strategy = 'baseline' | 'ethical' | 'rag';

export interface DebiasRun {
  probe: Probe;
  modelId: string;
  runs: { strategy: Strategy; answerText: string; biasScore: number; refused?: boolean }[];
  baselineScore: number;
}
