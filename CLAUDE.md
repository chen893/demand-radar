# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Demand Radar** is a browser extension that helps users capture and analyze market demand signals from web pages using LLM-powered analysis. The plugin extracts content from sites like Reddit and Zhihu, identifies user pain points, and generates actionable product opportunity insights.

## Tech Stack (Planned)

- **Framework**: Plasmo (Chrome Extension MV3)
- **UI**: React 18 + Tailwind CSS
- **State Management**: Zustand
- **Local Storage**: IndexedDB via Dexie.js
- **Content Extraction**: @mozilla/readability + Turndown
- **HTML Sanitization**: DOMPurify
- **LLM Providers**: OpenAI / Google / DeepSeek (user-provided API keys)

## Development Commands

```bash
# Development mode with HMR
npm run dev

# Production build
npm run build

# Package for Chrome Web Store
npm run package
```

## Architecture

```
src/
├── background/           # MV3 Service Worker
│   ├── db/              # Dexie.js schema and operations
│   ├── llm/             # Multi-provider LLM service
│   └── content/         # PII filtering, deduplication
├── content-scripts/      # Platform-specific extractors
│   ├── reddit.ts        # Reddit adapter
│   ├── zhihu.ts         # Zhihu adapter
│   └── generic.ts       # Readability fallback
├── components/
│   └── sidepanel/       # Main UI (RefineView, SolutionList, Settings)
├── store/               # Zustand stores
└── types/               # TypeScript interfaces
```

### Data Model

Two-tier structure with 1:N relationship:
- **Extraction**: Source page metadata, original text, analysis status
- **Solution**: Individual product opportunity with validation evidence

### Key Constraints

- Single record storage limit: 500KB (auto-truncate originalText/summary)
- PII filtering before LLM transmission (email, phone, ID, card, IP)
- Chrome Storage Sync for metadata backup only (≤100KB quota)

## Coding Standards

- **Language**: Chinese for explanations, English for code/comments/commits
- **TypeScript**: Strict mode (`strict: true`), no implicit `any`
- **Naming**: PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `chore:`)
- **Package Manager**: pnpm preferred

## Platform Adapters

Content extraction uses a strategy pattern with platform-specific selectors:
- Reddit: Post content + comment tree (max 8000 chars)
- Zhihu: Question + answers with "show more" expansion
- Generic: Readability parse with `document.body.innerText` fallback

## LLM Error Handling

```
INVALID_API_KEY / QUOTA_EXCEEDED → User action required
TIMEOUT / NETWORK_ERROR / SERVICE_UNAVAILABLE → Fallback to Readability summary
```

## Key Documentation

- `docs/prd2.0`: Product requirements (2.0)
- `docs/tech-spec-langchain.md`: Technical specification (v2.0)
- `AGENT.md`: AI assistant coding guidelines
- `@docs-langchain`: Langchain.js documentation,claude code可以通过 mcp 检索 langchain文档
- `docs/implementation-plan.md`: Implementation plan (v2.0)