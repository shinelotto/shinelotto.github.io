// ================== 新增数据加载函数 ==================
async function loadCSVData() {
    try {
        const response = await fetch('../../../../../data/ssqhistory.csv');
        if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('数据加载失败:', error);
        throw error;
    }
}

// ================== CSV解析函数 ==================
function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1);
    return rows.map(row => {
        const [期号, 红球1, 红球2, 红球3, 红球4, 红球5, 红球6, 蓝球] = row.split(',');
        return {
            期号: 期号.trim(),
            红球1: parseInt(红球1),
            红球2: parseInt(红球2),
            红球3: parseInt(红球3),
            红球4: parseInt(红球4),
            红球5: parseInt(红球5),
            红球6: parseInt(红球6),
            蓝球: parseInt(蓝球)
        };
    });
}

// ================== 通用工具函数 ==================
const ZONE_DEFINITIONS = {
    red: [
        { min: 1, max: 11 }, { min: 12, max: 22 }, { min: 23, max: 33 }
    ],
    blue: [
        { min: 1, max: 4 }, { min: 5, max: 8 }, { min: 9, max: 12 }, { min: 13, max: 16 }
    ]
};

// ================== 红球静态指标 ==================
function calculateRedStatic(data, type) {
    return data.map(item => {
        const redBalls = getRedBalls(item);
        return {
            issue: item.期号,
            value: calculateByType(redBalls, type)
        };
    });
}

function calculateByType(balls, type) {
    switch(type) {
        case 'sum':
            return balls.reduce((a, b) => a + b, 0);
        case 'span':
            return Math.max(...balls) - Math.min(...balls);
        case 'ac': {
            const diffs = new Set();
            for(let i = 0; i < balls.length; i++) {
                for(let j = i+1; j < balls.length; j++) {
                    diffs.add(Math.abs(balls[i] - balls[j]));
                }
            }
            return diffs.size - 5;
        }
        case 'zone':
            return ZONE_DEFINITIONS.red.map(z => 
                balls.filter(b => b >= z.min && b <= z.max).length
            ).join(':');
        case 'oddEven': {
            const odd = balls.filter(b => b % 2 !== 0).length;
            return `${odd}:${6 - odd}`;
        }
        case 'road012': {
            const counts = [0, 0, 0];
            balls.forEach(b => counts[b % 3]++);
            return counts.join(':');
        }
        case 'primeComposite': {
            // 新增质合比计算
            const primes = new Set([1,2,3,5,7,11,13,17,19,23,29,31]);
            const primeCount = balls.filter(b => primes.has(b)).length;
            return `${primeCount}:${6 - primeCount}`;
        }
        case 'sizeRatio': {
            // 新增大小比计算
            const bigCount = balls.filter(b => b > 16).length;
            return `${bigCount}:${6 - bigCount}`;
        }
        case 'consecutive': {
            const sorted = [...balls].sort((a, b) => a - b);
            let groups = 0;
            for(let i = 0; i < sorted.length - 1; ) {
                let count = 1;
                while(i + count < sorted.length && sorted[i + count] === sorted[i] + count) {
                    count++;
                }
                if(count > 1) groups++;
                i += count;
            }
            return groups;
        }
        case 'sameTail': {
            const tails = new Map();
            balls.forEach(b => {
                const t = b % 10;
                tails.set(t, (tails.get(t) || 0) + 1);
            });
            return [...tails.values()].filter(c => c > 1).length;
        }
    }
}

// ================== 红球动态指标 ==================
function calculateRedDynamic(data, type) {
    const history = data.slice(0, 50);
    return data.map((item, index) => {
        const redBalls = getRedBalls(item);
        return {
            issue: item.期号,
            value: calculateDynamic(redBalls, history.slice(0, index), type)
        };
    });
}

function calculateDynamic(balls, history, type) {
    switch(type) {
        case 'coldHot': {
            const hot = new Set();
            history.slice(-4).forEach(h => {
                getRedBalls(h).forEach(n => hot.add(n));
            });
            const coldCount = balls.filter(n => !hot.has(n)).length;
            return `${coldCount}:${6 - coldCount}`;
        }
        case 'repeat': {
            const prevBalls = history.length > 0 ? 
                getRedBalls(history[history.length-1]) : [];
            return balls.filter(n => prevBalls.includes(n)).length;
        }
        case 'neighbor': {
            if (history.length === 0) return 0;
            const prevBalls = getRedBalls(history[history.length - 1]);
            const neighborSet = new Set();
            
            prevBalls.forEach(n => {
                if(n > 1) neighborSet.add(n - 1);
                if(n < 33) neighborSet.add(n + 1);
            });

            return balls.filter(n => neighborSet.has(n)).length;
        }
    }
}

// ================== 蓝球指标 ==================
function calculateBlue(data, type) {
    return data.map((item, index) => ({
        issue: item.期号,
        value: calculateBlueValue(item.蓝球, data.slice(0, index), type)
    }));
}

function calculateBlueValue(blueBall, history, type) {
    const num = parseInt(blueBall);
    switch(type) {
        case 'zone4':
            return ZONE_DEFINITIONS.blue.findIndex(z => 
                num >= z.min && num <= z.max
            ) + 1;
        case 'size':
            return num > 8 ? '大' : '小';
        case 'oddEven':
            return num % 2 === 0 ? '偶' : '奇';
        case 'coldHot':
            return history.slice(-16).some(h => 
                parseInt(h.蓝球) === num
            ) ? '热' : '冷';
        case 'amplitude':
            return history.length > 0 ? 
                Math.abs(num - parseInt(history[0].蓝球)) : 0;
        case 'tail':
            return num % 10;
    }
}

// ================== 通用函数 ==================
function getRedBalls(item) {
    return ['红球1','红球2','红球3','红球4','红球5','红球6']
        .map(k => parseInt(item[k])).sort((a, b) => a - b);
}

// ================== 通用渲染函数 ==================
function renderStatisticsTable(data, title) {
    const container = document.getElementById('stat-container');
    if (!container) return;

    const html = `
        <div class="card">
            <h3>${title}</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>期号</th>
                            <th>统计值</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(d => `
                            <tr>
                                <td>${d.issue}</td>
                                <td>${d.value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;
}