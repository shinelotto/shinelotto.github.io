document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 尝试加载数据
        const response = await fetch('ssqhistory.csv');
        if (!response.ok) throw new Error('数据文件加载失败');
        
        const csvData = await response.text();
        const allData = parseSSQCSV(csvData);
        
        // 初始化筛选器
        initYearFilter(allData);
        
        // 显示数据
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
        
    } catch (error) {
        console.error('发生错误:', error);
        document.getElementById('history-data').innerHTML = `
            <tr>
                <td colspan="8" class="no-data">数据加载失败: ${error.message}</td>
            </tr>
        `;
    }
});

// 解析双色球CSV数据（根据您提供的格式）
function parseSSQCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = ['期号', '红球1', '红球2', '红球3', '红球4', '红球5', '红球6', '蓝球'];
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].split(',');
        if (currentLine.length < 8) continue; // 跳过不完整的行
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : '';
        }
        
        // 添加年份信息用于筛选
        const period = obj['期号'];
        obj.year = period.substring(0, 4); // 从期号中提取年份
        
        result.push(obj);
    }
    
    return result;
}

// 初始化年份筛选器
function initYearFilter(data) {
    const yearFilter = document.getElementById('year-filter');
    
    // 清空现有选项（保留"全部"选项）
    while (yearFilter.options.length > 1) {
        yearFilter.remove(1);
    }
    
    // 从数据中提取所有年份
    const years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
    
    // 添加年份选项
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        yearFilter.appendChild(option);
    });
}

// 按年份筛选数据
function filterDataByYear(data, year) {
    if (year === 'all') return data;
    return data.filter(item => item.year === year);
}

// 显示数据
function displayData(data) {
    const tableBody = document.getElementById('history-data');
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">没有找到匹配的数据</td>
            </tr>
        `;
        document.getElementById('pagination-controls').innerHTML = '';
        return;
    }
    
    // 分页设置
    const itemsPerPage = 20;
    let currentPage = 1;
    
    updateTable(data, currentPage, itemsPerPage);
    
    function updateTable(data, page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);
        const totalPages = Math.ceil(data.length / itemsPerPage);
        
        tableBody.innerHTML = '';
        
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            // 期号
            const periodCell = document.createElement('td');
            periodCell.textContent = item['期号'] || '';
            row.appendChild(periodCell);
            
            // 红球
            for (let i = 1; i <= 6; i++) {
                const ballCell = document.createElement('td');
                ballCell.textContent = item[`红球${i}`] || '';
                ballCell.className = 'red-ball';
                row.appendChild(ballCell);
            }
            
            // 蓝球
            const blueBallCell = document.createElement('td');
            blueBallCell.textContent = item['蓝球'] || '';
            blueBallCell.className = 'blue-ball';
            row.appendChild(blueBallCell);
            
            tableBody.appendChild(row);
        });
        
        // 更新分页控件
        updatePagination(totalPages, currentPage);
    }
    
    function updatePagination(totalPages, currentPage) {
        const paginationContainer = document.getElementById('pagination-controls');
        paginationContainer.innerHTML = '';
        
        // 上一页按钮
        if (currentPage > 1) {
            const prevLink = document.createElement('a');
            prevLink.href = '#';
            prevLink.textContent = '«';
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage--;
                updateTable(data, currentPage, itemsPerPage);
            });
            paginationContainer.appendChild(prevLink);
        }
        
        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            
            if (i === currentPage) {
                pageLink.className = 'active';
            } else {
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentPage = i;
                    updateTable(data, currentPage, itemsPerPage);
                });
            }
            
            paginationContainer.appendChild(pageLink);
        }
        
        // 下一页按钮
        if (currentPage < totalPages) {
            const nextLink = document.createElement('a');
            nextLink.href = '#';
            nextLink.textContent = '»';
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage++;
                updateTable(data, currentPage, itemsPerPage);
            });
            paginationContainer.appendChild(nextLink);
        }
    }
}