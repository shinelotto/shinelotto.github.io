document.addEventListener('DOMContentLoaded', async function() {
    // 加载CSV数据
    const allData = await loadCSVData();
    
    // 初始化年份筛选器
    initYearFilter(allData);
    
    // 默认显示所有数据
    displayData(allData);
    
    // 筛选按钮事件
    document.getElementById('filter-button').addEventListener('click', function() {
        const selectedYear = document.getElementById('year-filter').value;
        const filteredData = filterDataByYear(allData, selectedYear);
        displayData(filteredData);
    });
    
    // 重置按钮事件
    document.getElementById('reset-button').addEventListener('click', function() {
        document.getElementById('year-filter').value = 'all';
        displayData(allData);
    });
});

// 初始化年份筛选器
function initYearFilter(data) {
    const yearFilter = document.getElementById('year-filter');
    
    // 从数据中提取所有不重复的年份
    const years = [...new Set(data.map(item => {
        const date = new Date(item.date);
        return date.getFullYear();
    }))].sort((a, b) => b - a); // 按降序排列
    
    // 添加年份选项
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

// 按年份筛选数据
function filterDataByYear(data, year) {
    if (year === 'all') return data;
    
    return data.filter(item => {
        const date = new Date(item.date);
        return date.getFullYear() === parseInt(year);
    });
}

// 显示数据
function displayData(data) {
    const tableBody = document.getElementById('history-data');
    tableBody.innerHTML = '';
    
    // 分页设置
    const itemsPerPage = 20;
    let currentPage = 1;
    
    // 初始分页
    updateTable(data, currentPage, itemsPerPage);
    
    // 更新表格函数
    function updateTable(data, page, itemsPerPage) {
        const { paginatedData, totalPages } = paginateData(data, page, itemsPerPage);
        
        tableBody.innerHTML = '';
        
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            // 期号
            const periodCell = document.createElement('td');
            periodCell.textContent = item.period;
            row.appendChild(periodCell);
            
            // 开奖日期
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(item.date);
            row.appendChild(dateCell);
            
            // 红球
            const redBalls = item.red_balls.split(' ').map(Number);
            for (let i = 1; i <= 6; i++) {
                const ballCell = document.createElement('td');
                ballCell.textContent = redBalls[i - 1];
                ballCell.className = 'red-ball';
                row.appendChild(ballCell);
            }
            
            // 蓝球
            const blueBallCell = document.createElement('td');
            blueBallCell.textContent = item.blue_ball;
            blueBallCell.className = 'blue-ball';
            row.appendChild(blueBallCell);
            
            // 奖池
            const poolCell = document.createElement('td');
            poolCell.textContent = formatMoney(item.pool);
            row.appendChild(poolCell);
            
            // 一等奖注数
            const firstPrizeCountCell = document.createElement('td');
            firstPrizeCountCell.textContent = item.first_prize_count;
            row.appendChild(firstPrizeCountCell);
            
            // 一等奖奖金
            const firstPrizeAmountCell = document.createElement('td');
            firstPrizeAmountCell.textContent = formatMoney(item.first_prize_amount);
            row.appendChild(firstPrizeAmountCell);
            
            tableBody.appendChild(row);
        });
        
        // 渲染分页控件
        renderPagination(totalPages, page, 'pagination-controls');
        
        // 更新分页点击事件
        document.querySelectorAll('#pagination-controls a').forEach(link => {
            if (!link.classList.contains('active')) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const pageText = this.textContent;
                    if (pageText === '«') {
                        currentPage--;
                    } else if (pageText === '»') {
                        currentPage++;
                    } else {
                        currentPage = parseInt(pageText);
                    }
                    updateTable(data, currentPage, itemsPerPage);
                });
            }
        });
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 格式化金额
function formatMoney(amount) {
    return parseFloat(amount).toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0
    });
}