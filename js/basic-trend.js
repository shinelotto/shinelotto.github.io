<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <基本走势图 - 双色球数据分析</title>
    <link rel="stylesheet" href="../../css/style.css">
    <style>
        /* 保持原有样式不变 */
        body { margin: 0; padding: 20px 10px; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; min-width: 860px; }
        main { display: flex; justify-content: center; padding: 0 20px; }
        .data-container { background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); margin: 20px auto; overflow-x: visible; max-width: calc(100% - 40px); }
        /* 其他样式保持不变 */
    </style>
</head>
<body>
    <!-- 导航栏保持不变 -->
    <header>...</header>
    <nav>...</nav>

    <main>
        <div class="data-container">
            <table class="data-table">
                <thead>
                    <!-- 表头结构保持不变 -->
                </thead>
                <tbody id="dataBody"></tbody>
            </table>
            <div class="pagination" id="pagination-controls"></div>
        </div>
    </main>

    <script>
        // 配置常量
        const ITEMS_PER_PAGE = 50;
        const DATA_PATH = '../../../../../data/ssqhistory.csv';
        let currentPage = 1;
        let allData = [];

        // 初始化
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                allData = await loadCSVData();
                console.log('数据加载完成，总期数：', allData.length);
                createTableHeader();
                renderTableData();
                renderPagination();
            } catch (error) {
                console.error('初始化失败:', error);
            }
        });

        // 数据加载（严格验证）
        async function loadCSVData() {
            const response = await fetch(DATA_PATH);
            const csvText = await response.text();
            return csvText.split('\n')
                .slice(1)
                .filter(line => {
                    const valid = line.trim().length > 0 && line.split(',').length === 7;
                    if (!valid) console.warn('无效数据行:', line);
                    return valid;
                })
                .map(line => {
                    const [period, ...balls] = line.split(',');
                    return {
                        period: period.trim(),
                        red: balls.slice(0,6).map(n => parseInt(n)).filter(n => !isNaN(n)).sort((a,b) => a - b),
                        blue: parseInt(balls[6])
                    };
                })
                .sort((a, b) => a.period.localeCompare(b.period)); // 确保按期号排序
        }

        // 表格渲染（修复版）
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            tbody.innerHTML = getPaginatedData().map((data, dataIndex) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + dataIndex;
                const isFirstPeriod = data.period === '2003001';

                // 生成红球列
                const redCells = Array.from({length: 33}, (_, i) => {
                    const num = i + 1;
                    const isActive = data.red.includes(num);
                    let miss = isActive ? 0 : calculateMiss(num, globalIndex);
                    
                    // 首期特殊处理
                    if (isFirstPeriod) miss = isActive ? 0 : 1;

                    return isActive ? 
                        `<td class="number-cell"><div class="red-ball">${num.toString().padStart(2,'0')}</div></td>` :
                        `<td class="number-cell"><span class="miss">${miss}</span></td>`;
                }).join('');

                // 生成尾数列
                const tails = [...new Set(data.red.map(n => n % 10))];
                const tailCells = Array.from({length: 10}, (_, i) => {
                    const isActive = tails.includes(i);
                    let miss = isActive ? 0 : calculateTailMiss(i, globalIndex);
                    
                    // 首期特殊处理
                    if (isFirstPeriod) miss = isActive ? 0 : 1;

                    return isActive ? 
                        `<td class="number-cell"><div class="red-ball">${i}</div></td>` :
                        `<td class="number-cell"><span class="miss">${miss}</span></td>`;
                }).join('');

                return `<tr>
                    <td class="period-cell">${data.period}</                    ${redCells}${tailCells}
                </tr>`;
            }).join('');
        }

        // 修复的遗漏计算逻辑
        function calculateMiss(number, currentIndex) {
            // 从当前期的下一期开始查找
            for (let i = currentIndex + 1; i < allData.length; i++) {
                if (allData[i].red.includes(number)) {
                    return i - currentIndex; // 间隔期数
                }
            }
            return allData.length - currentIndex - 1; // 剩余未出现的期数
        }

        function calculateTailMiss(tail, currentIndex) {
            // 从当前期的下一期开始查找
            for (let i = currentIndex + 1; i < allData.length; i++) {
                if (allData[i].red.some(n => n % 10 === tail)) {
                    return i -;
                }
            }
            return allData.length - currentIndex - 1;
        }

        // 分页功能（优化版）
        function renderPagination() {
            const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
            const container = document.getElementById('pagination-controls');
            
            let buttons = [];
            if (currentPage > 1) {
                buttons.push(`<a class="page-btn" onclick="changePage(${currentPage - 1})">&lt; 上一页</a>`);
            }
            
            // 显示前3页和后3页
            const start = Math.max(1, currentPage - 3);
            const end = Math.min(totalPages, currentPage + 3);
            
            for (let i = start; i <= end; i++) {
                buttons.push(
                    `<a class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</a>`
                );
            }
            
            if (currentPage < totalPages) {
                buttons.push(`<a class="page-btn" onclick="changePage(${currentPage + 1})">下一页 &gt;</a>`);
            }
            
            container.innerHTML = buttons.join('');
        }

        window.changePage = function(newPage) {
            if (newPage < 1 || newPage > Math.ceil(allData.length / ITEMS_PER_PAGE)) return;
            currentPage = newPage;
            renderTableData();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    </script>
</body>
</html>