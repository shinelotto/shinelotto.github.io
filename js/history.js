// 在文件顶部添加全局变量
let currentPage = 1;
let currentData = [];

// 修改displayData函数
function displayData(data) {
    currentData = data; // 保存当前数据集
    const itemsPerPage = 20;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages);
    
    updateTable(currentPage, itemsPerPage);
    updatePagination(totalPages);
}

// 更新分页逻辑
function updatePagination(totalPages) {
    const pages = generatePagination(currentPage, totalPages);
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';

    // 上一页
    const prevLink = createPageLink('«', currentPage > 1, () => {
        currentPage--;
        updateTable();
    });
    container.appendChild(prevLink);

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
    const nextLink = createPageLink('»', currentPage < totalPages, () => {
        currentPage++;
        updateTable();
    });
    container.appendChild(nextLink);
}

// 辅助函数
function createPageLink(text, enabled, onClick) {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = '#';
    if (!enabled) link.className = 'disabled';
    if (enabled) link.addEventListener('click', e => {
        e.preventDefault();
        onClick();
    });
    return link;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.className = 'ellipsis';
    span.textContent = '...';
    return span;
}