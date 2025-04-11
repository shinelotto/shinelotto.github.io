<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基本走势图 - 双色球数据分析</title>
    <!-- 样式部分保持不变 -->
    <style>
        /* 原有样式不变 */
    </style>
</head>
<body>
    <!-- 头部和导航部分保持不变 -->
    <header>
        <h1>双色球基本走势图</h1>
        <p>EASY TO BUY, EASY TO WIN</p>
    </header>
    <nav>
        <ul>
            <!-- 导航菜单不变 -->
        </ul>
    </nav>

    <main>
        <div class="data-container">
            <table class="data-table">
                <!-- 表头部分保持不变 -->
                <thead>
                    <tr>
                        <th rowspan="2">期号</th>
                        <th class="parent-header" colspan="11">一区</th>
                        <th class="parent-header" colspan="11">二区</th>
                        <th class="parent-header" colspan="11">三区</th>
                        <th class="parent-header" colspan="10">尾数</th>
                    </tr>
                    <tr>
                        <script>
                            document.write(Array.from({length:33}, (_,i) => 
                                `<th>${(i+1).toString().padStart(2,'0')}</th>`
                            ).join(''));
                            document.write(Array.from({length:10}, (_,i) => 
                                `<th>${i}</th>`
                            ).join(''));
                        </script>
                    </tr>
                </thead>
                <tbody id="dataBody"></tbody>
            </table>
            <div class="pagination" id="pagination-controls"></div>
        </div>
    </main>

    <script>
        // 配置常量
        const ITEMS_PER_PAGE = 50;
        const DATA_PATH = '../../../../../data/ssq.csv';
        let currentPage = 1;
        let allData = [];

        // 初始化
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                allData = await loadCSVData();
                renderTableData();
                renderPagination();
            } catch (error) {
                console.error('初始化失败:', error);
                alert('数据加载失败，请检查数据文件路径');
            }
        });

        // 数据加载（保持不变）
        async function loadCSVData() {
            const response = await fetch(DATA_PATH);
            const csvText = await response.text();
            
            return csvText.split('\n')
                .slice(1)
                .filter(line => {
                    const cols = line.split(',');
                    return cols.length === 7 && /^\d{7}$/.test(cols[0]);
                })
                .map(line => {
                    const [period, ...balls] = line.split(',');
                    return {
                        period: period.trim(),
                        red: balls.slice(0,6)
                            .map(n => Math.max(1, Math.min(33, parseInt(n))))
                            .filter(n => !isNaN(n))
                            .sort((a,b) => a - b),
                        blue: parseInt(balls[6])
                    };
                })
                .sort((a, b) => a.period.localeCompare(b.period));
        }

        // 修正后的遗漏计算逻辑
        function calculateMiss(number, currentDataIndex) {
            const currentData = allData[currentDataIndex];
            const isFirstPeriod = currentData.period === '2003001';
            
            // 如果当前期包含该号码，遗漏值为0
            if (currentData.red.includes(number)) {
                return 0;
            }
            
            // 如果是首期且号码未出现，返回1
            if (isFirstPeriod) {
                return 1;
            }
            
            // 从上一期开始向前查找
            for (let i = currentDataIndex - 1; i >= 0; i--) {
                if (allData[i].red.includes(number)) {
                    return currentDataIndex - i;
                }
            }
            
            // 如果一直没找到，返回当前期数（理论上不会执行到这里）
            return currentDataIndex + 1;
        }

        // 修正后的尾数遗漏计算逻辑
        function calculateTailMiss(tailNumber, currentDataIndex) {
            const currentData = allData[currentDataIndex];
            const isFirstPeriod = currentData.period === '2003001';
            
            // 如果当前期包含该尾数，遗漏值为0
            if (currentData.red.some(n => n % 10 === tailNumber)) {
                return 0;
            }
            
            // 如果是首期且尾数未出现，返回1
            if (isFirstPeriod) {
                return 1;
            }
            
            // 从上一期开始向前查找
            for (let i = currentDataIndex - 1; i >= 0; i--) {
                if (allData[i].red.some(n => n % 10 === tailNumber)) {
                    return currentDataIndex - i;
                }
            }
            
            // 如果一直没找到，返回当前期数
            return currentDataIndex + 1;
        }

        // 修正后的表格渲染逻辑
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allData.length);
            
            let html = '';
            for (let i = startIndex; i < endIndex; i++) {
                const data = allData[i];
                const isFirstPeriod = data.period === '2003001';
                
                // 生成红球列
                let redCells = '';
                for (let num = 1; num <= 33; num++) {
                    const isActive = data.red.includes(num);
                    const miss = isActive ? 0 : calculateMiss(num, i);
                    
                    redCells += isActive ? 
                        `<td><div class="red-ball">${num.toString().padStart(2,'0')}</div></td>` :
                        `<td><span class="miss">${miss}</span></td>`;
                }
                
                // 生成尾数列
                let tailCells = '';
                for (let tail = 0; tail <= 9; tail++) {
                    const isActive = data.red.some(n => n % 10 === tail);
                    const miss = isActive ? 0 : calculateTailMiss(tail, i);
                    
                    tailCells += isActive ?
                        `<td><div class="red-ball">${tail}</div></td>` :
                        `<td><span class="miss">${miss}</span></td>`;
                }
                
                html += `<tr>
                    <td>${data.period}</td>
                    ${redCells}
                    ${tailCells}
                </tr>`;
            }
            
            tbody.innerHTML = html;
        }

        // 分页功能（保持不变）
        function renderPagination() {
            const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
            const container = document.getElementById('pagination-controls');
            let buttons            if (currentPage > 1) {
                buttons.push(`<a class="page-btn" onclick="changePage(${currentPage - 1})">‹ 上一页</a>`);
            }

            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            for (let i = startPage; i <= endPage; i++) {
                buttons.push(
                    `<a class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</a>`
                );
            }

            if (currentPage < totalPages) {
                buttons.push(`<a class="page-btn" onclick="changePage(${currentPage + 1})">下一页 ›</a>`);
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