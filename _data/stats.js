// _data/stats.js
module.exports = function(data) {
  // 安全检查
  if (!data.ssqhistory) {
    console.error('警告：未找到双色球数据');
    return { redHot: [], blueHot: [] };
  }

  // 初始化统计对象
  const redCount = {};
  const blueCount = {};

  // 统计出现次数（添加防错处理）
  try {
    data.ssqhistory.forEach(item => {
      // 统计红球 (1-6)
      for (let i = 1; i <= 6; i++) {
        const num = item[`红球${i}`]?.toString().padStart(2, '0') || '00';
        redCount[num] = (redCount[num] || 0) + 1;
      }
      
      // 统计蓝球
      const blueNum = item['蓝球']?.toString().padStart(2, '0') || '00';
      blueCount[blueNum] = (blueCount[blueNum] || 0) + 1;
    });
  } catch (e) {
    console.error('统计出错:', e);
  }

  // 返回结果（即使出错也返回空数组）
  return {
    redHot: Object.entries(redCount).sort((a,b) => b[1]-a[1]).slice(0,10),
    blueHot: Object.entries(blueCount).sort((a,b) => b[1]-a[1]).slice(0,5)
  };
};