# Sketch to HTML 转换器

基于 @wubafe/picasso-parse 核心算法库，将 Sketch 设计稿转换为 HTML/CSS 代码。

## 目录结构

```
sketch-to-html/
├── package.json
├── enhanced.js         # 核心转换脚本
├── test-enhanced.js    # 测试文件
├── CLAUDE.md           # 项目说明
├── README.md           # 本文件
└── output/             # 输出目录
```

## 安装依赖

```bash
cd sketch-to-html
npm install
```

## 使用方法

### 方式一：命令行

```bash
node enhanced.js <sketch文件路径> [输出目录]

# 示例
node enhanced.js ./design.sketch
node enhanced.js ./design.sketch ./output
```

### 方式二：在代码中引入

```javascript
const { SketchToHTML, CodeGenerator } = require('./enhanced.js');

// 完整转换
const converter = new SketchToHTML('./design.sketch', './output');
converter.convert();

// 生成单个 HTML
const dsl = SketchParser.parseArtboard(artboardData);
const fullHTML = CodeGenerator.generateFullHTML(dsl, 'PageName');
```

## 功能特性

### 支持的图层类型
- [x] Artboard (画板)
- [x] SymbolMaster (主控件)
- [x] Group (组)
- [x] Text (文本)
- [x] Shape (形状)
- [x] Image (图片)

### 支持的样式属性
- [x] 背景颜色 / 渐变
- [x] 透明度
- [x] 圆角
- [x] 边框
- [x] 阴影
- [x] 字体大小 / 颜色 / 粗细
- [x] 位置和尺寸

### 布局支持
- [x] 绝对定位
- [x] Flexbox 布局
- [x] 响应式视口

## 工作流程

```
Sketch 文件 (.sketch)
       ↓
    解压 (adm-zip)
       ↓
  读取 JSON (document.json + pages/*.json)
       ↓
  picassoArtboardCodeParse()  // @wubafe/picasso-parse
       ├─ parseArtboardLayer
       ├─ parseDSL
       ├─ picassoLayout
       └─ handleClassName
       ↓
  picassoCode()  // 生成 HTML/CSS
       ↓
  输出 HTML 文件
```

## 输出示例

输入 Sketch 文件后，生成语义化 HTML：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面名称</title>
    <style>
        /* Flexbox 布局样式 */
        .container { display: flex; flex-direction: column; }
        .card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">...</div>
        <div class="content">...</div>
    </div>
</body>
</html>
```

## 转换框架组件 (MCP)

配合 [sketch-to-framework skill](https://github.com/anthropics/claude-code-skills/tree/main/sketch-to-framework)，可将生成的 HTML 转换为 Vue/React 组件：

```
Sketch 文件 → enhanced.js MCP → 原始 HTML → 重构引擎 → Vue/React 组件
```

## 关于 Picasso 核心模块

本项目完整复用 @wubafe/picasso-parse 核心库：

| 模块 | 功能 |
|------|------|
| `picassoArtboardCodeParse` | Sketch 数据解析和 DSL 转换 |
| `picassoCode` | 生成 HTML/CSS/小程序代码 |
| `picassoWebCode` | Web 平台代码生成 |
| `picassoWeappCode` | 微信小程序代码生成 |
| `picassoRNCode` | React Native 代码生成 |

### Picasso 代码类型

```javascript
const { CodeType } = require('@wubafe/picasso-parse');

CodeType.WebPx      // Web CSS (px)
CodeType.Weapp      // 微信小程序 (rpx)
CodeType.ReactNative // React Native
```

## 限制和注意事项

1. **多 Page 处理**：默认只处理第一个 Page
2. **复杂动画**：无法还原复杂动画效果
3. **图片资源**：需要单独导出和替换
4. **Symbols**：支持基本的主控件解析

## 参考资料

- [@wubafe/picasso-parse](https://www.npmjs.com/package/@wubafe/picasso-parse)
- [Picasso GitHub](https://github.com/wuba/Picasso)
- [Sketch 文件格式](https://developer.sketch.com/file-format/)
