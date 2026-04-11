import { astro } from 'iztro';

// 配置 iztro
astro.config({
  yearDivide: 'normal',
  horoscopeDivide: 'normal',
  ageDivide: 'normal',
  dayDivide: 'forward',
  algorithm: 'zhongzhou',
});

// 时辰转换：13:30 -> index 6（午时）
const chart = astro.bySolar('1970-09-03', 6, '女', true);

console.log('=== 基本信息 ===');
console.log('五行局:', chart.fiveElementsClass);
console.log('命主:', chart.soul);
console.log('身主:', chart.body);

console.log('\n⭐ === 检查 mutagen 的实际格式 ===');
let mutaGenFormats = new Set();

chart.palaces.forEach(palace => {
  const majorStars = palace.majorStars || [];
  majorStars.forEach(star => {
    if (star.mutagen) {
      mutaGenFormats.add(star.mutagen);
      console.log(`${palace.name}: ${star.name} -> mutagen="${star.mutagen}" (type: ${typeof star.mutagen})`);
    }
  });
});

console.log('\n📊 === 共有的 mutagen 格式 ===');
Array.from(mutaGenFormats).forEach(fmt => console.log(`  "${fmt}"`));

console.log(`\n✅ 共 ${Array.from(mutaGenFormats).length} 种四化格式`);

// 测试 getMutagenList 逻辑
console.log('\n🔧 === 测试 getMutagenList 转换 ===');
function testGetMutagenList(mutagen) {
  if (!mutagen) return [];
  const values = Array.isArray(mutagen)
    ? mutagen.map(item => String(item)).filter(Boolean)
    : [String(mutagen)];
  
  return values.map(val => {
    const str = val.trim();
    if (str.startsWith('化')) {
      return str;  // 已经有"化"字
    }
    return `化${str}`;
  });
}

Array.from(mutaGenFormats).forEach(fmt => {
  const result = testGetMutagenList(fmt);
  console.log(`  "${fmt}" -> [${result.map(r => `"${r}"`).join(', ')}]`);
});
