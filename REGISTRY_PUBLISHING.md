# Comfy Registry 发布

本仓库已准备 Registry 发布配置，但配置文件存在不代表节点已上架。

## 首次发布

1. 登录 https://registry.comfy.org ，创建或选择自己的 Publisher。
2. `pyproject.toml` 的 `PublisherId` 已配置为用户确认的 `bridow`，发布密钥必须属于该 Publisher。
3. 在该 Publisher 下创建用于节点发布的 API Key。
4. 在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加 Repository secret，名称为 `REGISTRY_ACCESS_TOKEN`，值为上述 Registry API Key。不要使用 DeepSeek API Key。
5. 在 Actions 中选择 **Publish to Comfy Registry**，点击 **Run workflow**。
6. 检查运行日志与 Registry 节点页面，确认版本 `1.4.1` 的发布及审核状态。提交完成不代表审核已通过，也不保证 Manager 缓存立即更新。

节点 ID 为 `deepseek-prompt-chat`。发布前确认 Publisher ID 和节点 ID，因为创建后不能随意修改。

## 后续版本

更新 `pyproject.toml` 的版本号、前端代码和版本说明，提交并推送，再手动运行发布工作流。已发布版本不要重复上传。

发布包保留 `web/`、示例工作流和示例知识库；通过 `.comfyignore` 排除测试、GitHub 工作流和本地密钥文件。仅空白的 `.env.example` 可随包分发。

官方文档：https://docs.comfy.org/registry/publishing
