module.exports = async function() {
  const response = await fetch('data/ssqhistory.csv');
  const data = await response.text();
  return data.split('\n').filter(row => row.trim() !== '').map(row => {
    const [id, red1, red2, red3, red4, red5, red6, blue] = row.split(',');
    return {
      id,
      redBalls: [red1, red2, red3, red4, red5, red6],
      blueBall: blue,
      sum: [red1, red2, red3, red4, red5, red6].reduce((a,b) => +a + +b, 0),
      oddEvenRatio: [red1, red2, red3, red4, red5, red6].filter(n => n % 2 === 1).length + ':' + 
                   [red1, red2, red3, red4, red5, red6].filter(n => n % 2 === 0).length
    };
  });
};