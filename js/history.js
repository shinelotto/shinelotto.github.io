document.addEventListener('DOMContentLoaded', async function() {
    // 添加加载状态提示
    const tableBody = document.getElementById('history-data');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="no-data">正在加载数据...</td>
        </tr>
    `;

    try {
        // 修正文件路径（从项目根目录指向data文件夹）
        const response = await fetch('../data/ssqhistory.csv');
        if (!response.ok) {
            throw new Error(`文件加载失败，状态码: ${response.status}`);
        }
        
        const csvData = await response.text();
        if (!csvData || csvData.trim().length === 0) {
            throw new Error('数据文件为空');
        }
        
        const allData = parseSSQCSV(csvData);
        if (allData.length === 0) {
            throw new Error('没有解析到有效数据');
        }
        
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
        console.error('数据加载错误:', error);
        document.getElementById('history-data').innerHTML = `
            <tr>
                <td colspan="8" class="no-data error">数据加载失败: ${error.message}</td>
            </tr>
        `;
    }
});

// 增强版CSV解析（处理BOM头和格式问题）
function parseSSQCSV(csvText) {
    // 移除UTF-8 BOM头（如果有）
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    
    const lines = csvText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    // 自动检测表头（兼容有无表头的情况）
    const firstLine = lines[0].split(',');
    const hasHeader = firstLine.some(col => col.includes('红球') || col.includes('期号'));
    const dataStartIndex = hasHeader ? 1 : 0;
    
    const result = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        const currentLine = lines[i].split(',');
        if (currentLine.length < 8) continue;
        
        const item = {
            '期号': currentLine[0]?.trim() || '',
            '红球1': currentLine[1]?.trim() || '',
            '红球2': currentLine[2]?.trim() || '',
            '红球3': currentLine[3]?.trim() || '',
            '红球4': currentLine[4]?.trim() || '',
            '红球5': currentLine[5]?.trim() || '',
            '红球6': currentLine[6]?.trim() || '',
            '蓝球': currentLine[7]?.trim() || '',
            // 从期号提取年份（如2003001 → 2003）
            'year': currentLine[0]?.substring(0, 4) || '未知'
        };
        
        // 验证数据有效性（至少需要期号和第一个红球）
        if (item['期号'] && item['红球1']) {
            result.push(item);
        }
    }
    
    return result;
}

// 初始化年份筛选器（保持不变）
function initYearFilter(data) {
    const yearFilter = document.getElementById('year-filter');
    
    while (yearFilter.options.length > 1) {
        yearFilter.remove(1);
    }
    
    const years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        yearFilter.appendChild(option);
    });
}

// 按年份筛选数据（保持不变）
function filterDataByYear(data, year) {
    if (year === 'all') return data;
    return data.filter(item => item.year === year);
}

// 显示数据（保持不变）
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
            
            const periodCell = document.createElement('td');
            periodCell.textContent = item['期号'] || '';
            row.appendChild(periodCell);
            
            for (let i = 1; i <= 6; i++) {
                const ballCell = document.createElement('td');
                ballCell.textContent = item[`红球${i}`] || '';
                ballCell.className = 'red-ball';
                row.appendChild(ballCell);
            }
            
            const blueBallCell = document.createElement('td');
            blueBallCell.textContent = item['蓝球'] || '';
            blueBallCell.className = 'blue-ball';
            row.appendChild(blueBallCell);
            
            tableBody.appendChild(row);
        });
        
        updatePagination(totalPages, currentPage);
    }
    
    function updatePagination(totalPages, currentPage) {
        const paginationContainer = document.getElementById('pagination-controls');
        paginationContainer.innerHTML = '';
        
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