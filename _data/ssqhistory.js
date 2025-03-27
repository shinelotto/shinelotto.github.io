// 加载CSV数据并建立完整数据库
let lotteryData = [];

fetch('data/ssqhistory.csv')
  .then(response => response.text())
  .then(data => {
    // 处理CSV数据
    lotteryData = data.split('\n')
      .filter(row => row.trim() !== '')
      .map(row => {
        const [id, red1, red2, red3, red4, red5, red6, blue] = row.split(',');
        return {
          id,
          redBalls: [red1, red2, red3, red4, red5, red6],
          blueBall: blue,
          // 添加计算属性
          sum: [red1, red2, red3, red4, red5, red6].reduce((a,b) => +a + +b, 0),
          oddEvenRatio: [red1, red2, red3, red4, red5, red6].filter(n => n % 2 === 1).length + ':' + 
                       [red1, red2, red3, red4, red5, red6].filter(n => n % 2 === 0).length
        };
      });
    
    // 初始化显示最新50期
    showTrendData(lotteryData.slice(-50));
  });

// 查看按钮功能
document.querySelector('.view-btn').addEventListener('click', function() {
  const startId = document.querySelector('.period-input:first-child').value;
  const endId = document.querySelector('.period-input:last-child').value;
  
  // 根据期号筛选数据
  const filteredData = lotteryData.filter(item => 
    item.id >= startId && item.id <= endId
  );
  
  if(filteredData.length === 0) {
    alert("未找到数据，请检查期号输入是否正确");
    return;
  }
  
  showTrendData(filteredData);
});

// 显示走势数据
function showTrendData(data) {
  const tbody = document.querySelector('.table-body');
  tbody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="period-col">${item.id}</td>
      <td class="ball-col">
        ${item.redBalls.map(b => `<span class="red-ball">${b.padStart(2,'0')}</span>`).join('')}
      </td>
      <td class="blue-col"><span class="blue-ball">${item.blueBall.padStart(2,'0')}</span></td>
      <td class="stats-col">${item.sum}</td>
      <td class="stats-col">${Math.max(...item.redBalls) - Math.min(...item.redBalls)}</td>
      <td class="stats-col">${calculateZoneRatio(item.redBalls)}</td>
      <td class="stats-col">${item.oddEvenRatio}</td>
    `;
    tbody.appendChild(row);
  });
}

// 计算区间比 (1-11,12-22,23-33)
function calculateZoneRatio(balls) {
  const zone1 = balls.filter(b => b <= 11).length;
  const zone2 = balls.filter(b => b > 11 && b <= 22).length;
  const zone3 = balls.filter(b => b > 22).length;
  return `${zone1}:${zone2}:${zone3}`;
}