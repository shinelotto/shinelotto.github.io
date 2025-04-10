<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基本走势图 - 双色球数据分析</title>
    <link rel="stylesheet" href="../../css/style.css">
    <style>
        body {
            margin: 0;
            padding: 20px 10px;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            min-width: 860px;
        }
        main {
            display: flex;
            justify-content: center;
            padding: 0 20px;
        }
        .data-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            margin: 20px auto;
            overflow-x: visible;
            max-width: calc(100% - 40px);
        }
        .red-ball {
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
        .miss {
            color: #95a5a6;
            font-size: 12px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        .data-table th,
        .data-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
        }
        .parent-header {
            background: #c0392b;
            color: white;
        }
        .pagination {
            padding: 15px;
            text-align: center;
        }
        .page-btn {
            display: inline-block;
            padding: 6px 12px;
            margin: 0 3px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            color: #333;
        }
        .page-btn.active {
            background: #e74c3c;
            color: white;
            border-color: #e74c3c;
        }
    </style>
</head>
<body>
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
        <div class="data-container">
            <table class="data-table">
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
            }
        });

        // 数据加载
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

        // 核心遗漏计算逻辑（向前查找）
        function calculateMiss(number, currentIndex) {
            // 从当前期向前查找（包含当前期）
            for (let i = currentIndex; i >= 0; i--) {
                if (allData[i].red.includes(number)) {
                    return currentIndex - i;
                }
            }
            return currentIndex + 1; // 首期处理
        }

        function calculateTailMiss(tailNumber, currentIndex) {
            // 从当前期向前查找（包含当前期）
            for (let i = currentIndex; i >= 0; i--) {
                if (allData[i].red.some(n => n % 10 === tailNumber)) {
                    return currentIndex - i;
                }
            }
            return currentIndex + 1;
        }

        // 表格渲染
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            
            tbody.innerHTML = allData
                .slice(startIndex, startIndex + ITEMS_PER_PAGE)
                .map((data, dataIndex) => {
                    const globalIndex = startIndex + dataIndex;
                    const isFirstPeriod = data.period === '2003001';

                    // 生成红球列
                    const redCells = Array.from({length: 33}, (_, i) => {
                        const num = i + 1;
                        const isActive = data.red.includes(num);
                        let miss = isActive ? 0 : calculateMiss(num, globalIndex);
                        
                        // 首期特殊处理
                        if (isFirstPeriod && !isActive) miss = 1;

                        return isActive ? 
                            `<td><div class="red-ball">${num.toString().padStart(2,'0')}</div></td>` :
                            `<td><span class="miss">${miss}</span></td>`;
                    }).join('');

                    // 生成尾数列
                    const tailCells = Array.from({length: 10}, (_, i) => {
                        const isActive = data.red.some(n => n % 10 === i);
                        let miss = isActive ? 0 : calculateTailMiss(i, globalIndex);
                        
                        // 首期特殊处理
                        if (isFirstPeriod && !isActive) miss = 1;

                        return isActive ?
                            `<td><div class="red-ball">${i}</div></td>` :
                            `<td><span class="miss">${miss}</span></td>`;
                    }).join('');

                    return `<tr>
                        <td>${data.period}</td>
                        ${redCells}
                        ${tailCells}
                    </tr>`;
                }).join('');
        }

        // 分页功能
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
            renderTableData();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    </script>
</body>
</html>