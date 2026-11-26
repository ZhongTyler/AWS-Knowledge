# INGEST_PROTOCOL · 内容消化与入库协议

只在用户有消化或入库意图时使用。只读查询见 [QUERY_PROTOCOL](QUERY_PROTOCOL.md)，评分唯一规则见 [SCORING_SYSTEM](SCORING_SYSTEM.md)，运行时操作以 [ingest-advance](../maintenance/checklists/ingest-advance.mjs) 的实际输出为准。

## 新运行与历史运行

“消化”和“自动消化”进入同一自动流程。新运行默认 `schema8`、`review_policy=deferred`、`review_channel=core`，自动选择 `consolidated-v1`，固定 `workflow_revision=2`。主会话完成阶段判断与审核，中途保留恢复点，用户可介入；最终由用户本人或其明确授权的审核者确认精确报告及内容版本后，才能 Finish。

已有运行按自身固定策略、profile、版本和批准继续。`interactive` 与 `existing` 仍是显式兼容入口，不再按“标准/自动”口令建立两套新流程。[历史操作参考](INGEST_PROTOCOL_LEGACY.md)只解释旧运行。precision 或 managed 等不受 consolidated 支持的组合须在创建前显式选择支持的 profile，不静默降级。

## 来源准备

核对用途、主题、来源身份、材料权限、实际 owner、Git/index 与活动 run。首次 Ingest 先建立接收方自己的本地 Git 基线，见 [SETUP](../maintenance/SETUP.md)。无关 dirty 保留；重叠写入先隔离。批次内来源默认逐篇处理，同作者不构成合并理由，改变来源证词边界的合并须明确批准。

完整取得来源，检查段落、截断及媒体。必要信息无法可靠读取时保留缺口，不用摘要掩盖。Clippings 按现有 normalize-clippings 工具整理为 `YYYYMMDD-标题.md`；对照 source_url/source_clipping 及历史评分核对重复。用户指定顺序时逐项接续，同一时刻仅一个写入者占用共享目标，后续草稿和审核可按宿主授权隔离准备。

## 三阶段流程

1. **评分与 Raw。** A/B 分项、置信度、内容条件和去留按评分合同；B1 实读候选 Wiki 判断重叠。revision2 将来源处置与覆盖判断一次填写。记录每份输入的 ingested/skipped 去向。内容写作者按 [RAW_STANDARD_V2](../maintenance/checklists/raw-standard-v2.md) 与 [raw-writing-v2](../maintenance/checklists/raw-writing-v2.md) 写 Raw，由非作者主审核者完整做 source→Raw、Raw→source 双向审核。核对论证、定义、数字及单位、条件、案例机制、归因和不确定性。Raw 不嵌图，必要图义可靠转录或披露未读取边界。全部通过并形成 Stage1 checkpoint 后才能写 Wiki。
2. **Wiki 规划。** 实读已接受 Raw、候选章节和相关上下文，按知识点选择既有落点。未变且有真实回执的内容可复用。新建页沿 [Wiki 规则](../../wiki/README.md)，不能用挂链接代替吸收。每项明确 planned/existing/deferred/not_applicable，已有覆盖需正文依据，暂缓记录去向和 review_when。多源冲突和条件继续保留。Domain、共享原则及 Group 结构/成员变化仍需原批准；自动流程只记录 Group Candidate，不自动提升为成员。
3. **写入、总审与闭合。** 同一 writer 可继续写 Wiki，主审核者核对逐页变化及受影响上下文，再做一次跨页遗漏、排除和暂缓裁决。零新增 Wiki 合法。运行实际维护、索引/链接/容量及触发的回测；脚本和机械 PASS 不替代内容判断。Stage3 finalizer 的 Prepare/Seal/Review 分开，Seal 不改已审正文。内容漂移定向失效相关审核，保留仍有效证据。

最终报告呈现逐来源评分、Raw 内容与边界、Wiki 实际 diff、未吸收项、拆分/Group 提案、回测和异常。报告及内容 manifest 的 SHA-256 与批准绑定，修改后重新验证受影响依赖；未经当前精确版本确认不得 Finish。完成后按接收方 Git 合同提交、验证直接父 gitlink，再处理明确配置的索引维护。安装不自动建索引、推送、部署或开始下一批。

## 写作者、投入和恢复

具体角色与实际宿主收据见 [写作路由](INGEST_WRITER_ROUTING.md)和[便携执行](PORTABLE_EXECUTION.md)。写作者不能接受自己的改稿；主会话非作者审核不能称为独立上下文盲审。接收方决定可用模型、会话与外部服务，包内配置只是可审阅默认值，安装不启动代理或付费调用。

费用、时间和请求上限沿当前任务；未知如实保留。最多两轮同类失败后停止依赖路线并按宿主规则交用户决定。历史评分、旧批准、原失败与恢复点保留，不为升级补造通过。30/6 评分与全文回测沿 SCORING_SYSTEM 的现行合同，不能用评分证明 Raw 保真或 Wiki 已吸收。

Ingest 中实际查询已有知识时，沿 Query 的统一反馈出口归并：真实新增问题或方法才交原 owner；无增量轻量结束。原查询、写入、结构批准与发布授权各自有效。
