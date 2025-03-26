module.exports = function(data) {
  // 简单推荐算法示例
  const hotRed = data.stats.redHot.slice(0, 6).map(i => i.number);
  const coldRed = data.stats.redCold.slice(0, 3).map(i => i.number);
  const hotBlue = data.stats.blueHot[0].number;

  return {
    today: new Date().toLocaleDateString(),
    recommend: {
      hotCombo: [...hotRed.sort(() => 0.5 - Math.random()).slice(0, 6), hotBlue],
      balanceCombo: [...new Set([...hotRed.slice(0,3), ...coldRed])].sort(() => 0.5 - Math.random()).slice(0, 6)
        .concat(data.stats.blueCold[0].number)
    }
  };
};