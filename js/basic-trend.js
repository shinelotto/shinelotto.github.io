// 配置常量
const ITEMS_PER_PAGE = 50; // 每页显示50期
const DATA_PATH = '../data/ssqhistory.csv'; // 调整数据路径
let currentPage = 1;
let allData = [];

// 主功能模块
document.addEventListener('DOMContentLoaded', async function() {
    console.log('走势图初始化开始');
    try {
        // 加载并初始化数据
        allData = await loadCSVData();
        console.log(`成功加载${allData.length}期数据`);
        allData = allData.reverse();
        
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

// 创建表格头部（优化版）
function createTableHeader() {
    const container = document.getElementById('trendContainer');
    const zones = [
        { name: '一区', cols: 11 },
        { name: '二区', cols: 11 },
        { name: '三区', cols: 11 },
        { name: '尾数', cols: 10 }
    ];

    // 生成表头HTML
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

// 数据加载优化版
async function loadCSVData() {
    try {
        const response = await fetch(DATA_PATH);
        if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
        
        const csvText = await response.text();
        return csvText.split('\n')
            .slice(1) // 跳过标题行
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

// 分页数据获取
function getPaginatedData() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return allData.slice(start, end);
}

// 表格渲染优化
function renderTableData() {
    const tbody = document.getElementById('dataBody');
    tbody.innerHTML = '';
    
    getPaginatedData().forEach(data => {
        const row = document.createElement('tr');
        
        // 期号列
        row.innerHTML = `<td class="period-cell">${data.period}</td>`;
        
        // 红球分布
        for(let num = 1; num <= 33; num++) {
            const isActive = data.red.includes(num);
            const miss = calculateMissCount(num);
            row.innerHTML += `
            <td class="number-cell">
                ${isActive ? 
                    `<div class="red-ball">${num.toString().padStart(2,'0')}
                        <span class="miss">0</span>
                    </div>` : 
                    `<span class="miss">${miss}</span>`}
            </td>`;
        }
        
        // 尾数分布
        const tails = [...new Set(data.red.map(n => n % 10))];
        for(let t = 0; t <= 9; t++) {
            row.innerHTML += `
            <td class="number-cell">
                ${tails.includes(t) ? 
                    `<div class="red-ball">${t}</div>` : ''}
            </td>`;
        }
        
        tbody.appendChild(row);
    });
}

// 遗漏值计算优化
function calculateMissCount(number) {
    const lastAppearIndex = allData.findIndex(d => d.red.includes(number));
    return lastAppearIndex === -1 ? allData.length : allData.length - lastAppearIndex;
}

// 分页控件生成
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

// 全局换页函数
window.changePage = function(newPage) {
    if(newPage < 1 || newPage > Math.ceil(allData.length / ITEMS_PER_PAGE)) return;
    
    currentPage = newPage;
    renderTableData();
    renderPagination();
    window.scrollTo(0, 0);
}