// 主JavaScript文件 - 全局功能

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 可以在这里添加全局功能
    console.log('网站已加载');
    
    // 为所有返回主页按钮添加事件
    const homeButtons = document.querySelectorAll('.home-button');
    homeButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '../../index.html';
        });
    });
});

// 加载CSV数据的通用函数
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

// 解析CSV数据的通用函数
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        
        const obj = {};
        const currentLine = lines[i].split(',');
        
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentLine[j] ? currentLine[j].trim() : '';
        }
        
        result.push(obj);
    }
    
    return result;
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
function renderPagination(totalPages, currentPage, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    // 上一页按钮
    if (currentPage > 1) {
        const prevLink = document.createElement('a');
        prevLink.href = '#';
        prevLink.textContent = '«';
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            updatePage(currentPage - 1);
        });
        container.appendChild(prevLink);
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
                updatePage(i);
            });
        }
        
        container.appendChild(pageLink);
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        const nextLink = document.createElement('a');
        nextLink.href = '#';
        nextLink.textContent = '»';
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            updatePage(currentPage + 1);
        });
        container.appendChild(nextLink);
    }
}

// 更新页面函数 - 需要在具体页面中实现
function updatePage(page) {
    console.log('更新到页面:', page);
    // 具体实现取决于页面需求
}