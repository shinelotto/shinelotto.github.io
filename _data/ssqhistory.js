// 使用Eleventy兼容的数据加载方式
const fs = require('fs');
const csv = require('csv-parser');

module.exports = function() {
  return new Promise((resolve) => {
    const results = [];
    fs.createReadStream('data/ssqhistory.csv')
      .pipe(csv())
      .on('data', (data) => {
        const redBalls = [data.red1, data.red2, data.red3, data.red4, data.red5, data.red6];
        results.push({
          id: data.id,
          redBalls,
          blueBall: data.blue,
          sum: redBalls.reduce((a, b) => +a + +b, 0),
          oddEvenRatio: `${redBalls.filter(n => n % 2 === 1).length}:${redBalls.filter(n => n % 2 === 0).length}`,
          zoneRatio: calculateZoneRatio(redBalls)
        });
      })
      .on('end', () => resolve(results.reverse())); // 按时间倒序
  });
};

function calculateZoneRatio(balls) {
  const zone1 = balls.filter(b => b <= 11).length;
  const zone2 = balls.filter(b => b > 11 && b <= 22).length;
  const zone3 = balls.filter(b => b > 22).length;
  return `${zone1}:${zone2}:${zone3}`;
}