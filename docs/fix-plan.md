# Demand Radar 修复计划

## 目标
- 修复提取记录与需求的 ID/计数不一致问题，确保保存的需求可回溯到正确的提取。
- 让 Options 页面正确预填已保存的 LLM 配置，减少重复输入。
- 对齐“通用网页/白名单”功能：要么真正支持更多站点，要么调整 UI/逻辑并持久化站点设置。
- 补充验证步骤，避免回归。

## 工作项

### 1) 提取与存储一致性
- 评估 `extractionRepo.create` 接口：支持外部传入 ID 或只接受 `CreateExtractionParams` 并生成 ID，选择一致的模式。
- 修正 `handleAnalyzeCurrentPage`/`handleQuickSave`：
  - 传递符合仓储签名的参数或调整仓储以接收已有 ID。
  - 确保保存的需求引用的 `extractionId` 与实际落库的记录一致。
  - 更新提取记录的 `demandCount`/`savedDemandCount` 在分析完成和保存后正确写回。
- 验证：手动走“分析→保存需求→查看需求详情→查看提取记录”全链路，确认计数与关联正确。

### 2) 配置页面预填
- 在 Options 页加载配置时使用 `response.data.llm`（`GET_CONFIG` 返回的实际字段），让已存 API Key/模型自动填充。
- 手动验证：已有配置情况下打开 Options，确认字段被填充且保存不清空。

### 3) 通用站点支持与站点白名单持久化
- 决策：
  - 若要支持通用网页，扩展 content script `matches`/host 权限，使 `GenericAdapter` 能运行；或
  - 若暂不支持，更新 UI/文档以取消“通用网页”承诺。
- 将 Side Panel 中的白名单编辑持久化到 `configRepo`，并确保 Background/site-filter 使用同一数据源。
- 手动验证：
  - 调整白名单后刷新 Side Panel，设置仍在。
  - 在新加入站点上能/不能分析符合预期。

## 验证与回归检查
- 运行：`npm run lint`、`npm run type-check`（如可用）。
- 手动：
  - 新鲜安装：首次打开 Options 欢迎页→配置→分析并保存需求。
  - 已有配置场景：重启扩展后依然能分析、需求关联正常。
  - 白名单修改后生效，通用站点策略与 UI 文案一致。
