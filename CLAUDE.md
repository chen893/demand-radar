# 全局开发配置

## 语言和环境

- 语言：简体中文（包括代码注释和 commit 信息）
- 系统：Windows 11 + PowerShell
- 包管理器：pnpm

## 工具使用规则（强制）

**核心原则**：文件操作用专用工具，系统命令用 Bash

| 操作 | 使用工具 | 禁止 |
|------|---------|------|
| 读文件 | Read | cat/head/tail/Get-Content |
| 搜文件 | Glob | find/ls/Get-ChildItem |
| 搜内容 | Grep | grep/rg/Select-String |
| 编辑 | Edit | sed/awk |
| 创建 | Write | echo >/cat <<EOF |
| 系统命令 | Bash | git/npm/pnpm/docker 等 |

**Bash 仅用于**：git、pnpm、npm、vite、tsc、docker 等系统命令

**原因**：Bash 运行在 `/usr/bin/bash`，不支持 PowerShell 命令

### 文件修改工作流（必须遵守）

修改现有文件时，**必须**按以下顺序操作：

1. **先用 Read 读取文件**（获取当前内容）
2. **使用 Edit 工具修改**（触发 VSCode diff view）
3. **禁止用 Write 覆盖现有文件**（除非创建新文件）

**原因**：Edit 工具会在 VSCode 中显示修改前后的对比界面，方便用户审查更改

## 网络搜索

禁用 WebSearch，使用：
- mcp__fetch__fetch：获取已知 URL
- mcp__exa__web_search_exa：搜索信息/文档
- mcp__exa__get_code_context_exa：搜索代码/API 文档

## 复杂任务

- 需求分析：requirements-analyst 代理
- 架构设计：senior-code-architect 代理
- 代码审查：code-reviewer 代理
- 测试编写：vitest-tester 代理

## Git 规范

允许：log、status、diff、branch、show（只读操作）
禁止：commit、push、pull、merge、rebase、reset