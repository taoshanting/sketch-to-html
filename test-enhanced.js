/**
 * 测试增强版脚本
 */

const fs = require('fs');
const { BaseParser, LayoutGrouper, LayoutCalculator, StructureCleaner, CodeGenerator } = require('./enhanced.js');

// 加载示例数据
const exampleData = JSON.parse(fs.readFileSync('./example.json', 'utf8'));

console.log('🧪 测试增强版 Sketch 转 HTML...\n');

// 1. 基础解析
console.log('1️⃣ 基础解析...');
const dsl = BaseParser.parseToDSL(exampleData);
console.log('✅ 解析完成');

// 2. 布局识别
console.log('\n2️⃣ 布局识别...');
const layoutInfo = LayoutGrouper.identifyLayout(dsl.children);
console.log('布局信息:', layoutInfo || '未识别到特定布局');

// 3. 布局计算
console.log('\n3️⃣ 应用布局算法...');
const dslWithLayout = LayoutCalculator.apply(dsl);
console.log('✅ 布局应用完成');

// 4. 结构清理
console.log('\n4️⃣ 清理冗余结构...');
const cleanedDSL = StructureCleaner.clean(dslWithLayout);
console.log('✅ 清理完成');

// 5. 生成代码
console.log('\n5️⃣ 生成 HTML/CSS...');
const html = CodeGenerator.generateFullHTML(cleanedDSL, exampleData.name);
console.log('✅ 代码生成完成');

// 保存结果
const outputDir = './enhanced-output';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.writeFileSync(`${outputDir}/dsl.json`, JSON.stringify(cleanedDSL, null, 2));
fs.writeFileSync(`${outputDir}/full.html`, html);
fs.writeFileSync(`${outputDir}/css.css`, CodeGenerator.generateCSS(cleanedDSL));
fs.writeFileSync(`${outputDir}/html.html`, CodeGenerator.generateHTML(cleanedDSL));

console.log('\n📁 输出文件:');
console.log(`   - ${outputDir}/dsl.json`);
console.log(`   - ${outputDir}/full.html`);
console.log(`   - ${outputDir}/css.css`);
console.log(`   - ${outputDir}/html.html`);

// 展示布局信息
if (cleanedDSL.layout) {
    console.log('\n🎯 识别到的布局:');
    console.log(`   类型: ${cleanedDSL.layout.type}`);
    if (cleanedDSL.layout.gap) console.log(`   间距: ${cleanedDSL.layout.gap}px`);
    if (cleanedDSL.layout.isList) console.log('   列表: 是');
}

console.log('\n🎉 测试完成!');
