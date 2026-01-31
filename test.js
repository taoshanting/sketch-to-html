/**
 * 测试脚本
 * 使用示例数据测试 sketch 转 html
 */

const fs = require('fs');
const path = require('path');
const { SketchToHTML, PicassoCore, CodeGenerator } = require('./demo.js');

// 加载示例数据
const exampleData = JSON.parse(fs.readFileSync('./example.json', 'utf8'));

console.log('🧪 测试 Sketch 转 HTML...\n');

// 解析为 DSL
console.log('1️⃣ 解析 Sketch 数据为 DSL...');
const dsl = PicassoCore.parseToDSL(exampleData);
console.log('✅ DSL 解析完成');
console.log(JSON.stringify(dsl, null, 2).slice(0, 500) + '...\n');

// 生成代码
console.log('2️⃣ 生成 HTML/CSS 代码...');
const html = CodeGenerator.generateHTML(dsl);
const css = CodeGenerator.generateCSS(dsl);
const fullHTML = CodeGenerator.generateFullHTML(dsl, exampleData.name);
console.log('✅ 代码生成完成\n');

// 输出预览
console.log('3️⃣ 代码预览:');
console.log('--- CSS ---');
console.log(css.slice(0, 500) + '...\n');
console.log('--- HTML ---');
console.log(html.slice(0, 500) + '...\n');

// 保存测试结果
const outputDir = './test-output';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'test-dsl.json'), JSON.stringify(dsl, null, 2));
fs.writeFileSync(path.join(outputDir, 'test.css'), css);
fs.writeFileSync(path.join(outputDir, 'test.html'), html);
fs.writeFileSync(path.join(outputDir, 'test-full.html'), fullHTML);

console.log('4️⃣ 测试文件已保存:');
console.log(`   - ${outputDir}/test-dsl.json`);
console.log(`   - ${outputDir}/test.css`);
console.log(`   - ${outputDir}/test.html`);
console.log(`   - ${outputDir}/test-full.html`);
console.log('\n🎉 测试完成!');
