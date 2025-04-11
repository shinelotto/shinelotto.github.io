// basic-trend.js

document.addEventListener('DOMContentLoaded', function() {
    // 页面加载完成后自动加载数据
    loadCSVData();
});

function loadCSVData() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    
    loadingElement.style.display = 'block';
    errorElement.textContent = '';
    
    // 使用fetch API获取CSV文件
    fetch('../../data/ssqhistory.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.text();
        })
        .then(Text => {
            const drawData = parseCSV(csvText);
            if (drawData.length === 0) {
                throw new Error('CSV文件中没有有效数据');
            }
            
            const { redStats, tailStats } = calculateStats(drawData);
            displayResults(drawData, redStats, tailStats);
        })
        .catch(error => {
            errorElement.textContent = '加载数据出错: ' + error.message;
            console.error('Error:', error);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });
}

// 解析CSV数据
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const drawData = [];
    
    for (const line of lines) {
        // 假设CSV格式为：期号,红球1,红球2,红球3,红球4,红球5,红球6,蓝球
        const parts = line.split(',').map(part => part.trim());
        if (parts.length < 7) continue;
        
        // 尝试转换为数字
        const redBalls = [];
        let isValid = true;
        for (let i = 1; i <= 6; i++) {
            const num = parseInt(parts[i], 10);
            if (isNaN(num) || num < 1 || num > 33) {
                isValid = false;
                break;
            }
            redBalls.push(num);
        }
        
        if (!isValid) continue;
        
        const draw = {
            period: parts[0],
            redBalls: redBalls.sort((a, b) => a - b),
            blueBall: parts[7]
        };
        
        drawData.push(draw);
    }
    
    // 按时间顺序排序（最早的在前）
    drawData.sort((a, b) => a.period.localeCompare(b.period));
    return drawData;
}

// 计算统计结果
function calculateStats(drawData) {
    // 统计红球分布和遗漏值
    const redStats = {};
    for (let i = 1; i <=; i++) {
        redStats[i] = [];
    }
    
    // 统计同尾分布和遗漏值
    const tailStats = {};
    for (let i = 0; i <= 9; i++) {
        tailStats[i] = [];
    }
    
    // 记录每个红球最近一次出现的期数索引
    const lastAppearance    for (let i = 1; i <= 33; i++) {
        lastAppearance[i] = -1; // -1表示从未出现过
    }
    
    // 记录每个尾数最近一次出现的期数索引（仅当尾数出现2次及以上时才更新）
    const lastTailAppearance = {};
    for (let i = 0; i <= 9; i++) {
        lastTailAppearance[i] = -1; // -1表示从未出现过
    }
    
    // 处理每一期数据
    for (let i = 0; i < drawData.length; i++) {
        const draw = drawData[i];
        const redBalls = draw.redBalls;
        
        // 统计红球
        for (let ballNum = 1; ballNum <= 33; ballNum++) {
            if (redBalls.includes(ballNum)) {
                // 当前期有这个红球
                redStats[ballNum].push({
                    period: draw.period,
                    value: ballNum.toString().padStart(2, '0'),
                    missed: 0,
                    isPresent: true
                });
                lastAppearance[ballNum] = i; // 更新最近出现期数索引
            } else {
                // 计算遗漏值
                let missed;
                if (lastAppearance[ballNum] === -1) {
                    // 从未出现过
                    missed = i + 1; // 从第一期开始计算遗漏
                } else {
                    // 计算从最近一次出现到当前期的期数差
                    missed = i - lastAppearance[ballNum];
                }
                
                redStats[ballNum].push({
                    period: draw.period,
                    value: missed.toString(),
                    missed: missed,
                    isPresent: false
                });
            }
        }
        
        // 统计同尾
        const tailCounts = {};
        redBalls.forEach(ball => {
            const tail = ball % 10;
            tailCounts[tail] = (tailCounts[tail] || 0) + 1;
        });
        
        // 找出出现2次及以上的尾数
        const presentTails = Object.keys(tailCounts).filter(tail => tailCounts[tail] >= 2);
        
        for (let tailNum = 0; tailNum <= 9; tailNum++) {
            if (presentTails.includes(tailNum.toString())) {
                // 当前期有这个尾数且出现2次及以上
                tailStats[tailNum].push({
                    period: draw.period,
                    value: tailNum.toString(),
                    count: tailCounts[tailNum],
                    missed: 0,
                    isPresent: true
                });
                lastTailAppearance[tailNum] = i; // 更新最近出现期数索引
            } else {
                // 计算遗漏值
                let missed;
                if (lastTailAppearance[tailNum] === -1) {
                    // 从未出现过
                    missed = i + 1; // 从第一期开始计算遗漏
                } else {
                    // 计算从最近一次出现到当前期的期数差
                    missed = i - lastTailAppearance[tailNum];
                               tailStats[tailNum].push({
                    period: draw.period,
                    value: missed.toString(),
                    missed: missed,
                    isPresent: false
                });
            }
        }
    }
    
    return { redStats, tailStats };
}

// 显示结果表格
function displayResults(drawData, redStats, tailStats) {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';
    
    // 创建表格
    const table = document.createElement('table');
    
    // 创建表头
    const thead = document.createElement('thead');
    
    // 父表头行
    const parentHeaderRow = document.createElement('tr');
    const periodParentHeader = document.createElement('th');
    periodParentHeader.textContent = '期号';
    periodParentHeader.rowSpan = 2;
    parentHeaderRow.appendChild(periodParentHeader);
    
    const zone1ParentHeader = document.createElement('th');
    zone1ParentHeader.textContent = '一区';
    zone1ParentHeader.colSpan = 11;
    zone1ParentHeader.classList.add('zone-header');
    parentHeaderRow.appendChild(zone1ParentHeader);
    
    const zone2ParentHeader = document.createElement('th');
    zone2ParentHeader.textContent = '二区';
    zone2ParentHeader.colSpan = 11;
    zone2ParentHeader.classList.add('zone-header');
    parentHeaderRow.appendChild(zone2ParentHeader);
    
    const zone3ParentHeader = document.createElement('th');
    zone3ParentHeader.textContent = '三区';
    zone3ParentHeader.colSpan = 11;
    zone3ParentHeader.classList.add('zone-header');
    parentHeaderRow.appendChild(zone3ParentHeader);
    
    const tailParentHeader = document.createElement('th');
    tailParentHeader.textContent = '同尾分布';
    tailParentHeader.colSpan = 10;
    tailParentHeader.classList.add('tail-header');
    parentHeaderRow.appendChild(tailParentHeader);
    
    thead.appendChild(parentHeaderRow);
    
    // 子表头行
    const childHeaderRow = document.createElement('tr');
    
    // 一区子表头 (01-11)
    for (let i = 1; i <= 11; i++) {
        const th = document.createElement('th');
        th.textContent = i.toString().padStart(2, '0');
        childHeaderRow.appendChild(th);
    }
    
    // 二区子表头 (12-22)
    for (let i = 12; i <= 22; i++) {
        const th = document.createElement('th');
        th.textContent = i.toString().padStart(2, '0');
        childHeaderRow.appendChild(th);
    }
    
    // 三区子表头 (23-33)
    for (let i = 23; i <= 33; i++) {
        const th = document.createElement('th');
        th.textContent.toString().padStart(2, '0');
        childHeaderRow.appendChild(th);
    }
    
    // 同尾子表头 (0-9)
    for (let i = 0; i <= 9; i++) {
        const th = document.createElement('th');
        th.textContent = i.toString();
        childHeaderRow.appendChild(th);
    }
    
    thead.appendChild(childHeaderRow);
    table.appendChild(thead);
    
    // 创建表格内容
    const tbody = document.createElement('tbody');
    
    // 添加每一行数据
    for (let i = 0; i < drawData.length; i++) {
        const draw = drawData[i];
        const row = document.createElement('tr');
        
        // 期号
        const periodCell = document.createElement('td');
        periodCell.textContent = draw.period;
        row.appendChild(periodCell);
        
        // 红球数据 (01-33)
        for (let ballNum = 1; ballNum <= 33; ballNum++) {
            const stat = redStats[ballNum][i];
            const cell = document.createElement('td');
            
            if (stat.isPresent) {
                const ball = document.createElement('span');
                ball.className = 'red-ball';
                ball.textContent = stat.value;
                cell.appendChild(ball);
            } else {
                cell.textContent = stat.value;
                cell.classList.add('missed');
            }
            
            row.appendChild(cell);
        }
        
        // 同尾数据 (0-9)
        for (let tailNum = 0; tailNum <= 9; tailNum++) {
            const stat = tailStats[tailNum][i];
            const cell = document.createElement('td');
            
            if (stat.isPresent) {
                const ball = document.createElement('span');
                ball.className = 'blue-ball';
                ball.textContent = stat.value;
                
                if (stat.count > 1) {
                    const sup = document.createElement('span');
                    sup.className = 'sup';
                    sup.textContent = stat.count.toString();
                    ball.appendChild(sup);
                }
                
                cell.appendChild(ball);
            } else {
                cell.textContent = stat.value;
                cell.classList.add('missed');
            }
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    resultContainer.appendChild(table);
}