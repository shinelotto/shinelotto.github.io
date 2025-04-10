// 配置常量
const ITEMS_PER_PAGE = 50; // 每页显示50期
let currentPage = 1;
let allData = [];

// 主功能模块
document.addEventListener('DOMContentLoaded', async function() {
    console.log('走势图页面已加载');
    try {
        // 加载并初始化数据
        allData = await loadCSVData();
        allData = allData.reverse(); // 倒序显示最新数据在前
        
        // 初始化页面
        createTableHeader();
        renderPagination();
        renderTableData();
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 创建表格头部
function createTableHeader() {
    const container = document.getElementById('trendContainer');
    
    // 清空容器
    container.innerHTML = `
        <table class="trend-table">
            <thead>
                <tr>
                    <th class="column-header period-cell">期号</th>
                    <th class="column-header parent-header" colspan="11">一区</th>
                    <th class="column-header parent-header" colspan="11">二区</th>
                    <th class="column-header parent-header" colspan="11">三区</th>
                    <th class="column-header parent-header" colspan="10">尾数</th>
                </tr>
                <tr>
                    <th class="column-header period-cell"></th>
                    ${Array.from({length: 33}, (_, i) => 
                        `<th class="column-header">${(i+1).toString().padStart(2, '0')}</th>`
                    ).join('')}
                    ${Array.from({length: 10}, (_, i) => 
                        `<th class="column-header">${i}</th>`
                    ).join('')}
                </tr>
            </thead>
            <tbody id="dataBody"></tbody>
        </table>
    `;
}

// 渲染表格数据
function renderTableData() {
    const tbody = document.getElementById('dataBody');
    tbody.innerHTML = '';
    
    // 获取当前页数据
    const { paginatedData } = paginateData(allData, currentPage, ITEMS_PER_PAGE);
    
    // 生成每期数据行
    paginatedData.forEach(data => {
        const row = document.createElement('tr');
        
        // 期号单元格
        const periodCell = document.createElement('td');
        periodCell.className = 'period-cell';
        periodCell.textContent = data.period;
        row.appendChild(periodCell);
        
        // 生成33个红球单元格
        for(let num = 1; num <= 33; num++) {
            const cell = document.createElement('td');
            cell.className = 'number-cell';
            
            // 计算遗漏值
            const lastAppearIndex = allData.findIndex(d => d.red.includes(num));
            const missCount = lastAppearIndex === -1 ? allData.length : allData.length - lastAppearIndex;
            
            if(data.red.includes(num)) {
                const ball = document.createElement('div');
                ball.className = 'red-ball';
                ball.innerHTML = `
                    ${num.toString().padStart(2, '0')}
                    <span class="miss">0</span>
                `;
                cell.appendChild(ball);
            } else {
                cell.innerHTML = `<span class="miss">${missCount}</span>`;
            }
            row.appendChild(cell);
        }
        
        // 生成尾数单元格
        const tails = data.red.map(n => n % 10);
        for(let t = 0; t <= 9; t++) {
            const cell = document.createElement('td');
            cell.className = 'number-cell';
            if(tails.includes(t)) {
                cell.innerHTML = `<div class="red-ball">${t}</div>`;
            }
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    });
}

// 分页功能
function paginateData(data, page, itemsPerPage) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
        paginatedData: data.slice(startIndex, endIndex),
        totalPages: Math.ceil(data.length / itemsPerPage)
    };
}

// 渲染分页控件
function renderPagination() {
    const { totalPages } = paginateData(allData, currentPage, ITEMS_PER_PAGE);
    const container = document.getElementById('pagination');
    
    let html = [];
    if(currentPage > 1) {
        html.push(`<a href="#" onclick="changePage(${currentPage - 1})">« 上一页</a>`);
    }
    
    for(let i = 1; i <= totalPages; i++) {
        html.push(
            `<a href="#" onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>${i}</a>`
        );
    }
    
    if(currentPage < totalPages) {
        html.push(`<a href="#" onclick="changePage(${currentPage + 1})">下一页 »</a>`);
    }
    
    container.innerHTML = html.join('');
}

// 换页函数 (需要在全局作用域)
window.changePage = function(newPage) {
    currentPage = newPage;
    renderTableData();
    renderPagination();
    window.scrollTo(0, 0);
}

// 数据加载函数 (保持与main.js一致)
async function loadCSVData() {
    try {
        const response = await fetch('../../data/ssqhistory.csv');
        const csvData = await response.text();
        return parseCSV(csvData);
    } catch (error) {
        console.error('加载CSV数据失败:', error);
        return [];
    }
}

// CSV解析函数 (优化版)
function parseCSV(csvText) {
    return csvText.split('\n')
        .slice(1) // 跳过标题行
        .filter(line => line.trim()) // 过滤空行
        .map(line => {
            const [period, red1, red2, red3, red4, red5, red6] = line.split(',');
            return {
                period: period.trim(),
                red: [red1, red2, red3, red4, red5, red6].map(Number)
            };
        });
}