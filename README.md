# Sketch to HTML 转换器

基于 Picasso 核心算法思想，将 Sketch 设计稿转换为 HTML/CSS 代码。

## 目录结构

```
sketch-to-html/
├── package.json
├── convert.js          # 核心转换脚本
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
node convert.js <sketch文件路径> [输出目录]

# 示例
node convert.js ./design.sketch
node convert.js ./design.sketch ./output
```

### 方式二：在代码中引入

```javascript
const SketchToHtml = require('./convert.js');

const converter = new SketchToHtml('./design.sketch', './output');

// 转换整个文件
converter.convert();

// 或转换单个画板
const result = converter.convertArtboard('Homepage');
console.log(result.html);
console.log(result.css);
```

## 支持的功能

### 图层类型
- [x] Artboard (画板)
- [x] Group (组)
- [x] Text (文本)
- [x] Shape (形状)
- [x] Image (图片)

### 样式属性
- [x] 背景颜色
- [x] 透明度
- [x] 圆角
- [x] 边框
- [x] 阴影
- [x] 字体大小
- [x] 字体颜色
- [x] 位置和尺寸

### 布局
- [x] 绝对定位
- [x] Flexbox 布局

## 工作流程

```
Sketch 文件 (.sketch)
       ↓
    解压 (ZIP)
       ↓
  读取 JSON 数据
       ↓
  解析图层 → DSL
       ↓
  生成 HTML/CSS
       ↓
  输出 HTML 文件
```

## 实现原理

### 1. Sketch 文件结构
Sketch 文件本质是一个 ZIP 压缩包，包含：
- `document.json` - 文档元数据
- `pages/` - 页面 JSON 文件
- `meta.json` - 元信息
- `user.json` - 用户数据

### 2. 核心算法（来自 Picasso）

**解析流程：**
1. **图层解析** - 将 Sketch 图层转换为 DSL（Domain Specific Language）
2. **样式转换** - 转换颜色、尺寸、字体等样式
3. **布局处理** - 计算位置和 Flexbox 布局
4. **代码生成** - 生成 HTML 和 CSS

### 3. DSL 结构

```typescript
interface DSL {
  id: string;           // 图层 ID
  name: string;         // 图层名称
  type: LayerType;      // 图层类型
  frame: {
    x: number;          // X 坐标
    y: number;          // Y 坐标
    width: number;      // 宽度
    height: number;     // 高度
  };
  style: {
    backgroundColor: Color;
    borderRadius: number;
    opacity: number;
    // ... 更多样式
  };
  children: DSL[];      // 子图层
}
```

## 关于 Picasso 核心模块

本项目参考了 Picasso 的核心算法：

| Picasso 模块 | 功能 | 本项目对应 |
|--------------|------|-----------|
| `@wubafe/picasso-parse` | Sketch 数据解析和 DSL 转换 | `parseLayerToDSL()` |
| `picasso-trans` | 样式转换 | `_parseStyle()` |
| `picasso-code` | 生成 HTML/CSS 代码 | `generateHTML()` + `generateCSS()` |

## 限制和注意事项

1. **100% 还原度的挑战**：
   - 复杂动画效果无法还原
   - 部分 Sketch 特性（如 Symbols）需要额外处理
   - 图片资源需要单独导出

2. **需要手动调整**：
   - 字体文件需要自行引入
   - 图片资源需要替换
   - 响应式布局需要微调

## 高级用法

### 自定义样式转换

```javascript
const converter = new SketchToHtml('design.sketch');

// 转换后自定义处理
const result = converter.convertArtboard('Homepage');

// 添加自定义 CSS
const customCSS = `
.custom-class {
  /* 你的自定义样式 */
}
`;

const fullHTML = result.fullHTML.replace('</style>', `${customCSS}</style>`);
```

### 批量处理

```javascript
const fs = require('fs');
const SketchToHtml = require('./convert.js');

const files = fs.readdirSync('./sketches')
  .filter(f => f.endsWith('.sketch'));

files.forEach(file => {
  const converter = new SketchToHtml(`./sketches/${file}`);
  converter.convert();
});
```

## 下一步改进

- [ ] 支持图片资源导出
- [ ] 支持 Symbols 和组件
- [ ] 支持更复杂的布局算法
- [ ] 添加 Webpack/Vite 插件
- [ ] 支持 Vue/React 组件生成

## 参考资料

- [Picasso GitHub](https://github.com/wuba/Picasso)
- [Sketch 文件格式](https://developer.sketch.com/file-format/)
