配置常量
const ITEMS_PER_PAGE = 50; // 每页显示50期
const DATA_PATH ='../../../../../data/ssqhistory.csv'; 
let currentPage = 1;
let allData = [];

// 主功能模块
document.addEventListener('DOMContentLoaded', async function() {
    console.log('走势图初始化开始');
    try {
        // 加载数据并保持原始顺序
        allData = await loadCSVData();
        console.log(`成功加载${allData.length}期数据`);
        
        // 创建表格结构
        createTableHeader();
        // 渲染首屏数据
        renderTableData();
        // 初始化分页
        renderPagination();
        
        console.log('初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        alert('数据加载失败，请检查控制台');
    }
});

// 创建表格头部（保持不变）
function createTableHeader() {
    const container = document.getElementById('trendContainer');
    const zones = [
        { name: '一区', cols: 11 },
        { name: '二区', cols: 11 },
        { name: '三区', cols: 11 },
        { name: '尾数', cols: 10 }
    ];

    const headerHTML = `
    <table class="trend-table">
        <thead>
            <tr>
                <th class="column-header period-cell">期号</th>
                ${zones.map(zone => 
                    `<th class="column-header parent-header" colspan="${zone.cols}">${zone.name}</th>`
                ).join('')}
            </tr>
            <tr>
                <th class="column-header period-cell"></th>
                ${Array.from({length: 33}, (_, i) => 
                    `<th class="column-header">${(i+1).toString().padStart(2,'0')}</th>`
                ).join('')}
                ${Array.from({length: 10}, (_, i) => 
                    `<th class="column-header">${i}</th>`
                ).join('')}
            </tr>
        </thead>
        <tbody id="dataBody"></tbody>
    </table>`;
    
    container.innerHTML = headerHTML;
}

// 数据加载（保持原始顺序）
async function loadCSVData() {
    try {
        const response = await fetch(DATA_PATH);
        if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
        
        const csvText = await response.text();
        return csvText.split('\n')
            .slice(1)
            .filter(line => line.trim().length > 0)
            .map(line => {
                const [period, ...balls] = line.split(',');
                return {
                    period: period.trim(),
                    red: balls.slice(0,6).map(Number).sort((a,b) => a - b),
                    blue: parseInt(balls[6])
                };
            });
    } catch (error) {
        console.error('数据加载失败:', error);
        return [];
    }
}

// 表格渲染（核心修改）
function renderTableData() {
    const tbody = document.getElementById('dataBody');
    tbody.innerHTML = '';
    
    getPaginatedData().forEach((data, dataIndex) => {
        const row = document.createElement('tr');
        const currentIndex = (currentPage - 1) * ITEMS_PER_PAGE + dataIndex;
        
        // 期号列
        row.innerHTML = `<td class="period-cell">${data.period}</td>`;
        
        // 红球分布
        for(let num = 1; num <= 33; num++) {
            const isActive = data.red.includes(num);
            let miss;
            if (data.period === '2003001') {
                miss = isActive ? 0 : 1; // 首期特殊处理
            } else {
                miss = calculateMissCount(num, currentIndex);
            }
            row.innerHTML += `
            <td class="number-cell">
                ${isActive ? 
                    `<div class="red-ball">${num.toString().padStart(2,'0')}</div>` : 
                    `<span class="miss">${miss}</span>`}
            </td>`;
        }
        
        // 尾数分布
        const tails = [...new Set(data.red.map(n => n % 10))];
        for(let t = 0; t <= 9; t++) {
            const isTailActive = tails.includes(t);
            let tailMiss;
            if (data.period === '2003001') {
                tailMiss = isTailActive ? 0 : 1; // 首期特殊处理
            } else {
                tailMiss = calculateTailMissCount(t, currentIndex);
            }
            row.innerHTML += `
            <td class="number-cell">
                ${isTailActive ? 
                    `<div class="red-ball">${t}</div>` : 
                    `<span class="miss">${tailMiss}</span>`}
            </td>`;
        }
        
        tbody.appendChild(row);
    });
}

// 新的遗漏计算逻辑
function calculateMissCount(number, currentIndex) {
    // 从当前期往后查找
    const subsequentData = allData.slice(currentIndex + 1);
    const lastAppearIndex = subsequentData.findIndex(d => d.red.includes(number));
    
    return lastAppearIndex === -1 ? 
        allData.length - currentIndex : 
        lastAppearIndex + 1;
}

function calculateTailMissCount(tail, currentIndex) {
    // 从当前期往后查找
    const subsequentData = allData.slice(currentIndex + 1);
    const lastAppearIndex = subsequentData.findIndex(d => 
        [...new Set(d.red.map(n => n % 10))].includes(tail)
    );
    
    return lastAppearIndex === -1 ? 
        allData.length - currentIndex : 
        lastAppearIndex + 1;
}

// 以下保持原有分页功能不变
function getPaginatedData() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return allData.slice(start, end);
}

function renderPagination() {
    const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination');
    
    const buttons = [];
    if(currentPage > 1) {
        buttons.push(`<a onclick="changePage(${currentPage - 1})">‹ 上一页</a>`);
    }
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for(let i = startPage; i <= endPage; i++) {
        buttons.push(
            `<a ${i === currentPage ? 'class="active"' : ''} 
             onclick="changePage(${i})">${i}</a>`
        );
    }
    
    if(currentPage < totalPages) {
        buttons.push(`<a onclick="changePage(${currentPage + 1})">下一页 ›</a>`);
    }
    
    paginationContainer.innerHTML = buttons.join('');
}

window.changePage = function(newPage) {
    if(newPage < 1 || newPage > Math.ceil(allData.length / ITEMS_PER_PAGE)) return;
    
    currentPage = newPage;
    renderTableData();
    renderPagination();
    window.scrollTo(0, 0);
}