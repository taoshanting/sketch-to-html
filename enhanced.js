/**
 * Sketch to HTML - 基于 Picasso 核心算法
 * 完整复用 @wubafe/picasso-parse 核心库
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// 复用 Picasso 核心库（主包已导出所有必需 API）
const {
    picassoArtboardCodeParse,
    picassoCode,
    picassoWebCode,
    picassoWeappCode,
    picassoRNCode,
    WebScale,
    IOSScale,
    AndroidScale,
    Unit,
    ColorFormat,
    CodeType
} = require('@wubafe/picasso-parse');

/**
 * Sketch 解析器 - 包装 Picasso
 */
class SketchParser {
    static parseArtboard(artboardData) {
        return picassoArtboardCodeParse(artboardData);
    }
}

/**
 * 样式转换器 - 包装 Picasso trans
 */
class StyleTransformer {
    static transform(dsl, options = {}) {
        const {
            scale = WebScale.Points,
            unit = Unit.WebPx,
            colorFormat = ColorFormat.RGBA,
            codeType = CodeType.WebPx
        } = options;

        // picassoArtboardCodeParse 已内置样式转换，这里保留接口
        return dsl;
    }
}

/**
 * 代码生成器 - 包装 Picasso code
 */
class CodeGenerator {
    static generate(dsl, size = 375, platform = CodeType.WebPx) {
        // picassoCode 期望数组参数
        const result = picassoCode([dsl], size, platform);
        // 返回 css 和 html
        return {
            css: result.css || '',
            html: result.html || ''
        };
    }

    static generateFullHTML(dsl, title = 'Sketch Export') {
        const { css, html } = this.generate(dsl);

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

        if (!entry) {
            throw new Error('无效的 Sketch 文件');
        }

        this.sketchData = JSON.parse(entry.getData().toString('utf8'));

        this.pages = [];
        zip.getEntries()
            .filter(e => e.entryName.startsWith('pages/') && e.entryName.endsWith('.json'))
            .forEach(entry => {
                const data = JSON.parse(entry.getData().toString('utf8'));
                this.pages.push({
                    name: data.name,
                    layers: data.layers || []
                });
            });

        console.log(`✅ 发现 ${this.pages.length} 个页面`);
        return this;
    }

    convert() {
        if (!this.sketchData) {
            this.load();
        }

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        console.log('\n🚀 开始转换...\n');

        // 只处理第一个 page
        const artboards = [];
        const firstPage = this.pages[0];

        if (!firstPage) {
            console.log('❌ 未找到任何 page');
            return;
        }

        console.log(`📄 ${firstPage.name} (仅处理此 page)`);

        firstPage.layers
            .filter(l => (l.type === 'Artboard' || l._class === 'artboard' || l._class === 'symbolMaster'))
            .forEach(artboard => {
                console.log(`  📐 ${artboard.name}`);

                // 使用 Picasso 解析
                const dsl = SketchParser.parseArtboard(artboard);

                // 生成完整 HTML
                const fullHTML = CodeGenerator.generateFullHTML(dsl, artboard.name);

                artboards.push({
                    name: artboard.name,
                    html: fullHTML
                });
            });

        // 只保留最后一个 artboard 的 HTML
        if (artboards.length > 0) {
            const lastArtboard = artboards[artboards.length - 1];
            const safeName = lastArtboard.name
                .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 100);

            const outputPath = path.join(this.outputDir, `${safeName}.html`);
            fs.writeFileSync(outputPath, lastArtboard.html, 'utf8');

            console.log(`  ✅ 已保存: ${safeName}.html`);
        }

        console.log(`\n🎉 完成! 输出: ${path.resolve(this.outputDir)}`);
    }
}

module.exports = {
    SketchToHTML,
    SketchParser,
    StyleTransformer,
    CodeGenerator,
    // 导出 Picasso 常量
    WebScale,
    IOSScale,
    AndroidScale,
    Unit,
    ColorFormat,
    CodeType
};

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🛠️ Sketch to HTML (Picasso 核心算法版)

用法:
  node enhanced.js <sketch文件路径> [输出目录]

示例:
  node enhanced.js ./design.sketch
  node enhanced.js ./design.sketch ./output
`);
        process.exit(0);
    }

    const converter = new SketchToHTML(args[0], args[1] || './output');

    try {
        converter.convert();
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}
