// 全局变量
let currentPage = 1;
let currentData = [];
let allData = [];
let selectedYear = 'all';

/*******************
 * 核心数据加载逻辑 *
 ​*******************/
document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('history-data');
    
    try {
        // 显示加载状态
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">数据加载中...</td></tr>';

        // 1. 加载CSV数据
        const response = await fetch('../../data/ssqhistory.csv');
        if (!response.ok) throw new Error(`文件加载失败：${response.status}`);
        const csvData = await response.text();

        // 2. 解析数据
        allData = parseCSV(csvData);
        if (allData.length === 0) throw new Error('数据文件为空');

        // 3. 初始化筛选器
        initYearFilter(allData);

        // 4. 显示初始数据
        displayData(allData);

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-data error">加载失败: ${error.message}</td></tr>`;
        console.error('数据加载错误:', error);
    }

    // 事件绑定
    document.getElementById('filter-button').addEventListener('click', () => {
        selectedYear = document.getElementById('year-filter').value;
        currentPage = 1;
        filterData();
    });

    document.getElementById('reset-button').addEventListener('click', () => {
        document.getElementById('year-filter').value = 'all';
        selectedYear = 'all';
        currentPage = 1;
        filterData();
    });
});

/****************
 * CSV解析逻辑 *
 ​***************/
function parseCSV(csv) {
    // 移除UTF-8 BOM头
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.substring(1);

    return csv.split('\n')
        .filter(line => line.trim())
        .slice(1) // 跳过标题行
        .map(line => {
            const [period, red1, red2, red3, red4, red5, red6, blue] = line.split(',');
            return {
                period: period.trim(),
                redBalls: [red1, red2, red3, red4, red5, red6].map(n => n.trim().padStart(2, '0')),
                blue: blue.trim().padStart(2, '0'),
                year: period.trim().substring(0, 4) // 从期号提取年份
            };
        })
        .filter(item => item.period && item.redBalls.length === 6);
}

/********************
 * 筛选器初始化逻辑 *
 ​*******************/
function initYearFilter(data) {
    const years = [...new Set(data.map(item => item.year))]
        .sort((a, b) => b - a);

    const yearSelect = document.getElementById('year-filter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
    });
}

/******************
 * 数据筛选逻辑 *
 ​*****************/
function filterData() {
    const filtered = selectedYear === 'all' 
        ? allData 
        : allData.filter(item => item.year === selectedYear);
    
    displayData(filtered);
}

/********************
 * 数据显示和分页 *
 ​*******************/
function displayData(data) {
    currentData = data;
    const totalPages = Math.ceil(data.length / 20);
    currentPage = Math.min(currentPage, totalPages || 1);
    
    updateTable();
    updatePagination(totalPages);
}

function updateTable() {
    const start = (currentPage - 1) * 20;
    const pageData = currentData.slice(start, start + 20);
    const tbody = document.getElementById('history-data');

    tbody.innerHTML = pageData.length 
        ? pageData.map(item => `
            <tr>
                <td>${item.period}</td>
                ${item.redBalls.map(n => `<td class="red-ball">${n}</td>`).join('')}
                <td class="blue-ball">${item.blue}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="8" class="no-data">没有找到匹配的数据</td></tr>';
}

/****************
 * 分页逻辑 *
 ​***************/
function updatePagination(totalPages) {
    const pages = generatePagination(currentPage, totalPages);
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';

    // 上一页
    container.appendChild(createPageLink('«', currentPage > 1, () => {
        currentPage--;
        updateTable();
    }));

    // 页码
    pages.forEach(page => {
        if (page === '...') {
            container.appendChild(createEllipsis());
        } else {
            const link = createPageLink(page, true, () => {
                currentPage = page;
                updateTable();
            });
            if (page === currentPage) link.className = 'active';
            container.appendChild(link);
        }
    });

    // 下一页
    container.appendChild(createPageLink('»', currentPage < totalPages, () => {
        currentPage++;
        updateTable();
    }));
}

function generatePagination(current, total) {
    const range = 2;
    let start = Math.max(current - range, 1);
    let end = Math.min(current + range, total);

    if (current <= range + 1) {
        end = Math.min(range * 2 + 1, total);
    } else if (current >= total - range) {
        start = Math.max(total - range * 2, 1);
    }

    const pages = [];
    if (start > 1) pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (end < total) pages.push(total);
    
    return pages;
}

/********************
 * 通用工具函数 *
 ​*******************/
function createPageLink(text, enabled, onClick) {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = '#';
    
    if (!enabled) {
        link.className = 'disabled';
    } else {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            onClick();
        });
    }
    return link;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.className = 'ellipsis';
    span.textContent = '...';
    return span;
}