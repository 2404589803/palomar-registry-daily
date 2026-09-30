# Palomar Registry Daily Dashboard

## English

This project fetches Palomar Registry data every day with GitHub Actions, preserves validated JSON snapshots, and publishes the dashboard to GitHub Pages.

### Use

1. Push this directory to a GitHub repository.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. The workflow runs daily at **02:15 UTC** and can also be started manually.

The fetcher reads `/api/v1/results`, `/recent.json`, and `/recent-renders.json`. It follows result pagination until the complete dataset is validated. Snapshots are stored in `data/snapshots/YYYY-MM-DD/`; the dashboard reads `data/latest.json`.

### Notion sync

The daily workflow upserts result versions into [Palomar Registry Daily Archive · Palomar注册库每日归档](https://app.notion.com/p/125fc41c6c43438a982ad31259645c2e), nested under [Palomar Registry Guide · Palomar注册库使用指南](https://app.notion.com/p/3cc08f4392d681009083c8ba96df90c8). Add the `NOTION_TOKEN` GitHub Actions secret for an integration shared with this database. The database ID is configured in `.github/workflows/daily.yml`. Synced page IDs are stored in `data/notion-sync-state.json`.

## 中文

本项目使用 GitHub Actions 每日抓取 Palomar Registry 数据，保存经过校验的 JSON 快照，并部署到 GitHub Pages。

### 使用方法

1. 将此目录推送到 GitHub 仓库。
2. 在 **Settings → Pages** 中选择 **GitHub Actions** 作为发布来源。
3. 工作流每天 **UTC 02:15** 自动运行，也可以手动启动。

抓取程序读取 `/api/v1/results`、`/recent.json` 和 `/recent-renders.json`，持续读取结果分页直到完整数据通过校验。快照保存于 `data/snapshots/YYYY-MM-DD/`，网站使用 `data/latest.json`。

### Notion 同步

每日工作流会把每个结果版本写入 [Palomar Registry Daily Archive · Palomar注册库每日归档](https://app.notion.com/p/125fc41c6c43438a982ad31259645c2e)，数据库位于 [Palomar Registry Guide · Palomar注册库使用指南](https://app.notion.com/p/3cc08f4392d681009083c8ba96df90c8) 下方。请添加已与该数据库共享的 Notion 集成令牌 `NOTION_TOKEN` GitHub Actions Secret。数据库 ID 已配置在 `.github/workflows/daily.yml` 中，同步后的页面 ID 保存在 `data/notion-sync-state.json`。
