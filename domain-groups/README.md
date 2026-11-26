# Domain Groups

DomainGroup 按明确语义和共同导航用途连接多个 Domain；Wiki Group 直接连接 Wiki。两者都保留 owner 的批准边界，不能当作自由标签。

定义页使用与文件名一致的稳定 id、name、aliases、status 和 approval_status。只有 active + approved 定义可参与发现。实际成员由 Domain frontmatter 的 domain_groups 登记；candidate_members 仅为待裁决候选，不自动展开。新建/重命名/拆分/合并/退役及成员改变先取得宿主相应批准。

本包从空目录开始，无预批准分组。`discover` 接受 domain_groups 的 id、alias 或 knowledge:domain-group:<id>，先返回真实 Domain 候选，再按当前问题选 Domain 的 Wiki 或完整原则。候选元数据保持 content_read:false，实际正文须 read。
