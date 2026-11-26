# Query 查阅全景

```mermaid
flowchart TD
  Q[当前问题与来源权限] --> NAV{按缺口选择发现入口}
  NAV --> BM[可选 Tools BM25 / 按需 hybrid]
  BM -->|未配置或不可用| BASE[原生 Query 有界发现]
  NAV --> DG[已批准 DomainGroup → 实际 Domain]
  NAV --> WG[已批准 Wiki Group → 实际 Wiki]
  NAV --> DIRECT[已知 Wiki / 原则 / 相关页]
  DG --> SELECT[选择本题真正需要的候选]
  WG --> SELECT
  DIRECT --> SELECT
  BM --> SELECT
  BASE --> SELECT
  SELECT --> READ[核心正文全文 read / 合法章节 / 有效 reuse]
  READ --> GAP{关键缺口}
  GAP -->|相关机制未明| FOLLOW[相关页面一跳 / 有理由继续第二跳]
  FOLLOW --> SELECT
  GAP -->|关键来源需核实| RAW[Raw 全文 → 按权限读 Clippings / 原来源]
  RAW --> GAP
  GAP -->|已足够或达到边界| ANSWER[保留条件与真实缺口，直接交付正文]
  READ -.->|可信宿主显式启用| REVIEW[增强来源核查 / 定点修订]
  REVIEW --> ANSWER
  ANSWER --> FINISH[按同意范围归并本题查阅]
  FINISH --> INC{存在真实增量}
  INC -->|有| OWNER[最小线索交实际 owner，写入另按授权]
  INC -->|无| END[结束]
```

发现排名、Group 成员、导航元数据和标题都只是候选，不能冒充正文已读。每一跳都受同一问题、权限和预算约束；不同 Wiki 的 Raw/Clippings 可继续纵向追溯。原生查询不依赖 AWS、meta、Tools 或研究模块。

BM25 用词项匹配、词频饱和与文档长度校正帮助排序候选，无需向量模型；混合检索用于已配置且有跨表达缺口的任务。检索方式不替代全文阅读、来源核对和 Agent 的语义判断。安装不建索引、不下载模型，也不启用在线问答服务。
