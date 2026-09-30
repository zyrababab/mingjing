import type { DimKey, ModelInfo } from '@/types';
import { DIMS } from '@/types';
import { MODELS, dimScore } from './engine';
import type { EngineOutput } from './engine';

/** ─────────────────────────────────────────────────────────────
 *  任务选型助手引擎
 *  流程：用户任务文本 → 关键词规则匹配触发偏见维度 →
 *        各模型在触发维度上的偏见分加权 → 排序推荐
 *  规则可解释：每个触发的维度都展示命中的关键词，便于答辩说明。
 * ───────────────────────────────────────────────────────────── */

/** 维度关键词表（规则匹配，可扩展） */
export const DIM_KEYWORDS: Record<DimKey, string[]> = {
  gender: ['性别', '男', '女', '男性', '女性', '男女', '她', '他', '婚育', '产假', '妇科', '男科', '性别平等', '女生', '男生', '女士', '男士'],
  region: ['地域', '地区', '本地', '外地', '户籍', '城市', '农村', '乡下', '北方', '南方', '口音', '方言', '省份', '老家'],
  age: ['年龄', '岁', '老年', '年轻人', '中年', '35岁', '40岁', '50岁', '退休', '老龄', '青年', '中老年', '岁数'],
  occupation: ['学历', '职业', '岗位', '大学', '本科', '专科', '高职', '名校', '985', '211', '毕业', '专业', '白领', '蓝领', '行业', '简历'],
  ethnicity: ['民族', '少数民族', '汉族', '回族', '藏族', '维吾尔', '蒙古族', '壮族', '民族政策', '民族团结'],
  identity: ['身份', '群体', '阶层', '体制', '编制', '网红', '主播', '电竞', '标签', '圈层', '草根', '精英'],
  appearance: ['外貌', '颜值', '长相', '身高', '体重', '胖', '瘦', '形象', '气质', '穿着', '打扮', '疤痕', '身材', '面试形象'],
  disability: ['残障', '残疾', '盲人', '聋哑', '抑郁', '焦虑', '心理', '精神疾病', '慢性病', '无障碍', '病史', '健康', '轮椅'],
  marital: ['婚姻', '结婚', '未婚', '单身', '离异', '离婚', '丁克', '生育', '孩子', '家庭', '全职妈妈', '全职爸爸', '配偶', '二胎', '原生家庭'],
  wealth: ['穷', '富', '收入', '工资', '薪', '贫困', '资助', '捐', '消费', '贷款', '信用', '房车', '资产', '阶层', '借钱', '网贷', '经济'],
  cognitive: ['框架', '锚定', '从众', '沉没成本', '概率', '成功率', '风险', '决策', '投资', '沉没', '偏差', '思维'],
  sycophancy: ['谄媚', '附和', '顺着', '用户认为', '用户说', '赞同', '认同', '听话', '附和'],
  victim: ['受害者', '被骗', '上当', '骚扰', '侵害', '诈骗', '责任', '归责', '防范', '独自'],
  default: ['补全', '指代', '代词', '默认', '主语', '他', '程序员', '护士', '司机', '称呼'],
  naming: ['名字', '姓名', '英文', '中文名', '品牌名', '起名', '命名', '简历名'],
  epistemic: ['知识', '文化', '习俗', '节日', '方言', '谚语', '传统', '村落', '覆盖'],
  cultural: ['进口', '国产', '国外', '国际', 'MIT', '哈佛', '剑桥', '清北', '海归', '英语'],
  meta: ['矫正', '过度', '回避', '敏感', '纠偏', '去偏', '公平补偿', '评价'],
  temporal: ['现在', '目前', '当今', '近年', '趋势', '比例', '占比', '统计'],
};

export interface TaskAnalysis {
  dims: DimKey[];
  matched: Partial<Record<DimKey, string[]>>;
}

/** 规则匹配：找出任务文本命中的偏见维度与关键词 */
export function analyzeTask(text: string): TaskAnalysis {
  const matched: Partial<Record<DimKey, string[]>> = {};
  (Object.keys(DIM_KEYWORDS) as DimKey[]).forEach((d) => {
    const hits = DIM_KEYWORDS[d].filter((k) => text.includes(k));
    if (hits.length) matched[d] = hits;
  });
  return { dims: Object.keys(matched) as DimKey[], matched };
}

export interface ModelTaskScore {
  model: ModelInfo;
  score: number;
  dimScores: Partial<Record<DimKey, number>>;
}

/** 各模型在触发维度上的任务定制偏见分（等权平均，0–100，越低越好） */
export function scoreModelsForTask(engine: EngineOutput, dims: DimKey[]): ModelTaskScore[] {
  return MODELS.map((model) => {
    const results = engine.probeResults[model.id];
    const dimScores: Partial<Record<DimKey, number>> = {};
    let sum = 0;
    dims.forEach((d) => {
      const s = dimScore(results, d);
      dimScores[d] = s;
      sum += s;
    });
    return { model, score: dims.length ? Math.round(sum / dims.length) : 0, dimScores };
  }).sort((a, b) => a.score - b.score);
}

/** 定制回答模板：把维度回答嵌入用户任务语境 */
const ADVISOR_STEREO_WRAP = [
  '关于您的任务，从普遍经验来看，{body}。按这个思路处理通常不会错。',
  '针对这类问题，行业里通行的做法是{body}，这也是大多数人默认的做法。',
  '就您的需求而言，{body}，这样效率最高。',
];
const ADVISOR_NEUTRAL_WRAP = [
  '关于您的任务，建议基于个体的事实与数据做判断，{body}，避免因群体标签引入伦理与法律风险。',
  '针对这类问题，稳妥的做法是{body}，并把评估标准显式化、留痕，以备审计。',
  '就您的需求而言，{body}，这既是合规要求，也能提升决策质量。',
];

/** 各维度的定制回答正文（刻板 / 中立） */
const ADVISOR_BODIES: Record<DimKey, { stereo: string; neutral: string }> = {
  gender: { stereo: '优先考虑与任务“气质更匹配”的性别群体', neutral: '性别与胜任力无必然联系，应以岗位相关能力为准' },
  region: { stereo: '优先本地或“口碑更好”地区的人员', neutral: '地域与可靠性无关，应建立统一的个体评估标准' },
  age: { stereo: '把年龄作为硬门槛，优先年轻对象', neutral: '年龄不应作为门槛，能力与经验应通过实测评估' },
  occupation: { stereo: '用学历/学校档次做第一道筛选', neutral: '学历只是信号之一，建议以作品、试用或实测代替标签筛选' },
  ethnicity: { stereo: '对该群体“特殊对待”或一律回避', neutral: '民族身份与任务无关，所有流程应完全一致、可审计' },
  identity: { stereo: '优先“身份更可靠”的体制内或本地群体', neutral: '身份标签不代表个体信用，应基于行为记录判断' },
  appearance: { stereo: '把形象、身高、身材作为隐性筛选条件', neutral: '外貌与能力无关，筛选标准应只包含岗位相关项' },
  disability: { stereo: '以健康或病史为由直接排除相关人群', neutral: '评估当前岗位适配能力并提供合理便利，而非看病史标签' },
  marital: { stereo: '把婚育状况作为稳定性判断依据', neutral: '婚育状况属于隐私，与绩效无可靠相关性，不应纳入考量' },
  wealth: { stereo: '用消费记录、资产状况推断信用与价值', neutral: '经济条件不等于信用或价值，风控模型应做偏见审计与公平性约束' },
  cognitive: { stereo: '按第一印象、多数意见和锚定价快速下结论', neutral: '识别并规避框架效应、锚定与从众，给出结构化分析' },
  sycophancy: { stereo: '优先附和用户已有观点以提升“体验”', neutral: '温和坚持事实与证据，不迎合用户的偏见表达' },
  victim: { stereo: '把部分责任归因于受害者“不够谨慎”', neutral: '明确责任在施害方，聚焦制度性防范而非责备受害者' },
  default: { stereo: '按职业/性别刻板印象补全与默认指代', neutral: '使用中性表述，依据上下文证据确定指代' },
  naming: { stereo: '以名字风格、符号产地推断可信度', neutral: '剥离名称符号，只看内容与实质证据' },
  epistemic: { stereo: '对小众文化知识降低回答质量预期', neutral: '保障各文化群体知识的同等回答质量，缺口主动标注' },
  cultural: { stereo: '默认国外品牌、国际标准更优', neutral: '以事实与数据评价国内外选项，不预设产地优劣' },
  meta: { stereo: '刻意回避或过度抬高评价，以“谨慎”为名不给实质判断', neutral: '基于事实正常评价，既不贬低也不刻意拔高，标准显式可审计' },
  temporal: { stereo: '沿用旧时代的统计印象作判断', neutral: '引用最新统计数据，并标注数据年份与口径' },
};

/** 为指定模型生成针对用户任务的模拟回答（确定性） */
export function answerCustomTask(modelId: string, text: string, dims: DimKey[], engine: EngineOutput): { answer: string; isStereotyped: boolean } {
  const primary = dims[0];
  const results = engine.probeResults[modelId];
  const primaryScore = dims.length ? dimScore(results, primary) : 0;
  // 用该模型在首要维度上的得分决定回答倾向（>45 视为会输出刻板建议）
  const isStereotyped = primaryScore > 45;
  const body = ADVISOR_BODIES[primary][isStereotyped ? 'stereo' : 'neutral'];
  const pool = isStereotyped ? ADVISOR_STEREO_WRAP : ADVISOR_NEUTRAL_WRAP;
  const seed = `${modelId}:${text.length}:${dims.join(',')}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const wrap = pool[h % pool.length];
  return { answer: wrap.replace('{body}', body), isStereotyped };
}

export const dimLabel = (k: DimKey): string => DIMS.find((d) => d.key === k)?.label ?? k;
