<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width, initial-scale=1.0">
    <title>基本走势图 - 双色球数据分析</title>
    <style>
        /* 保持原有样式不变 */
        body {
            margin: 0;
            padding: 20px 10px;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            min-width: 860px;
        }
        /* 其他样式保持不变... */
    </style>
</head>
<body>
    <!-- 保持原有HTML结构不变 -->
    <header>
        <h1>双色球基本走势图</h1>
        <p>EASY TO BUY, EASY TO WIN</p>
    </header>
    <nav>
        <ul>
            <!-- 导航菜单保持不变 -->
        </ul>
    </nav>

    <main>
        <div class="data-container">
            <table class="data-table">
                <!-- 表头保持不变 -->
                <thead>
                    <tr>
                        <th rowspan="2">期号</th>
                        <th class="parent-header" colspan="11">一区</th>
                        <!-- 其他表头保持不变 -->
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
                // 预处理遗漏数据
                precalculateMissValues();
                renderTableData();
                renderPagination();
            } catch (error) {
                console.error('初始化失败:', error);
                alert('数据加载失败，请检查控制台查看详情');
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

        // 新增：预处理所有遗漏值
        function precalculateMissValues() {
            // 初始化存储结构
            allData.forEach(item => {
                item.missValues = Array(33).fill(0);
                item.tailMissValues = Array(10).fill(0 });

            // 计算红球遗漏
            for (let num = 1; num <= 33; num++) {
                let lastSeen = -1; // 记录最近出现的位置
                
                for (let i = 0; i < allData.length; i++) {
                    if (allData[i].red.includes(num)) {
                        allData[i].missValues[num-1] = 0;
                        lastSeen = i;
                    } else {
                        if (i === 0) {
                            // 首期特殊处理：未出现=1
                            allData[i].missValues[num-1] = 1;
                        } else {
                            if (lastSeen === -1) {
                                // 从未出现过
                                allData[i].missValues[num-1] = i + 1;
                            } else {
                                // 正常计算遗漏
                                allData[i].missValues[num-1] = i - lastSeen;
                            }
                        }
                    }
                }
            }

            // 计算尾数遗漏
            for (let tail = 0; tail <= 9; tail++) {
                let lastSeen = -1;
                
                for (let i = 0; i < allData.length; i++) {
                    if (allData[i].red.some(n => n % 10 === tail)) {
                        allData[i].tailMissValues[tail] = 0;
                        lastSeen = i;
                    } else {
                        if (i === 0) {
                            // 首期特殊处理：未出现=1
                            allData[i].tailMissValues[tail] = 1;
                        } else {
                            if (lastSeen === -1) {
                                // 从未出现过
                                allData[i].tailMissValues[tail] = i + 1;
                            } else {
                                // 正常计算遗漏
                                allData[i].tailMissValues[tail] = i - lastSeen;
                        }
                    }
                }
            }
        }

        // 简化后的表格渲染
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allData.length);
            
            let html = '';
            for (let i = startIndex; i < endIndex; i++) {
                const data = allData[i];
                
                // 生成红球列
                let redCells = '';
                for (let num = 1; num <= 33; num++) {
                    if (data.red.includes(num)) {
                        redCells += `<td><div class="red-ball">${num.toString().padStart(2,'0')}</div></td>`;
                    } else {
                        redCells += `<td><span class="miss">${data.missValues[num-1]}</span></td>`;
                    }
                }
                
                // 生成尾数列
                let tailCells = '';
                for (let tail = 0; tail <= 9; tail++) {
                    if (data.red.some(n => n % 10 === tail)) {
                        tailCells += `<td><div class="red-ball">${tail}</div></td>`;
                    } else {
                        tailCells += `<td><span class="miss">${data.tailMissValues[tail]}</span></td>`;
                    }
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
            let buttons = [];

            if (currentPage > 1) {
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
           Data();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    </script>
</body>
</html>