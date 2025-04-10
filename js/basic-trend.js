<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基本走势图 - 双色球数据分析</title>
    <link rel="stylesheet" href="../../css/style.css">
    <style>
        /* 保持原有样式不变 */
        body { margin: 0; padding: 20px 10px; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; min-width: 860px; }
        main { display: flex; justify-content: center; padding: 0 20px; }
        .data-container { background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); margin: 20px auto; overflow-x: visible; max-width: calc(100% - 40px); }
        .red-ball { 
            /* 确保球体样式正常显示 */
            display: inline-block;
            width: 18px;
            height: 18px;
            line-height: 18px;
            border-radius: 50%;
            background: #e74c3c;
            color: white;
            text-align: center;
            font-size: 10px;
        }
        .miss { color: #95a5a6; }
        /* 其他样式保持不变 */
    </style>
</head>
<body>
    <!-- 导航栏保持不变 -->
    <header>
        <h1>双色球基本走势图</h1>
        <p>EASY TO BUY, EASY TO WIN</p>
    </header>
    <nav>
        <ul>
            <li><a href="../../index.html">返回主页</a></li>
            <li><a href="history.html">历史开奖</a></li>
            <li class="dropdown">
                <a href="javascript:void(0)" class="active">统计指标</a>
                <div class="dropdown-content"></div>
            </li>
            <li><a href="/pages/trend/index.html" class="active">基本走势图</a></li>
            <li><a href="cold-numbers.html">冷门统计</a></li>
            <li><a href="prediction.html">脑机结合预测</a></li>
        </ul>
    </nav>

    <main>
       div class="data-container">
            <table class="data-table">
                <thead>
                    <tr                        <th rowspan="2">期号</th>
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
            }
        });

        // 数据加载（强化验证）
        async function loadCSVData() {
            const response = await fetch(DATA_PATH);
            const csvTextSamples = 
`2003001,10,11,12,13,26,28,11
2003002,04,09,19,20,21,26,12
...`; // 测试数据样例
            const csvText = await response.text();
            return csvText.split('\n')
                .slice(1)
                .filter(line => {
                    const cols = line.split(',');
                    return cols.length === 7 && /^\d{7}$/.test(cols[0]);
                })
                .map(line => {
                    const [period, ...balls] = line.split');
                    return {
                        period: period.trim(),
                        // 确保红球合法（1-33）
                        red: balls.slice(0,6)
                            .map(n => Math.max(1, Math.min(33, parseInt(n))))
                            .filter(n => !isNaN(n))
                            .sort((a,b) => a - b),
                        blue: parseInt(balls[6])
                    };
                })
                .sort((a, b) => a.period.localeCompare(b.period));
        }

        // 表格渲染（修复版）
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            tbody.innerHTML = getPaginatedData().map((data, dataIndex) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + dataIndex;
                const isFirstPeriod = data.period === '2003001';

                return `<tr>
                    <td class="period-cell">${data.period}</td>
                    ${Array.from({length:33}, (_, i) => {
                        const num = i + 1;
                        const isActive = data.red.includes(num);
                        let miss = isActive ? 0 : calculateMiss(num, globalIndex);
                        if (isFirstPeriod) miss = isActive ? 0 : 1;
                        return isActive 
                            ? `<td class="number-cell"><div class="red-ball">${num.toString().padStart(2,'0')}</div></td>`
                            : `<td class="number-cell"><span class="miss">${miss || ''}</span></td>`;
                    }).join('')}
                    ${Array.from({length:10}, (_, i) => {
                        const isActive = data.red.some(n => n % 10 === i);
                        let miss = isActive ? 0 : calculateTailMiss(i, globalIndex);
                        if (isFirstPeriod) miss = isActive ? 0 : 1;
                        return isActive
                            ? `<td class="number-cell"><div class="red-ball">${i}</div></td>`
                            : `<td class="number-cell"><span class="miss">${miss || ''}</span></td>`;
                    }).join('')}
                </tr>`;
            }).join('');
        }

        // 正确的遗漏计算逻辑        function calculateMiss(number, currentIndex) {
            // 从当前期的下一期开始遍历
            for (let i = currentIndex + 1; i < allData.length; i++) {
                if (allData[i].red.includes(number)) {
                    return i - currentIndex;
                }
            }
            // 如果没有找到，返回总剩余期数（包含当前期）
            return allData.length - currentIndex - 1;
        }

        function calculateTailMiss(tailNumber, currentIndex) {
            for (let i = currentIndex + 1; i < allData.length; i++) {
                if (allData[i].red.some(n => n % 10 === tailNumber)) {
                    return i - currentIndex;
                }
            }
            return allData.length - currentIndex - 1;
        }

        // 分页功能优化
        function renderPagination() {
            const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
            const container = document.getElementById('pagination-controls');
            
            const pageButtons = [];
            if (currentPage > 1) {
                pageButtons.push(`<a class="page-btn" onclick="changePage(${currentPage - 1})">‹ 上一页</a>`);
            }
            
            // 显示当前页周围3页            const startPage = Math.max(1, currentPage - 3);
            const endPage = Math.min(totalPages, currentPage + 3);
            for (let i = startPage; i <= endPage; i++) {
                pageButtons.push(
                    `<a class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</a>`
                );
            }
            
            if (currentPage < totalPages) {
                pageButtons.push(`<a class="page-btn" onclick="changePage(${currentPage + 1})">下一页 ›</a>`);
            }
            
            container.innerHTML = pageButtons.join('');
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