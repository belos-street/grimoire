---
name: rag-lexical-multihop
description: 词法驱动的查询时动态多跳（轻量检索路线，通用可迁移）：BM25 倒排索引 + 桥接词扩展，不依赖向量嵌入与预建图谱，适合编号密集、低算力、本地私有化场景；建议与向量 RAG 混合路由，而非替代。
version: "1.0.0"
license: MIT
metadata:
  author: Sectrend (distilled from SAG2/SAG-Wiki 公开资料 + 检索工程实践)
  tags: [rag, retrieval, bm25, multi-hop, lightweight, offline, typescript]
  parent: rag
  source: "SAG2 万字拆解（趣谈AI）；作者自述口径，benchmark 数据未独立验证"
---

# rag-lexical-multihop：词法驱动的查询时动态多跳

## 通用原则（不限语言/框架）

不是所有知识库都需要向量。当语料以「编号、型号、文号、合同号、专有名词」串联时，精确词法匹配 + 查询时多跳扩展，往往比向量相似度更准、更便宜、更可解释：

- **检索通道是选型，不是默认值**：dense 擅长同义改写与开放域，BM25 擅长精确标识符。先看语料与问题分布，再定主通道；
- **多跳可以在查询时动态完成**：不必预建全局图谱，也不必让 LLM 反复迭代检索。种子检索 → 抽取桥接词 → 打分筛选 → 再检索 → 合并去重，循环到无新证据或达到跳数上限；
- **桥接词是质量阀门**：多跳效果取决于「哪些词有资格作为下一跳的桥梁」。用 IDF、df 区间、标识符特征、标题权重等廉价信号即可做出可用版本，无需训练模型；
- **建库成本是设计约束**：倒排索引（FTS5 / tsvector / Elasticsearch）秒级到分钟级建库，纯 CPU、无额外运维组件，是本地/信创/离线场景的硬需求；
- **证据链必须可回放**：每一跳用了哪个词、从哪些段落抽取、又扩到哪些段落，都要能还原（`bridge.fromChunkIds` + `addedChunkIds`）；
- **默认与向量 RAG 混合**：按问题类型路由，而不是二选一。

> 本模块的来源是一篇厂商技术软文（SAG2 / SAG-Wiki）。架构思想可借鉴，但「刷新 SOTA」「建库快几十到上百倍」「硬件成本降 60%」等结论均为作者自测口径，落地前必须用自有数据复测。

## 适用判定（先做这个，再谈实现）

| 场景特征 | 更适合 |
| --- | --- |
| 设备型号/合同号/制度文号/项目代号密集，问题常是「按编号查全链路」 | **本模块（词法多跳）** |
| 无 GPU、内网/信创、本地桌面、文档频繁更新重建 | **本模块** |
| 合规/审计要求检索过程可解释、可追溯 | **本模块**（白盒） |
| 用户口语化、大量同义改写、开放域百科式问答 | dense / 混合检索（`rag-retrieval`） |
| 需要全局总结、多角度聚合 | GraphRAG（`rag-graphrag`）或 dense 多查询 |
| 语料术语不统一、缺少可复用的标识符 | 混合检索；纯词法多跳会断链 |

判定方法：抽样 50~100 条真实查询，统计「含标识符/编号的比例」「提问用词与文档用词的重合度」「跨文档关联问题的比例」。三项都高才值得上本模块。

## 一、五层结构（极简版）

```
① 摄取：解析 → 清洗 → 按句/段切块（保留标题路径）→ 分词 → BM25 倒排索引
② 种子召回：查询 → BM25 top-k
③ 桥接词：从种子段落抽取候选词 → 打分筛选（本模块核心）
④ 多跳迭代：桥接词再检索 → 合并去重 → 无新增或达 MAX_HOPS 即停 → 统一重排
⑤ 生成溯源：证据段落 + 每跳路径 → LLM 生成，逐条标注来源
```

与 GraphRAG 的本质区别：**不预建图谱**。图谱等价物是「查询时临时长出来的桥接路径」，因此没有建图成本，也没有抽取错误带来的系统性偏差；代价是做不了真正的图谱推理（见「能力边界」）。

## 二、规则版桥接词打分（替代未公开的 Jev 决策模型）

原文的 Jev 决策模型未公开细节。这里给的是规则版等价实现，先把闭环跑通，把「学习型打分器」留作后续替换：

```ts
// 骨架（参考命名：service/retrieval/bridge-scorer.ts）
// 与 query-router.ts 共用同一份 IDENTIFIER，避免两处漂移
export const IDENTIFIER = /[A-Za-z]{2,}[-_/]?\d|\d{4,}|[\u4e00-\u9fa5]{2,6}第?\d+号/

// 可调常量：先用默认值，再按自有语料扫参
export const DF_RATIO_MAX = 0.3      // 超过视为泛词，直接淘汰
export const DF_RATIO_IDEAL = 0.02   // df 占比的理想值
export const DF_RATIO_SPAN = 0.28    // df 区间加分的跨度
export const W_IDENTIFIER = 2.0
export const W_HEADING = 1.0
export const W_NEW_TERM = 0.5
export const W_IDF = 0.8
export const W_DF_BAND = 0.5

export interface BridgeSignals {
  term: string
  df: number            // 含该词的段落数
  totalChunks: number   // 总段落数
  idf: number
  inHeading: boolean
  hitQuery: boolean     // 是否已在原问题中出现
  isStopword: boolean
}

/** 返回 0 表示不合格；分数越高越值得作为下一跳桥梁 */
export function scoreBridge(s: BridgeSignals): number {
  if (s.isStopword || s.term.length < 2 || s.term.length > 40) return 0
  const dfRatio = s.df / Math.max(s.totalChunks, 1)
  if (dfRatio > DF_RATIO_MAX) return 0   // 太常见：扩出去全是噪音
  if (s.df < 2) return 0                  // 太罕见：连不成链
  let score = 0
  if (IDENTIFIER.test(s.term)) score += W_IDENTIFIER // 编号/型号是最强桥梁
  if (s.inHeading) score += W_HEADING
  if (!s.hitQuery) score += W_NEW_TERM   // 新信息优先，避免原地打转
  score += W_IDF * Math.min(s.idf / 10, 1)            // IDF 归一化
  score += W_DF_BAND * (1 - Math.abs(dfRatio - DF_RATIO_IDEAL) / DF_RATIO_SPAN)
  return score
}
```

> 权重不是真理，按自有语料调；有标注数据后换成小分类器/learning-to-rank 即可，接口不变。

## 三、多跳主循环（含终止与溯源）

```ts
// 骨架（参考命名：service/retrieval/lexical-multihop.ts）
import type { BridgeSignals } from './bridge-scorer'

export const MAX_HOPS = 3
export const SEED_TOP_K = 10
export const HOP_TOP_K = 10
export const BRIDGES_PER_HOP = 5
export const MAX_EVIDENCE = 10       // 最终进 prompt 的段落上限（8~12）

// 与 rag-loader / rag-retrieval / rag-generation 对齐的来源字段
export interface ChunkHit {
  id: string
  path: string
  titles: string[]
  content: string
  score: number
}

export interface Evidence extends ChunkHit {
  bridgeHits: number   // 被桥接命中的次数，可作为自定义 rerank 信号
}

export interface TermCandidate {
  term: string
  inHeading: boolean
}

export interface BridgeUse {
  term: string
  score: number
  fromChunkIds: string[]   // 该桥接词来自哪些候选段，用于还原扩展路径
}

export interface HopRecord {
  hop: number
  bridges: BridgeUse[]
  addedChunkIds: string[]
}

export type StopReason = 'no_bridges' | 'no_new_evidence' | 'max_hops'

export async function lexicalMultiHop(
  question: string,
  deps: {
    bm25: (q: string, k: number) => Promise<ChunkHit[]>
    extractTerms: (hit: ChunkHit) => TermCandidate[]
    scoreBridge: (signals: BridgeSignals) => number
    df: (term: string) => number          // 走索引词表统计，不要逐词全表扫描
    totalChunks: number
    isStopword: (term: string) => boolean
    rerank?: (q: string, hits: Evidence[]) => Evidence[]
  }
): Promise<{ evidence: ChunkHit[]; trace: HopRecord[]; stopReason: StopReason }> {
  const seen = new Map<string, Evidence>()
  const usedTerms = new Set<string>()
  const seed: Evidence[] = (await deps.bm25(question, SEED_TOP_K))
    .map(h => ({ ...h, bridgeHits: 0 }))
  seed.forEach(h => seen.set(h.id, h))
  let frontier = seed
  const trace: HopRecord[] = []
  let stopReason: StopReason = 'max_hops'

  for (let hop = 1; hop <= MAX_HOPS; hop++) {
    const candidateScore = new Map<string, number>()
    const candidateSources = new Map<string, Set<string>>()

    for (const hit of frontier) {
      for (const cand of deps.extractTerms(hit)) {
        if (usedTerms.has(cand.term)) continue
        const df = deps.df(cand.term)
        const score = deps.scoreBridge({
          term: cand.term,
          df,
          totalChunks: deps.totalChunks,
          idf: Math.log((deps.totalChunks + 1) / (df + 1)) + 1,
          inHeading: cand.inHeading,
          hitQuery: question.includes(cand.term), // 生产环境用分词后的 query 词集合
          isStopword: deps.isStopword(cand.term)
        })
        if (score <= 0) continue
        candidateScore.set(cand.term, Math.max(candidateScore.get(cand.term) ?? 0, score))
        if (!candidateSources.has(cand.term)) candidateSources.set(cand.term, new Set())
        candidateSources.get(cand.term)!.add(hit.id)
      }
    }

    const bridges: BridgeUse[] = [...candidateScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, BRIDGES_PER_HOP)
      .map(([term, score]) => ({
        term,
        score,
        fromChunkIds: [...(candidateSources.get(term) ?? [])]
      }))
    if (bridges.length === 0) {
      stopReason = 'no_bridges'
      break
    }
    bridges.forEach(b => usedTerms.add(b.term))

    // 同一跳的桥接词并行检索，避免 5 词 × 3 跳的串行 RTT 叠加
    const batches = await Promise.all(bridges.map(b => deps.bm25(b.term, HOP_TOP_K)))
    const added: Evidence[] = []
    batches.forEach(hits => {
      for (const hit of hits) {
        const existing = seen.get(hit.id)
        if (existing) {
          existing.bridgeHits += 1
          continue
        }
        const ev: Evidence = { ...hit, bridgeHits: 1 }
        seen.set(hit.id, ev)
        added.push(ev)
      }
    })

    trace.push({ hop, bridges, addedChunkIds: added.map(h => h.id) })
    if (added.length === 0) {
      stopReason = 'no_new_evidence'
      break
    }
    frontier = added
  }

  const all = [...seen.values()]
  const ranked = deps.rerank ? deps.rerank(question, all) : all
  return { evidence: ranked.slice(0, MAX_EVIDENCE), trace, stopReason }
}
```

- `seen` 同时用于段落去重与 `bridgeHits` 累计；
- `trace` 通过 `fromChunkIds` / `addedChunkIds` 还原「从哪段扩到哪段」，直接作为生成阶段的溯源输入；
- `stopReason` 区分「无合格桥接词」「无新证据」「达到跳数上限」，排障时能定位是桥接打分太严还是语料本身断链；
- `rerank` 默认原样返回，可用 `bridgeHits + BM25 分 + 标题命中` 自定义排序，也可接 `rag-rerank` 的交叉编码器；
- `MAX_EVIDENCE` 防止最坏情况下 `10 + 3×5×10` 条段落全量进 prompt 撑爆上下文。

## 四、混合路由（比单一路线更重要）

```ts
// 骨架（参考命名：service/retrieval/query-router.ts）
import { IDENTIFIER } from './bridge-scorer'

const GLOBAL = /(总结|概述|全局|整体|所有|都有哪些)/

export type Route = 'lexical_multihop' | 'dense' | 'graph' | 'hybrid'

export function routeQuery(q: string, opts: { hasGraph: boolean }): Route {
  if (IDENTIFIER.test(q)) return 'lexical_multihop'          // 编号优先：避免「设备 A 有哪些告警」被送进图谱
  if (GLOBAL.test(q)) return opts.hasGraph ? 'graph' : 'hybrid' // 未接入 GraphRAG 时回退混合检索
  return 'hybrid'                                             // 默认双通道 + RRF
}
```

规则起步即可；`hasGraph` 由装配层注入，有评估集后再考虑 LLM 分类（可复用 `rag-query` 的意图分类）。

## 五、评估（不要相信厂商口径）

| 指标 | 说明 |
| --- | --- |
| 证据召回率 Recall@k | 标准答案的证据段落是否进 top-k（多跳数据集常用 Recall@10） |
| 桥接词精确率 | 人工/LLM 判定扩展词是否真的指向相关证据（本模块最关键的中间指标） |
| 平均跳数 / 断链率 | 有多少问题在第 1 跳后就没有合格桥梁 |
| 建库耗时 / 索引体积 | 与向量方案对比的分母 |
| P95 查询延迟 | 含桥接打分与多轮检索 |
| 端到端答案正确率 | 与 hybrid / dense 基线 A/B，按问题类型分桶 |

先用 30~50 条自有问题跑通「召回 + 桥接词精确率」，再谈端到端。原文引用的 MuSiQue / 2WikiMultiHopQA / HotpotQA 成绩无法代表你的语料。

## 六、已知陷阱

- **CJK 分词决定上限**：中文需分词（jieba / nodejieba）；无分词依赖时可用 bigram 作基线，召回通常不差但索引更大；
- **标识符归一化**：大小写、全半角、连字符/下划线、前导零要统一，否则精确匹配失效；
- **泛词污染**：df 上限必须设，否则「系统」「管理」「配置」这类词会把多跳变成全库扫描；
- **桥接词爆炸**：每跳限制数量（3~5 个），并记录每个词带来的新增段落数，为负收益的词降权；
- **死循环**：段落 id + 桥接词双重去重，并设 MAX_HOPS 硬上限；
- **上下文爆炸**：最终证据必须截断（`MAX_EVIDENCE` 8~12），不要把召回集全塞给 LLM；
- **索引更新**：FTS5 支持增量写入，但删除/更新需显式同步；文档频繁变更时优先整库重建（反正快）；
- **不要取消生成阶段的引用约束**：可解释性来自「检索白盒 + 生成强制引用」两者配合，见 `rag-generation`；
- **不要以「无向量」为目标**：目标是「单位成本下的准确率」，不是技术纯度。

## 七、能力边界（选型前必读）

- **同义改写弱**：问法与文档用词差异大时召回骤降，需 dense 通道兜底；
- **开放域易断链**：文档间缺少共享标识符时，多跳无法延续；
- **桥接打分器决定天花板**：规则版够用但不精细，复杂语料需要学习型打分器；
- **不等价于知识图谱**：只能做证据级关联扩展，做不了实体属性计算、关系推理、批量图谱分析；
- **最佳实践是混合**：精确/编号查询与多跳走本模块，模糊语义/开放域走 dense，全局聚合走 GraphRAG，由路由层统一分发。

## 八、与现有模块的衔接

- 索引层复用 `rag-ingestion` 的切块与元数据（`path` / `titles` 必须保留，桥接与溯源都依赖它）；ingestion 产出的 `text` 在组装检索结果时映射为 `content`，与 `rag-loader` / `rag-retrieval` / `rag-generation` 的字段保持一致；
- 与 `rag-retrieval` 是并列的检索策略：本模块以 BM25 为主通道，`rag-retrieval` 以 dense + BM25 做 RRF 融合（其 keyword 通道可视为本模块的 0 跳退化形态）；
- 重排可接 `rag-rerank`；生成与引用约束见 `rag-generation`；
- 评估沿用 `rag-evaluation`，额外关注「桥接词精确率」与「断链率」两个中间指标；
- 与 `rag-graphrag` 的关系：GraphRAG 预建图谱换全局能力，本模块查询时动态扩展换零建库成本，按问题类型二选一或并存。
