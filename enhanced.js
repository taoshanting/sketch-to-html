/**
 * Sketch to HTML - 增强版
 * 集成 Picasso 核心布局算法：分组识别 + 智能布局
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * 基础解析器（复用 demo.js 的核心逻辑）
 */
class BaseParser {
    static parseToDSL(layer) {
        const dsl = {
            id: layer.do_objectID,
            name: layer.name,
            type: this.mapLayerType(layer.type),
            visible: layer.visible !== false,
            frame: {
                x: layer.frame?.x || 0,
                y: layer.frame?.y || 0,
                width: layer.frame?.width || 0,
                height: layer.frame?.height || 0,
            },
            style: this.parseStyle(layer.style),
            children: []
        };

        if (layer.layers && layer.layers.length > 0) {
            dsl.children = layer.layers
                .filter(child => child.visible !== false)
                .map(child => this.parseToDSL(child));
        }

        return dsl;
    }

    static mapLayerType(sketchType) {
        const map = {
            'Artboard': 'artboard', 'Group': 'container', 'Text': 'text',
            'Shape': 'shape', 'Image': 'image', 'Rectangle': 'rectangle',
            'Oval': 'oval', 'Line': 'line', 'Vector': 'vector'
        };
        return map[sketchType] || 'unknown';
    }

    static parseStyle(style) {
        if (!style) return null;
        return {
            backgroundColor: this.parseColor(style.backgroundColor),
            borderColor: this.parseColor(style.borderColor),
            borderWidth: style.borderWidth || 0,
            borderRadius: style.borderRadius || 0,
            opacity: style.contextSettings?.opacity ?? 1,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            textColor: this.parseColor(style.textColor),
            textAlign: this.mapTextAlign(style.textAlignment),
            boxShadow: this.parseShadow(style.shadows),
        };
    }

    static parseColor(val) {
        if (!val) return null;
        if (typeof val === 'string') {
            let hex = val;
            let a = 1;
            if (hex.length === 9) { a = parseInt(hex.slice(1, 3), 16) / 255; hex = '#' + hex.slice(3); }
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { hex: hex.toUpperCase(), rgba: `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`, css: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : hex };
        }
        return null;
    }

    static parseShadow(shadows) {
        if (!shadows || !shadows.length) return null;
        const s = shadows[0];
        return { x: s.offsetX||0, y: s.offsetY||0, blur: s.blurRadius||0, spread: s.spread||0, color: this.parseColor(s.color) };
    }

    static mapTextAlign(a) { return ['left','right','center','justify'][a] || 'left'; }
}

/**
 * 分组识别算法（简化版 Picasso Group）
 * 识别：列表、卡片、网格、水平排列
 */
class LayoutGrouper {
    /**
     * 识别布局类型
     */
    static identifyLayout(children) {
        if (!children || children.length < 2) return null;

        const frames = children.map(c => c.frame);
        const gaps = this.calculateGaps(frames);

        // 判断是否为水平排列
        if (this.isHorizontalAlign(frames)) {
            return { type: 'row', gap: gaps.x };
        }

        // 判断是否为垂直列表
        if (this.isVerticalList(frames)) {
            return { type: 'column', gap: gaps.y, isList: true };
        }

        // 判断是否为网格
        if (this.isGrid(frames)) {
            return { type: 'grid', rows: 2, cols: Math.ceil(children.length / 2), gap: gaps.x };
        }

        // 判断是否为卡片集合
        if (this.isCardCollection(frames)) {
            return { type: 'card-collection', gap: gaps.y };
        }

        return null;
    }

    /**
     * 计算间距
     */
    static calculateGaps(frames) {
        // 过滤掉不完整的 frame
        const validFrames = frames.filter(f =>
            f && f.x !== undefined && f.y !== undefined &&
            f.width !== undefined && f.height !== undefined
        );

        let xGaps = [], yGaps = [];
        for (let i = 1; i < validFrames.length; i++) {
            xGaps.push(validFrames[i].x - (validFrames[i-1].x + validFrames[i-1].width));
            yGaps.push(validFrames[i].y - (validFrames[i-1].y + validFrames[i-1].height));
        }
        return {
            x: xGaps.length ? this.median(xGaps) : 0,
            y: yGaps.length ? this.median(yGaps) : 0
        };
    }

    static median(arr) {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a,b) => a-b);
        return sorted[Math.floor(sorted.length/2)];
    }

    /**
     * 判断水平对齐
     */
    static isHorizontalAlign(frames) {
        // 过滤掉没有完整 frame 的元素
        const validFrames = frames.filter(f =>
            f && f.x !== undefined && f.y !== undefined &&
            f.width !== undefined && f.height !== undefined
        );
        if (validFrames.length < 2) return false;

        const yValues = validFrames.map(f => f.y);
        const yVar = this.variance(yValues);
        const ySame = yVar < 10; // Y坐标基本相同

        // 检查 X 顺序
        let xOrdered = true;
        for (let i = 1; i < validFrames.length; i++) {
            const prev = validFrames[i-1];
            const curr = validFrames[i];
            if (!(curr.x > prev.x + prev.width - 10)) {
                xOrdered = false;
                break;
            }
        }

        return ySame && xOrdered && validFrames.length >= 2;
    }

    /**
     * 判断垂直列表
     */
    static isVerticalList(frames) {
        // 过滤掉没有完整 frame 的元素
        const validFrames = frames.filter(f =>
            f && f.x !== undefined && f.y !== undefined &&
            f.width !== undefined && f.height !== undefined
        );
        if (validFrames.length < 2) return false;

        const xValues = validFrames.map(f => f.x);
        const xVar = this.variance(xValues);
        const xSame = xVar < 10; // X坐标基本相同

        // 检查 Y 顺序
        let yOrdered = true;
        for (let i = 1; i < validFrames.length; i++) {
            const prev = validFrames[i-1];
            const curr = validFrames[i];
            if (!(curr.y > prev.y + prev.height - 10)) {
                yOrdered = false;
                break;
            }
        }

        return xSame && yOrdered && validFrames.length >= 2;
    }

    /**
     * 判断网格
     */
    static isGrid(frames) {
        const validFrames = frames.filter(f => f && typeof f.x === 'number');
        if (validFrames.length < 4) return false;
        const yValues = [...new Set(validFrames.map(f => Math.round(f.y)))].sort((a,b) => a-b);
        const xValues = [...new Set(validFrames.map(f => Math.round(f.x)))].sort((a,b) => a-b);
        return yValues.length >= 2 && xValues.length >= 2;
    }

    /**
     * 判断卡片集合
     */
    static isCardCollection(frames) {
        if (frames.length < 2) return false;
        // 卡片通常是相同大小、垂直排列
        const heights = frames.map(f => f.height);
        const sizeSame = this.variance(heights) < 100;
        return this.isVerticalList(frames) && sizeSame;
    }

    static variance(arr) {
        if (!arr.length) return 0;
        const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
        return arr.reduce((sum, v) => sum + Math.pow(v-mean, 2), 0) / arr.length;
    }

    /**
     * 处理分组
     */
    static group(children) {
        const layout = this.identifyLayout(children);
        if (!layout) return { children, layout: null };

        // 根据布局类型处理子元素
        const processedChildren = children.map(child => {
            if (child.children && child.children.length > 0) {
                child.children = this.group(child.children).children;
            }
            return child;
        });

        return { children: processedChildren, layout };
    }
}

/**
 * 布局计算器（简化版 Picasso Layout）
 */
class LayoutCalculator {
    /**
     * 计算布局样式
     */
    static calculate(layout, frame) {
        if (!layout) return null;

        const style = { display: 'flex' };

        switch (layout.type) {
            case 'row':
                style.flexDirection = 'row';
                style.alignItems = 'center';
                if (layout.gap > 0) style.gap = `${layout.gap}px`;
                break;

            case 'column':
                style.flexDirection = 'column';
                if (layout.gap > 0) style.gap = `${layout.gap}px`;
                break;

            case 'grid':
                style.flexDirection = 'row';
                style.flexWrap = 'wrap';
                style.alignItems = 'flex-start';
                if (layout.gap > 0) style.gap = `${layout.gap}px`;
                break;

            case 'card-collection':
                style.flexDirection = 'column';
                style.gap = '16px';
                break;

            default:
                return null;
        }

        return style;
    }

    /**
     * 应用布局到 DSL
     */
    static apply(dsl) {
        const result = this.processNode(dsl);
        return result;
    }

    static processNode(node) {
        if (!node.children || node.children.length === 0) return node;

        // 递归处理子节点
        node.children = node.children.map(child => this.processNode(child));

        // 尝试识别当前节点的布局
        const layoutInfo = LayoutGrouper.identifyLayout(node.children);

        if (layoutInfo) {
            node.layout = layoutInfo;
            node.layoutStyle = this.calculate(layoutInfo, node.frame);
        }

        return node;
    }
}

/**
 * 冗余结构清理（简化版 Picasso handleLayer）
 */
class StructureCleaner {
    static clean(dsl) {
        return this.cleanNode(dsl);
    }

    static cleanNode(node) {
        if (!node.children || !node.children.length) return node;

        // 清理空容器
        node.children = node.children.filter(child => {
            // 跳过 artboard 和有意义的容器
            if (node.type === 'artboard') return true;
            if (child.type !== 'container') return true;
            if (child.children && child.children.length > 0) return true;
            if (child.style?.backgroundColor) return true;
            return false;
        });

        // 递归清理子节点
        node.children = node.children.map(child => this.cleanNode(child));

        return node;
    }
}

/**
 * 样式转换器
 */
class StyleTransformer {
    static toCSS(style, dsl = null, indent = 0) {
        if (!style) return '';

        const lines = [];
        const sp = '  '.repeat(indent);

        // 背景
        if (style.backgroundColor?.css) {
            lines.push(`background-color: ${style.backgroundColor.css};`);
        }

        // 边框
        if (style.borderWidth > 0) {
            lines.push(`border: ${style.borderWidth}px solid ${style.borderColor?.css || '#000'};`);
        }

        // 圆角
        if (style.borderRadius > 0) {
            lines.push(`border-radius: ${style.borderRadius}px;`);
        }

        // 阴影
        if (style.boxShadow) {
            const s = style.boxShadow;
            const color = s.color?.css || 'rgba(0,0,0,0.3)';
            lines.push(`box-shadow: ${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${color};`);
        }

        // 透明度
        if (style.opacity < 1) {
            lines.push(`opacity: ${style.opacity};`);
        }

        // 字体
        if (dsl?.type === 'text') {
            if (style.fontSize) lines.push(`font-size: ${style.fontSize}px;`);
            if (style.fontFamily) lines.push(`font-family: "${style.fontFamily}", sans-serif;`);
            if (style.fontWeight && style.fontWeight !== 400) lines.push(`font-weight: ${style.fontWeight};`);
            if (style.textColor?.css) lines.push(`color: ${style.textColor.css};`);
            if (style.textAlign && style.textAlign !== 'left') lines.push(`text-align: ${style.textAlign};`);
        }

        return lines.join(`\n${sp}`);
    }

    static toInline(style) {
        const css = this.toCSS(style);
        return css.split('\n').map(l => l.replace(';', '')).join('; ');
    }
}

/**
 * 代码生成器
 */
class CodeGenerator {
    static generateCSS(dsl, options = {}) {
        let css = '';
        const { indent = 0 } = options;
        const sp = '  '.repeat(indent);

        const className = this.getClassName(dsl);
        const styleCSS = StyleTransformer.toCSS(dsl.style, dsl, 1);

        if (styleCSS) {
            css += `${sp}.${className} {\n${sp}  ${styleCSS}\n${sp}}\n\n`;
        }

        // 布局样式
        if (dsl.layoutStyle) {
            css += `${sp}.${className} {\n`;
            Object.entries(dsl.layoutStyle).forEach(([k, v]) => {
                const cssProp = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                css += `${sp}  ${cssProp}: ${v};\n`;
            });
            css += `${sp}}\n\n`;
        }

        if (dsl.children) {
            dsl.children.forEach(child => {
                css += this.generateCSS(child, options);
            });
        }

        return css;
    }

    static generateHTML(dsl, options = {}) {
        const className = this.getClassName(dsl);
        const tag = this.getTag(dsl);
        const inlineStyle = StyleTransformer.toInline(dsl.style);
        const layoutStyle = dsl.layoutStyle ?
            Object.entries(dsl.layoutStyle).map(([k,v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${v}`).join('; ') : '';

        const fullStyle = [inlineStyle, layoutStyle].filter(Boolean).join('; ');
        const styleAttr = fullStyle ? `style="${fullStyle}"` : '';

        let content = '';
        if (dsl.type === 'text' && dsl.name) {
            content = dsl.name;
        }

        if (dsl.children && dsl.children.length > 0) {
            content += '\n';
            dsl.children.forEach((child, i) => {
                const childHTML = this.generateHTML(child, options);
                content += '  ' + childHTML.split('\n').join('\n  ');
                if (i < dsl.children.length - 1) content += '\n';
            });
            content += '\n';
        }

        const attr = [
            `class="${className}"`,
            styleAttr,
            `data-layer-id="${dsl.id}"`,
            `data-layer-type="${dsl.type}"`
        ].filter(Boolean).join(' ');

        if (content) {
            return `<${tag} ${attr}>\n  ${content}</${tag}>`;
        } else if (dsl.type === 'image') {
            return `<${tag} ${attr} />`;
        } else {
            return `<${tag} ${attr}></${tag}>`;
        }
    }

    static getClassName(dsl) {
        // 处理 name 不存在的情况
        if (!dsl.name) {
            return `layer-${(dsl.id || 'unknown').slice(0, 6)}`;
        }

        if (dsl.type === 'text') return `text-${dsl.id.slice(0, 6)}`;
        let name = dsl.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
        if (!name || /^\d/.test(name)) name = `layer-${dsl.id.slice(0, 6)}`;
        return name;
    }

    static getTag(dsl) {
        const map = { text: 'div', image: 'img', shape: 'div', container: 'div', artboard: 'section' };
        return map[dsl.type] || 'div';
    }

    static generateFullHTML(dsl, title = 'Sketch Export') {
        const css = this.generateCSS(dsl);
        const html = this.generateHTML(dsl);
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
${css}
    </style>
</head>
<body>
${html}
</body>
</html>`;
    }
}

/**
 * 主转换器
 */
class SketchToHTML {
    constructor(sketchPath, outputDir = './output') {
        this.sketchPath = sketchPath;
        this.outputDir = outputDir;
    }

    load() {
        console.log(`📂 加载: ${this.sketchPath}`);
        const zip = new AdmZip(this.sketchPath);
        const entry = zip.getEntry('document.json');
        if (!entry) throw new Error('无效的 Sketch 文件');
        this.sketchData = JSON.parse(entry.getData().toString('utf8'));

        this.pages = [];
        zip.getEntries().filter(e => e.entryName.startsWith('pages/') && e.entryName.endsWith('.json')).forEach(entry => {
            const data = JSON.parse(entry.getData().toString('utf8'));
            this.pages.push({ name: data.name, layers: data.layers || [] });
        });
        console.log(`✅ 发现 ${this.pages.length} 个页面`);
        return this;
    }

    convert() {
        if (!this.sketchData) this.load();
        if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });

        console.log('\n🚀 开始转换...\n');

        this.pages.forEach(page => {
            console.log(`📄 ${page.name}`);
            page.layers.filter(l => l.type === 'Artboard').forEach(artboard => {
                console.log(`  📐 ${artboard.name}`);

                // 基础解析
                let dsl = BaseParser.parseToDSL(artboard);

                // 布局识别与分组
                dsl = LayoutCalculator.apply(dsl);

                // 清理冗余结构
                dsl = StructureCleaner.clean(dsl);

                // 生成代码
                const html = CodeGenerator.generateFullHTML(dsl, artboard.name);

                // 保存
                const safeName = artboard.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                fs.writeFileSync(path.join(this.outputDir, `${safeName}.html`), html);
                console.log(`  ✅ 已保存: ${safeName}.html`);
            });
        });

        console.log(`\n🎉 完成! 输出: ${path.resolve(this.outputDir)}`);
    }
}

module.exports = { SketchToHTML, BaseParser, LayoutGrouper, LayoutCalculator, StructureCleaner, CodeGenerator };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`\n🛠️ Sketch to HTML 增强版 (Picasso 布局算法)\n用法: node enhanced.js <sketch文件> [输出目录]\n`);
        process.exit(0);
    }
    const converter = new SketchToHTML(args[0], args[1] || './output');
    converter.convert();
}
