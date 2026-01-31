# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sketch 文件转 HTML/CSS 转换器。**完整复用 @wubafe/picasso-parse 核心算法库**。

## Commands

```bash
# 运行转换器
node enhanced.js <sketch文件路径> [输出目录]

# 运行测试
node test-enhanced.js
```

## Architecture

```
Sketch 文件 (.sketch)
       ↓
    解压 (adm-zip)
       ↓
  读取 JSON (document.json + pages/*.json)
       ↓
  picassoArtboardCodeParse()  // @wubafe/picasso-parse
       ├─ parseArtboardLayer   // 画板处理
       ├─ parseDSL             // DSL 处理
       ├─ picassoGroup         // 特征分组
       ├─ picassoLayout        // 布局处理
       └      // 添加 className
       ↓─ handleClassName
  picassoWebCode()  // @wubafe/picasso-parse
       ↓
  生成 HTML/CSS
       ↓
  输出 HTML 文件
```

### Picasso 库 API

```javascript
// 解析 Sketch 图层到 DSL
const { picassoArtboardCodeParse } = require('@wubafe/picasso-parse');
const dsl = picassoArtboardCodeParse(artboardLayer);

// 代码生成
const { picassoWebCode, picassoWeappCode, picassoRNCode } = require('@wubafe/picasso-parse');
const { css, html } = picassoWebCode(dsl);

// 样式转换
const { picassoTrans, CodeType, Unit, ColorFormat } = require('@wubafe/picasso-parse');
const result = picassoTrans(dsl, { scale, unit, colorFormat, codeType });
```

### 支持的输出平台

- `CodeType.WebPx` - Web CSS
- `CodeType.Weapp` - 微信小程序
- `CodeType.ReactNative` - React Native

## Sketch 文件格式

Sketch 文件本质是 ZIP 压缩包，包含：
- `document.json` - 文档元数据
- `pages/` - 页面 JSON 文件

## 技术栈

- Node.js 原生模块
- adm-zip - ZIP 文件处理
- @wubafe/picasso-parse - Picasso 核心解析库（包含 picasso-parse, picasso-trans, picasso-code-browser）
