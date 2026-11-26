<!-- knowledge-identity:display-name -->
# Knowledge Base · 运行规则

这是纯知识查询与消化框架。运行职责只有 Query、Ingest、Lint、初始化和发布包维护；不包含本地专家、Team、Procedure、Method、评测或记忆系统。

- Query：读取 `system/protocols/QUERY_PROTOCOL.md`，按证据需要选择检索深度。
- Ingest：读取 `system/protocols/INGEST_PROTOCOL.md`，只在明确写入意图时修改库。
- Lint：读取 `system/maintenance/checklists/knowledge-health-check.md`，默认只报告。
- 仅在本次变更使其失真且具有明确维护范围时同步 registry、NOW 和 CHANGELOG；公开内容在本独立仓维护，库存与发布附件由已审提交生成。

- 新消化统一自动流程，默认 deferred/core/consolidated-v1（schema8、workflow_revision=2）。中途保留恢复点，最终精确版本确认后才能 finish；历史运行保持原策略。
- 新建运行使用schema8与RAW_STANDARD_V2全文双向非作者审核，consolidated 主审核者身份按实际宿主收据记录；历史运行按原版本解释，迁移须按raw-v2-migration.md显式授权与保全。
- 只读健康使用统一run-knowledge-health.ps1；按输入与规则版本复用，过期/变更/失败必须重验。

本版的合并执行、主审核者、精确版本收尾与可选研究/知识复利接线见 [便携执行说明](system/protocols/PORTABLE_EXECUTION.md)。模型、会话、资料绑定和外部发布均由接收方配置与授权；安装不启动这些行为。
