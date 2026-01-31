/**
 * 测试增强版脚本 - 基于 Picasso 核心算法
 * 验证模块加载和 Sketch 文件转换
 */

const fs = require('fs');
const path = require('path');
const {
    SketchToHTML,
    SketchParser,
    StyleTransformer,
    CodeGenerator,
    WebScale,
    IOSScale,
    AndroidScale,
    Unit,
    ColorFormat,
    CodeType
} = require('./enhanced.js');

console.log('🧪 测试增强版 Sketch 转 HTML (Picasso 核心算法)...\n');

// 1. 验证模块导入
console.log('1️⃣ 验证模块导入...');
console.log('   - SketchParser:', typeof SketchParser.parseArtboard === 'function' ? '✅' : '❌');
console.log('   - CodeGenerator:', typeof CodeGenerator.generateFullHTML === 'function' ? '✅' : '❌');
console.log('   - StyleTransformer:', typeof StyleTransformer.transform === 'function' ? '✅' : '❌');
console.log('   - SketchToHTML:', typeof SketchToHTML === 'function' ? '✅' : '❌');

// 2. 验证常量导出
console.log('\n2️⃣ 验证常量导出...');
console.log('   - CodeType:', CodeType ? '✅' : '❌');
console.log('   - Unit:', Unit ? '✅' : '❌');
console.log('   - ColorFormat:', ColorFormat ? '✅' : '❌');
console.log('   - WebScale:', WebScale ? '✅' : '❌');

// 3. 验证 CodeType 值
console.log('\n3️⃣ 验证 CodeType 值...');
console.log(`   - CodeType.WebPx: ${CodeType.WebPx}`);
console.log(`   - CodeType.Weapp: ${CodeType.Weapp}`);
console.log(`   - CodeType.ReactNative: ${CodeType.ReactNative}`);

// 4. 检查 Sketch 文件并转换
console.log('\n4️⃣ Sketch 文件转换测试...');
const sketchFiles = fs.readdirSync('.')
    .filter(f => f.endsWith('.sketch'))
    .map(f => `./${f}`);

if (sketchFiles.length > 0) {
    const testOutputDir = './enhanced-output-test';
    console.log(`   找到 Sketch 文件: ${sketchFiles.join(', ')}`);

    try {
        const converter = new SketchToHTML(sketchFiles[0], testOutputDir);
        converter.convert();

        // 检查输出文件
        const outputFiles = fs.readdirSync(testOutputDir).filter(f => f.endsWith('.html'));
        console.log(`   生成 ${outputFiles.length} 个 HTML 文件`);

        if (outputFiles.length > 0) {
            // 检查文件内容
            const sampleFile = fs.readFileSync(path.join(testOutputDir, outputFiles[0]), 'utf8');
            const hasContent = sampleFile.includes('<style>') && sampleFile.includes('.');
            console.log(`   首个文件内容检查: ${hasContent ? '✅ 有 CSS' : '❌ 无 CSS'}`);
        }

        console.log('\n✅ Sketch 文件转换测试成功!');
    } catch (error) {
        console.log(`   转换测试失败: ${error.message}`);
    }
} else {
    console.log('   未找到 Sketch 文件，跳过实际转换测试');
    console.log('   可用命令: node enhanced.js <sketch文件路径> [输出目录]');
}

console.log('\n🎉 测试完成! (Picasso 核心算法版)');
