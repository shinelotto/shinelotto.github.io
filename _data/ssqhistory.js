module.exports = function() {
  return fetch('data/ssqhistory.csv')
    .then(r => r.text())
    .then(data => {
      return data.split('\n').filter(row => row.trim()).map(row => {
        const [id, r1,r2,r3,r4,r5,r6,blue] = row.split(',');
        return {
          id, 
          redBalls: [r1,r2,r3,r4,r5,r6].map(Number).sort((a,b) => a-b),
          blueBall: blue,
          sum: [r1,r2,r3,r4,r5,r6].reduce((a,b) => +a + +b, 0),
          oddEven: [r1,r2,r3,r4,r5,r6].filter(n => n%2).length + ':' + [r1,r2,r3,r4,r5,r6].filter(n => !(n%2)).length,
          zones: [
            [r1,r2,r3,r4,r5,r6].filter(n => n<=11).length,
            [r1,r2,r3,r4,r5,r6].filter(n => n>11 && n<=22).length,
            [r1,r2,r3,r4,r5,r6].filter(n => n>22).length
          ]
        };
      }).reverse(); // 倒序排列
    });
};