/**
 * Sketch to HTML - 使用 Picasso 核心算法
 *
 * 这个脚本演示了如何使用 Picasso 的核心算法思想
 * 将 Sketch 设计稿转换为高还原度的 HTML/CSS
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * Picasso 核心算法实现
 */
class PicassoCore {
    /**
     * 解析 Sketch 图层为 DSL（领域特定语言）
     * 参考: @wubafe/picasso-parse
     */
    static parseToDSL(layer, mode = 'code') {
        const dsl = {
            id: layer.do_objectID,
            name: layer.name,
            type: this.mapLayerType(layer.type),
            visible: layer.visible !== false,
            locked: layer.isLocked === true,
            frame: {
                x: layer.frame?.x || 0,
                y: layer.frame?.y || 0,
                width: layer.frame?.width || 0,
                height: layer.frame?.height || 0,
                minX: layer.frame?.x || 0,
                minY: layer.frame?.y || 0,
                maxX: (layer.frame?.x || 0) + (layer.frame?.width || 0),
                maxY: (layer.frame?.y || 0) + (layer.frame?.height || 0),
                haveWidth: !!layer.frame?.width,
                haveHeight: !!layer.frame?.height
            },
            style: this.parseStyle(layer.style, mode),
           原始数据: layer
        };

        // 递归处理子图层
        if (layer.layers && layer.layers.length > 0) {
            dsl.children = layer.layers
                .filter(child => child.visible !== false)
                .map(child => this.parseToDSL(child, mode));
        }

        return dsl;
    }

    /**
     * 映射图层类型
     * 参考: sketch-dsl
     */
    static mapLayerType(sketchType) {
        const typeMap = {
            'Artboard': 'artboard',
            'Group': 'group',
            'Text': 'text',
            'Shape': 'shape',
            'Image': 'image',
            'Slice': 'slice',
            'SymbolInstance': 'symbolMaster',
            'SymbolMaster': 'symbolMaster',
            'Oval': 'oval',
            'Rectangle': 'rectangle',
            'Star': 'star',
            'Triangle': 'triangle',
            'Polygon': 'polygon',
            'Line': 'line',
            'Vector': 'vector',
            'Hotspot': 'hotspot',
            'Page': 'page'
        };
        return typeMap[sketchType] || 'unknown';
    }

    /**
     * 解析样式
     * 参考: picasso-trans/formateDslStyle.ts
     */
    static parseStyle(style, mode = 'code') {
        if (!style) return null;

        const dslStyle = {
            // 背景
            backgroundColor: this.parseColor(style.backgroundColor),
            backgroundImage: style.backgroundImage ? {
                url: style.backgroundImage._ref,
                fillType: style.fillType || 0
            } : null,

            // 边框
            borderColor: this.parseColor(style.borderColor),
            borderWidth: style.borderWidth || 0,
            borderStyle: style.borderOptions ? 'solid' : 'none',
            borderRadius: style.borderRadius || 0,

            // 阴影
            boxShadow: this.parseShadow(style.shadows),
            innerShadow: this.parseShadow(style.innerShadows),

            // 透明度
            opacity: style.contextSettings?.opacity ?? 1,

            // 混合模式
            blendMode: style.contextSettings?.blendMode || 'normal',

            // 字体样式（仅 Text 图层）
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontStyle: style.textStyle?.verticalAlignment === 1 ? 'italic' : 'normal',
            textAlign: this.mapTextAlign(style.textAlignment),
            textColor: this.parseColor(style.textColor),
            textDecoration: style.textStyle?.underlineStyle ? 'underline' : 'none',
            lineHeight: style.lineHeightPx,
            letterSpacing: style.letterSpacing,
            paragraphSpacing: style.paragraphSpacing,

            // 渐变
            gradient: style.gradient ? this.parseGradient(style.gradient) : null,

            // 模糊
            backdropFilter: style.blur ? this.parseBlur(style.blur) : null
        };

        return dslStyle;
    }

    /**
     * 解析颜色
     * 参考: picasso-trans/colorTrans.ts
     */
    static parseColor(colorValue) {
        if (!colorValue) return null;

        if (typeof colorValue === 'string') {
            let hex = colorValue;
            let alpha = 1;

            // 处理 #AARRGGBB 格式
            if (hex.startsWith('#') && hex.length === 9) {
                alpha = parseInt(hex.slice(1, 3), 16) / 255;
                hex = '#' + hex.slice(3);
            }

            return {
                hex: hex.toUpperCase(),
                rgba: this.hexToRGBA(hex, alpha),
                css: alpha < 1 ? `rgba(${this.hexToRGB(hex)}, ${alpha.toFixed(2)})` : hex
            };
        }

        // 处理 Sketch 的 {r, g, b, a} 格式
        if (typeof colorValue === 'object') {
            const { r, g, b, a = 1 } = colorValue;
            const red = Math.round(r * 255);
            const green = Math.round(g * 255);
            const blue = Math.round(b * 255);
            return {
                hex: this.rgbToHex(red, green, blue),
                rgba: `rgba(${red}, ${green}, ${blue}, ${a})`,
                css: a < 1 ? `rgba(${red}, ${green}, ${blue}, ${a.toFixed(2)})` : `rgb(${red}, ${green}, ${blue})`
            };
        }

        return null;
    }

    static hexToRGB(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }

    static hexToRGBA(hex, alpha) {
        const rgb = this.hexToRGB(hex);
        return `rgba(${rgb}, ${alpha.toFixed(2)})`;
    }

    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    /**
     * 解析阴影
     */
    static parseShadow(shadows) {
        if (!shadows || shadows.length === 0) return null;

        const shadow = shadows[0];
        return {
            x: shadow.offsetX || 0,
            y: shadow.offsetY || 0,
            blur: shadow.blurRadius || 0,
            spread: shadow.spread || 0,
            color: this.parseColor(shadow.color),
            inset: shadow.isInset === true
        };
    }

    /**
     * 解析渐变
     */
    static parseGradient(gradient) {
        const stops = gradient.stops?.map(stop => ({
            color: this.parseColor(stop.color),
            position: stop.position || 0
        })) || [];

        return {
            type: gradient.gradientType || 0, // 0: 线性, 1: 径向
            angle: gradient.el || 0,
            stops: stops
        };
    }

    /**
     * 解析模糊效果
     */
    static parseBlur(blur) {
        return {
            type: blur.blurType || 0, // 0: 高斯, 1: 背景
            radius: blur.radius || 0,
            enabled: blur.enabled !== false
        };
    }

    /**
     * 映射文本对齐方式
     */
    static mapTextAlign(alignment) {
        const alignMap = {
            0: 'left',
            1: 'right',
            2: 'center',
            3: 'justify'
        };
        return alignMap[alignment] || 'left';
    }
}

/**
 * 样式转换器
 * 参考: picasso-trans
 */
class StyleTransformer {
    /**
     * 将 DSL 样式转换为 CSS
     */
    static toCSS(style, dsl = null, indent = 0) {
        if (!style) return '';

        const lines = [];

        // 背景颜色
        if (style.backgroundColor?.css) {
            lines.push(`background-color: ${style.backgroundColor.css};`);
        }

        // 背景图片
        if (style.backgroundImage) {
            lines.push(`background-image: url('${style.backgroundImage.url}');`);
        }

        // 渐变背景
        if (style.gradient) {
            lines.push(`background: ${this.gradientToCSS(style.gradient)};`);
        }

        // 边框
        if (style.borderWidth > 0) {
            const borderColor = style.borderColor?.css || 'transparent';
            lines.push(`border: ${style.borderWidth}px solid ${borderColor};`);
        }

        // 圆角
        if (style.borderRadius > 0) {
            lines.push(`border-radius: ${style.borderRadius}px;`);
        }

        // 阴影
        if (style.boxShadow) {
            lines.push(`box-shadow: ${this.shadowToCSS(style.boxShadow)};`);
        }

        // 内阴影
        if (style.innerShadow) {
            lines.push(`box-shadow: ${this.shadowToCSS(style.innerShadow, true)};`);
        }

        // 透明度
        if (style.opacity < 1) {
            lines.push(`opacity: ${style.opacity};`);
        }

        // 混合模式
        if (style.blendMode && style.blendMode !== 'normal') {
            lines.push(`mix-blend-mode: ${style.blendMode};`);
        }

        // 字体样式（仅对文本图层）
        if (style.fontSize) {
            lines.push(`font-size: ${style.fontSize}px;`);
        }
        if (style.fontFamily && dsl?.type === 'text') {
            lines.push(`font-family: "${style.fontFamily}", sans-serif;`);
        }
        if (style.fontWeight && style.fontWeight !== 400) {
            lines.push(`font-weight: ${style.fontWeight};`);
        }
        if (style.fontStyle === 'italic') {
            lines.push(`font-style: italic;`);
        }
        if (style.textColor?.css && dsl?.type === 'text') {
            lines.push(`color: ${style.textColor.css};`);
        }
        if (style.textAlign && style.textAlign !== 'left') {
            lines.push(`text-align: ${style.textAlign};`);
        }
        if (style.textDecoration === 'underline') {
            lines.push(`text-decoration: underline;`);
        }
        if (style.lineHeight) {
            lines.push(`line-height: ${style.lineHeight}px;`);
        }
        if (style.letterSpacing) {
            lines.push(`letter-spacing: ${style.letterSpacing}px;`);
        }

        // 模糊效果
        if (style.backdropFilter?.enabled) {
            lines.push(`backdrop-filter: blur(${style.backdropFilter.radius}px);`);
        }

        return lines.join('\n' + '  '.repeat(indent));
    }

    /**
     * 渐变转 CSS
     */
    static gradientToCSS(gradient) {
        const stops = gradient.stops
            .map(stop => `${stop.color.css} ${stop.position * 100}%`)
            .join(', ');

        if (gradient.type === 0) {
            // 线性渐变
            const angle = gradient.angle || 180;
            return `linear-gradient(${angle}deg, ${stops})`;
        } else {
            // 径向渐变
            return `radial-gradient(circle, ${stops})`;
        }
    }

    /**
     * 阴影转 CSS
     */
    static shadowToCSS(shadow, inset = false) {
        const { x, y, blur, spread, color } = shadow;
        const insetPrefix = inset ? 'inset ' : '';
        const colorStr = color?.css || 'rgba(0, 0, 0, 0.3)';
        return `${insetPrefix}${x}px ${y}px ${blur}px ${spread}px ${colorStr}`;
    }

    /**
     * 转换为内联样式对象
     */
    static toInlineStyle(style) {
        const css = this.toCSS(style);
        // 将 CSS 字符串转换为对象
        return css.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim().replace(';', ''))
            .reduce((obj, item) => {
                const [key, value] = item.split(':').map(s => s.trim());
                if (key && value) {
                    obj[key] = value;
                }
                return obj;
            }, {});
    }
}

/**
 * HTML 代码生成器
 * 参考: picasso-code
 */
class CodeGenerator {
    /**
     * 生成 CSS 代码
     */
    static generateCSS(dsl, options = {}) {
        let css = '';
        const { indent = 0 } = options;

        // 生成选择器
        const selector = this.getSelector(dsl);

        // 生成样式
        const styleCSS = StyleTransformer.toCSS(dsl.style, dsl, indent + 1);

        if (styleCSS) {
            css += `${'  '.repeat(indent)}${selector} {\n`;
            css += `${'  '.repeat(indent + 1)}${styleCSS}\n`;
            css += `${'  '.repeat(indent)}}\n\n`;
        }

        // 递归生成子元素样式
        if (dsl.children) {
            dsl.children.forEach(child => {
                css += this.generateCSS(child, options);
            });
        }

        return css;
    }

    /**
     * 生成 HTML 代码
     */
    static generateHTML(dsl, options = {}) {
        const { withWrapper = true } = options;

        // 确定 HTML 标签
        const tag = this.getTag(dsl);

        // 生成类名
        const className = this.getClassName(dsl);

        // 生成内联样式
        const inlineStyle = StyleTransformer.toInlineStyle(dsl.style);
        const styleString = Object.entries(inlineStyle)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');

        // 生成属性
        const attributes = [
            `class="${className}"`,
            styleString ? `style="${styleString}"` : null,
            `data-layer-id="${dsl.id}"`,
            `data-layer-type="${dsl.type}"`
        ].filter(Boolean).join(' ');

        // 生成内容
        let content = '';

        if (dsl.type === 'text' && dsl.name) {
            // 文本图层使用图层名称作为内容
            content = dsl.name;
        }

        // 递归生成子元素
        if (dsl.children && dsl.children.length > 0) {
            content += '\n';
            dsl.children.forEach((child, index) => {
                const childHTML = this.generateHTML(child, options);
                content += '  ' + childHTML.split('\n').join('\n  ');
                if (index < dsl.children.length - 1) {
                    content += '\n';
                }
            });
            content += '\n';
        }

        // 生成 HTML 标签
        if (content) {
            return `<${tag} ${attributes}>\n  ${content}</${tag}>`;
        } else if (dsl.type === 'image') {
            return `<${tag} ${attributes} />`;
        } else {
            return `<${tag} ${attributes}></${tag}>`;
        }
    }

    /**
     * 获取选择器
     */
    static getSelector(dsl) {
        const className = this.getClassName(dsl);
        return `.${className}`;
    }

    /**
     * 获取类名
     */
    static getClassName(dsl) {
        // 如果是文本图层，使用特殊处理
        if (dsl.type === 'text') {
            return `text-${dsl.id.slice(0, 8)}`;
        }

        let className = dsl.name
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
            .replace(/^-|-$/g, '');

        // 如果类名为空或以数字开头，使用 ID
        if (!className || /^\d/.test(className)) {
            className = `layer-${dsl.id.slice(0, 8)}`;
        }

        return className;
    }

    /**
     * 获取 HTML 标签
     */
    static getTag(dsl) {
        const typeMap = {
            'text': 'div',
            'image': 'img',
            'shape': 'div',
            'group': 'div',
            'artboard': 'section',
            'vector': 'svg',
            'symbolMaster': 'div'
        };
        return typeMap[dsl.type] || 'div';
    }

    /**
     * 生成完整 HTML 文件
     */
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

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
 * 主转换器类
 */
class SketchToHTML {
    constructor(sketchPath, outputDir = './output') {
        this.sketchPath = sketchPath;
        this.outputDir = outputDir;
        this.sketchData = null;
        this.pages = [];
    }

    /**
     * 加载 Sketch 文件
     */
    load() {
        console.log(`📂 加载: ${this.sketchPath}`);

        try {
            const zip = new AdmZip(this.sketchPath);

            // 读取 document.json
            const docEntry = zip.getEntry('document.json');
            if (!docEntry) {
                throw new Error('无效的 Sketch 文件');
            }

            this.sketchData = JSON.parse(docEntry.getData().toString('utf8'));

            // 读取页面
            this._loadPages(zip);

            console.log(`✅ 加载成功! 发现 ${this.pages.length} 个页面`);
            return this;
        } catch (error) {
            console.error('❌ 加载失败:', error.message);
            throw error;
        }
    }

    /**
     * 加载页面
     */
    _loadPages(zip) {
        const pageEntries = zip.getEntries()
            .filter(entry => entry.entryName.startsWith('pages/') && entry.entryName.endsWith('.json'));

        this.pages = pageEntries.map(entry => {
            const data = JSON.parse(entry.getData().toString('utf8'));
            return {
                id: data.do_objectID,
                name: data.name || '未命名页面',
                layers: data.layers || []
            };
        });
    }

    /**
     * 转换所有画板
     */
    convert() {
        if (!this.sketchData) {
            this.load();
        }

        // 创建输出目录
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        console.log('\n🚀 开始转换...\n');

        this.pages.forEach(page => {
            console.log(`📄 页面: ${page.name}`);

            const artboards = page.layers.filter(layer =>
                layer.type === 'Artboard' || layer.type === 'SymbolMaster'
            );

            artboards.forEach(artboard => {
                console.log(`  📐 画板: ${artboard.name}`);

                // 转换为 DSL
                const dsl = PicassoCore.parseToDSL(artboard);

                // 生成代码
                const fullHTML = CodeGenerator.generateFullHTML(dsl, artboard.name);

                // 保存文件
                const safeName = artboard.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');

                const outputPath = path.join(this.outputDir, `${safeName}.html`);
                fs.writeFileSync(outputPath, fullHTML, 'utf8');

                console.log(`  ✅ 已保存: ${outputPath}`);
            });
        });

        console.log(`\n🎉 完成! 输出目录: ${path.resolve(this.outputDir)}`);
    }

    /**
     * 转换单个画板
     */
    convertArtboard(artboardName) {
        for (const page of this.pages) {
            const artboard = page.layers.find(
                layer => layer.name === artboardName &&
                (layer.type === 'Artboard' || layer.type === 'SymbolMaster')
            );

            if (artboard) {
                const dsl = PicassoCore.parseToDSL(artboard);
                return {
                    dsl,
                    html: CodeGenerator.generateHTML(dsl),
                    css: CodeGenerator.generateCSS(dsl),
                    fullHTML: CodeGenerator.generateFullHTML(dsl, artboard.name)
                };
            }
        }

        return null;
    }
}

// 导出
module.exports = {
    SketchToHTML,
    PicassoCore,
    StyleTransformer,
    CodeGenerator
};

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🛠️ Sketch to HTML 转换器 (Picasso 核心算法版)

用法:
  node demo.js <sketch文件路径> [输出目录]

示例:
  node demo.js ./design.sketch
  node demo.js ./design.sketch ./output
`);
        process.exit(0);
    }

    const sketchPath = args[0];
    const outputDir = args[1] || './output';

    try {
        const converter = new SketchToHTML(sketchPath, outputDir);
        converter.convert();
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}
