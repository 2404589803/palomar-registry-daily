# Palomar Registry Daily Dashboard

每日由 GitHub Actions 从 Palomar Registry API 获取数据，保存 JSON 快照，并部署到 GitHub Pages。

## 使用

1. 将此目录推送到 GitHub 仓库。
2. 在仓库 Settings → Pages 中选择 **GitHub Actions**。
3. 工作流会在每天 UTC 02:15 自动运行，也可手动触发。

抓取的接口：`/api/v1/results`、`/recent.json`、`/recent-renders.json`。结果分页会持续读取直到完成；数据保存于 `data/snapshots/YYYY-MM-DD/`，网站使用 `data/latest.json`。

## Notion sync

The MCP-created database is [Palomar Registry Daily Archive](https://app.notion.com/p/125fc41c6c43438a982ad31259645c2e), nested under Palomar Registry Guide · Palomar注册库使用指南. Add GitHub Actions secrets NOTION_TOKEN (an internal integration token shared with this database) and NOTION_DATABASE_ID=125fc41c6c43438a982ad31259645c2e. The daily workflow upserts result versions and stores page IDs in data/notion-sync-state.json.
