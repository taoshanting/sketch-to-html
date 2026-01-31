/**
 * Sketch to HTML 转换器
 * 基于 Picasso 核心算法思想
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class SketchToHtml {
    constructor(sketchPath, outputDir = './output') {
        this.sketchPath = sketchPath;
        this.outputDir = outputDir;
        this.sketchData = null;
        this.pages = [];
    }

    /**
     * 解压并读取 sketch 文件
     */
    load() {
        console.log(`📂 加载 Sketch 文件: ${this.sketchPath}`);

        try {
            const zip = new AdmZip(this.sketchPath);
            // sketch 文件中的 JSON 数据在 document.json 和 pages 目录下
            const entry = zip.getEntry('document.json');
            if (!entry) {
                throw new Error('无效的 Sketch 文件');
            }

            const content = entry.getData().toString('utf8');
            this.sketchData = JSON.parse(content);
            console.log('✅ Sketch 文件加载成功');

            // 获取所有页面
            this._loadPages(zip);
            return this;
        } catch (error) {
            console.error('❌ 加载失败:', error.message);
            throw error;
        }
    }

    /**
     * 加载页面数据
     */
    _loadPages(zip) {
        const pageRegex = /^pages\/.+\.json$/;
        const pageEntries = zip.getEntries().filter(entry =>
            pageRegex.test(entry.entryName)
        );

        this.pages = pageEntries.map(entry => {
            const data = JSON.parse(entry.getData().toString('utf8'));
            return {
                name: data.name || '未命名页面',
                id: data.do_objectID,
                layers: data.layers || []
            };
        });

        console.log(`📄 发现 ${this.pages.length} 个页面`);
    }

    /**
     * 解析图层为 DSL
     */
    parseLayerToDSL(layer, parentFrame = null) {
        const dsl = {
            id: layer.do_objectID,
            name: layer.name,
            type: this._mapLayerType(layer.type),
            frame: {
                x: layer.frame?.x || 0,
                y: layer.frame?.y || 0,
                width: layer.frame?.width || 0,
                height: layer.frame?.height || 0
            },
            style: this._parseStyle(layer.style),
            children: []
        };

        // 处理子图层
        if (layer.layers && layer.layers.length > 0) {
            dsl.children = layer.layers.map(child =>
                this.parseLayerToDSL(child, dsl.frame)
            );
        }

        return dsl;
    }

    /**
     * 映射 Sketch 图层类型到 DSL 类型
     */
    _mapLayerType(sketchType) {
        const typeMap = {
            'Artboard': 'artboard',
            'Group': 'group',
            'Text': 'text',
            'Shape': 'shape',
            'Image': 'image',
            'Slice': 'slice',
            'SymbolInstance': 'symbol',
            'SymbolMaster': 'symbolMaster',
            'Oval': 'oval',
            'Rectangle': 'rectangle',
            'Star': 'star',
            'Triangle': 'triangle',
            'Polygon': 'polygon',
            'Line': 'line',
            'Vector': 'vector',
            'Hotspot': 'hotspot'
        };
        return typeMap[sketchType] || 'unknown';
    }

    /**
     * 解析样式
     */
    _parseStyle(style) {
        if (!style) return {};

        return {
            backgroundColor: this._parseColor(style.backgroundColor),
            borderColor: this._parseColor(style.borderColor),
            borderWidth: style.borderWidth || 0,
            borderRadius: style.borderRadius || 0,
            opacity: style.contextSettings?.opacity ?? 1,
            shadow: this._parseShadow(style),
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            textAlign: style.textAlignment,
            textColor: this._parseColor(style.textColor),
            // 布局属性
            flex: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
            }
        };
    }

    /**
     * 解析颜色
     */
    _parseColor(colorValue) {
        if (!colorValue) return null;

        // Sketch 颜色格式: #AARRGGBB 或 #RRGGBB
        if (typeof colorValue === 'string') {
            let hex = colorValue;
            let alpha = 1;

            if (hex.length === 9) {
                alpha = parseInt(hex.slice(1, 3), 16) / 255;
                hex = '#' + hex.slice(3);
            }

            return {
                hex: hex.toUpperCase(),
                rgba: this._hexToRgba(hex, alpha)
            };
        }

        return null;
    }

    /**
     * Hex 转 RGBA
     */
    _hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }

    /**
     * 解析阴影
     */
    _parseShadow(style) {
        if (!style.shadows || style.shadows.length === 0) return null;

        const shadow = style.shadows[0];
        return {
            x: shadow.offsetX || 0,
            y: shadow.offsetY || 0,
            blur: shadow.blurRadius || 0,
            spread: shadow.spread || 0,
            color: this._parseColor(shadow.color)
        };
    }

    /**
     * 生成 CSS
     */
    generateCSS(dsl, indent = 0) {
        let css = '';
        const spaces = '  '.repeat(indent);

        // 生成类选择器
        const className = this._toKebabCase(dsl.name);

        // 计算样式字符串
        const styleParts = [];

        if (dsl.style?.backgroundColor) {
            styleParts.push(`background-color: ${dsl.style.backgroundColor.rgba};`);
        }

        if (dsl.style?.opacity < 1) {
            styleParts.push(`opacity: ${dsl.style.opacity};`);
        }

        if (dsl.style?.borderRadius) {
            styleParts.push(`border-radius: ${dsl.style.borderRadius}px;`);
        }

        if (dsl.style?.borderWidth) {
            styleParts.push(`border: ${dsl.style.borderWidth}px solid ${dsl.style.borderColor?.rgba || 'transparent'};`);
        }

        if (dsl.style?.shadow) {
            const s = dsl.style.shadow;
            const color = s.color?.rgba || 'rgba(0,0,0,0.3)';
            styleParts.push(`box-shadow: ${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${color};`);
        }

        // 位置和尺寸
        if (dsl.type === 'artboard') {
            styleParts.push(`position: relative;`);
        } else {
            styleParts.push(`position: absolute;`);
        }
        styleParts.push(`left: ${dsl.frame.x}px;`);
        styleParts.push(`top: ${dsl.frame.y}px;`);
        styleParts.push(`width: ${dsl.frame.width}px;`);
        styleParts.push(`height: ${dsl.frame.height}px;`);

        // Flex 布局
        styleParts.push(`display: flex;`);
        styleParts.push(`flex-direction: column;`);
        styleParts.push(`align-items: flex-start;`);

        // 字体样式
        if (dsl.type === 'text') {
            if (dsl.style?.fontSize) {
                styleParts.push(`font-size: ${dsl.style.fontSize}px;`);
            }
            if (dsl.style?.fontFamily) {
                styleParts.push(`font-family: "${dsl.style.fontFamily}", sans-serif;`);
            }
            if (dsl.style?.fontWeight) {
                styleParts.push(`font-weight: ${dsl.style.fontWeight};`);
            }
            if (dsl.style?.textColor) {
                styleParts.push(`color: ${dsl.style.textColor.rgba};`);
            }
        }

        if (styleParts.length > 0) {
            css += `${spaces}.${className} {\n`;
            styleParts.forEach(part => {
                css += `${spaces}  ${part}\n`;
            });
            css += `${spaces}}\n\n`;
        }

        // 递归处理子元素
        dsl.children.forEach(child => {
            css += this.generateCSS(child, indent);
        });

        return css;
    }

    /**
     * 生成 HTML
     */
    generateHTML(dsl) {
        const className = this._toKebabCase(dsl.name);

        // 文本内容
        let content = '';

        // 特殊处理某些类型
        if (dsl.type === 'text') {
            // 尝试从用户信息中获取文本
            content = dsl.name; // 默认使用图层名称作为文本
        }

        // 递归生成子元素 HTML
        const childrenHTML = dsl.children
            .map(child => this.generateHTML(child))
            .join('\n');

        // 根据类型生成不同的 HTML 标签
        let tag = 'div';
        if (dsl.type === 'text') {
            tag = 'div'; // 或使用 span/p
        } else if (dsl.type === 'image') {
            tag = 'img';
        }

        let html = '';

        if (dsl.type === 'image') {
            html += `<${tag} class="${className}" src="" alt="${dsl.name}">`;
        } else {
            html += `<${tag} class="${className}">\n`;
            if (content) {
                html += `  ${content}\n`;
            }
            if (childrenHTML) {
                html += childrenHTML + '\n';
            }
            html += `</${tag}>`;
        }

        return html;
    }

    /**
     * 转换命名（驼峰转烤串）
     */
    _toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * 转换整个文件
     */
    convert() {
        if (!this.sketchData) {
            this.load();
        }

        // 确保输出目录存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        console.log('\n🚀 开始转换...\n');

        // 遍历所有页面
        this.pages.forEach((page, pageIndex) => {
            console.log(`📄 处理页面: ${page.name}`);

            // 解析每个画板
            const artboards = page.layers.filter(layer =>
                layer.type === 'Artboard' || layer.type === 'SymbolMaster'
            );

            artboards.forEach((artboard, index) => {
                console.log(`  📐 处理画板: ${artboard.name}`);

                // 转换为 DSL
                const dsl = this.parseLayerToDSL(artboard);

                // 生成 CSS
                const css = this.generateCSS(dsl);

                // 生成 HTML
                const html = this.generateHTML(dsl);

                // 组装完整 HTML
                const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=${dsl.frame.width}, initial-scale=1.0">
    <title>${artboard.name}</title>
    <style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

${css}
    </style>
</head>
<body>
${html}
</body>
</html>`;

                // 保存文件
                const safeName = this._toKebabCase(artboard.name);
                const htmlPath = path.join(this.outputDir, `${safeName}.html`);

                fs.writeFileSync(htmlPath, fullHTML, 'utf8');
                console.log(`  ✅ 已保存: ${htmlPath}`);
            });
        });

        console.log('\n🎉 转换完成！');
        console.log(`📁 输出目录: ${path.resolve(this.outputDir)}`);
    }

    /**
     * 转换单个画板
     */
    convertArtboard(artboardName) {
        if (!this.sketchData) {
            this.load();
        }

        // 查找画板
        for (const page of this.pages) {
            const artboard = page.layers.find(
                layer => layer.name === artboardName &&
                (layer.type === 'Artboard' || layer.type === 'SymbolMaster')
            );

            if (artboard) {
                const dsl = this.parseLayerToDSL(artboard);
                const css = this.generateCSS(dsl);
                const html = this.generateHTML(dsl);

                return {
                    css,
                    html,
                    fullHTML: this._wrapHTML(artboard.name, css, html)
                };
            }
        }

        return null;
    }

    /**
     * 包装为完整 HTML
     */
    _wrapHTML(title, css, html) {
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

// 导出类
module.exports = SketchToHtml;

// 如果直接运行
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🛠️ Sketch to HTML 转换器

用法:
  node convert.js <sketch文件路径> [输出目录]

示例:
  node convert.js ./design.sketch
  node convert.js ./design.sketch ./output
`);
        process.exit(0);
    }

    const sketchPath = args[0];
    const outputDir = args[1] || './output';

    try {
        const converter = new SketchToHtml(sketchPath, outputDir);
        converter.convert();
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}
