// 主功能模块
document.addEventListener('DOMContentLoaded', function() {
    console.log('走势图页面已加载');
    initBasicTrend();
});

// 初始化走势图
async function initBasicTrend() {
    try {
        const data = await loadCSVData();
        createRedDistribution(data);
        createTailDistribution(data);
    } catch (error) {
        console.error('初始化失败:', error);
    }
}

// 红球分布处理（新增功能）
function createRedDistribution(data) {
    // 三区定义
    const zones = [
        { id: 'zone1', start: 1, end: 11, title: '一区（01-11）' },
        { id: 'zone2', start: 12, end: 22, title: '二区（12-22）' },
        { id: 'zone3', start: 23, end: 33, title: '三区（23-33）' }
    ];

    zones.forEach(zone => {
        const container = document.createElement('div');
        container.className = 'zone-container';
        
        // 添加区标题
        const title = document.createElement('h4');
        title.textContent = zone.title;
        container.appendChild(title);

        // 创建号码网格
        const grid = document.createElement('div');
        grid.className = 'number-grid';
        
        // 生成每个号码单元格
        for (let num = zone.start; num <= zone.end; num++) {
            const cell = createNumberCell(num, data);
            grid.appendChild(cell);
        }
        
        container.appendChild(grid);
        document.getElementById('redNumberGrid').appendChild(container);
    });
}

// 尾数分布处理（新增功能）
function createTailDistribution(data) {
    const tailGrid = document.getElementById('tailNumberGrid');
    
    // 生成0-9尾数
    for (let tail = 0; tail <= 9; tail++) {
        const cell = document.createElement('div');
        cell.className = 'tail-cell';
        
        // 计算该尾数的遗漏值
        const lastAppear = data.findLastIndex(d => 
            d.red.some(num => num % 10 === tail)
        );
        const missCount = lastAppear === -1 ? data.length : data.length - lastAppear;

        // 显示尾数
        const label = document.createElement('div');
        label.className = 'tail-label';
        label.textContent = tail;
        cell.appendChild(label);

        // 显示遗漏值
        const miss = document.createElement('div');
        miss.className = 'miss-count' + (missCount > 10 ? ' cold' : '');
        miss.textContent = missCount;
        cell.appendChild(miss);

        tailGrid.appendChild(cell);
    }
}

// 创建数字单元格（新增功能）
function createNumberCell(num, data) {
    const cell = document.createElement('div');
    cell.className = 'number-cell';
    
    // 数字显示
    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = num.toString().padStart(2, '0');
    cell.appendChild(number);

    // 计算遗漏值
    const lastAppear = data.findLastIndex(d => d.red.includes(num));
    const missCount = lastAppear === -1 ? data.length : data.length - lastAppear;

    // 遗漏值显示
    const miss = document.createElement('div');
    miss.className = 'miss-count' + (missCount > 10 ? ' cold' : '');
    miss.textContent = missCount;
    cell.appendChild(miss);

    // 标记最新出现的号码
    if (missCount === 0) {
        cell.classList.add('latest');
    }

    return cell;
}

// 以下保留main.js的通用结构 ============================

// 加载CSV数据（保持与main.js一致）
async function loadCSVData() {
    try {
        const response = await fetch('../data/ssqhistory.csv');
        const csvData = await response.text();
        return parseCSV(csvData);
    } catch (error) {
        console.error('加载CSV数据失败:', error);
        return [];
    }
}

// 解析CSV（保持与main.js一致）
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        
        const obj = {};
        const currentLine = lines[i].split(',');
        
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j].trim();
            obj[key] = currentLine[j] ? currentLine[j].trim() : '';
            
            // 转换红球号码为数组
            if (key.startsWith('red')) {
                obj.red = [currentLine[1], currentLine[2], currentLine[3], 
                          currentLine[4], currentLine[5], currentLine[6]].map(Number);
            }
        }
        
        result.push(obj);
    }
    
    return result;
}

// 分页功能（保留结构但禁用）
function paginateData(data, page, itemsPerPage) {
    // 走势图不需要分页，但保留结构
    return { paginatedData: data, totalPages: 1 };
}

// 分页控件（保留结构但隐藏）
function renderPagination() {
    // 走势图不需要分页，但保留函数结构
}

// 更新页面（保持与main.js一致）
function updatePage(page) {
    console.log('更新到页面:', page);
    // 实际使用时需要重新渲染数据
}