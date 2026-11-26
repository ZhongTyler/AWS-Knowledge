# 当前使用流程 / Current workflow

Knowledge 可独立使用；资料、运行、索引和本地配置由接收方管理。Query 只读，Ingest 需明确写入意图，新空库先建立本地 Git 基线。

Query can start with Wiki, Domain, approved DomainGroup or Wiki Group. Follow related pages when a specific question remains, and trace every selected Wiki through Raw to allowed Clippings. Candidate ranking and metadata are not evidence reads. Optional configured Tools provides BM25 first, hybrid for a real cross-expression gap, with original Query fallback. Deliver the grounded answer directly; independent enhanced review is a trusted-host opt-in.

New Ingest requests use one automatic schema8/core/deferred/consolidated-v1 workflow. Score sources, write and review Raw, plan Wiki changes, then review the actual page and cross-page changes. Recovery checkpoints allow intervention. Final confirmation binds the exact report and content versions. Existing runs retain their frozen contract; Group changes still require approval.

Unified feedback uses the existing optional host interface: distinguish returned, read and actually used material; route only new findings to their owner under the original consent. No increment needs no new note. Installation does not start ingestion, index building, agents, paid calls or deployment.

完整协议：[Query](../system/protocols/QUERY_PROTOCOL.md)、[Ingest](../system/protocols/INGEST_PROTOCOL.md)、[评分](../system/protocols/SCORING_SYSTEM.md)、[全景](../system/query/query-flow.md)、[2.1.0 升级](releases/2.1.0.md)。
