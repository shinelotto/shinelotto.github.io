<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>基本走势图 - 双色球数据分析</title>
    <link rel="stylesheet" href="../../css/style.css">
    <style>
        /* 样式部分保持不变 */
        body { margin: 0; padding: 20px 10px; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; min-width: 860px; }
        main { display: flex; justify-content: center; padding: 0 20px; }
        .data-container { background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); margin: 20px auto; overflow-x: visible; max-width: calc(100% - 40px); }
        /* 其他样式与之前相同 */
    </style>
</head>
<body>
    <!-- 导航栏保持不变 -->
    <header>...</header>
    <nav>...</nav>

    <main>
        <div class="data-container">
            <table class="data-table">
                <!-- 表格结构保持不变 -->
                <thead>...</thead>
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
                createTableHeader();
                renderTableData();
                renderPagination();
            } catch (error) {
                console.error('初始化失败:', error);
            }
        });

        // 数据加载（保持原始顺序）
        async function loadCSVData() {
            const response = await fetch(DATA_PATH);
            const csvText = await response.text();
            return csvText.split('\n')
                .slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const [period, ...balls] = line.split(',');
                    return {
                        period: period.trim(),
                        red: balls.slice(0,6).map(Number).sort((a,b) => a - b),
                        blue: parseInt(balls[6])
                    };
                });
        }

        // 表格渲染（核心修复）
        function renderTableData() {
            const tbody = document.getElementById('dataBody');
            tbody.innerHTML = getPaginatedData().map((data, dataIndex) => {
                const currentIndex = (currentPage - 1) * ITEMS_PER_PAGE + dataIndex;
                const isFirstPeriod = data.period === '2003001';
                
                // 生成红球列
                const redCells = Array.from({length: 33}, (_, i) => {
                    const num = i + 1;
                    const isActive = data.red.includes(num);
                    const miss = isFirstPeriod ? 
                        (isActive ? 0 : 1) : 
                        calculateMiss(num, currentIndex);
                    return createCell(num, isActive, miss);
                }).join('');

                // 生成尾数列
                const tails = [...new Set(data.red.map(n => n % 10))];
                const tailCells = Array.from({length: 10}, (_, i) => {
                    const isActive = tails.includes(i);
                    const miss = isFirstPeriod ? 
                        (isActive ? 0 : 1) : 
                        calculateTailMiss(i, currentIndex);
                    return createCell(i, isActive, miss);
                }).join('');

                return `<tr>
                    <td class="period-cell">${data.period}</td>
                    ${redCells}${tailCells}
                </tr>`;
            }).join('');
        }

        // 单元格生成器
        function createCell(number, isActive, miss) {
            return isActive ? 
                `<td class="number-cell"><div class="red-ball">${number.toString().padStart(2,'0')}</div></td>` :
                `<td class="number-cell"><span class="miss">${miss}</span></td>`;
        }

        // 遗漏计算逻辑（修复版）
        function calculateMiss(number, currentIndex) {
            const subsequent = allData.slice(currentIndex + 1);
            const nextIndex = subsequent.findIndex(d => d.red.includes(number));
            return nextIndex === -1 ? subsequent.length : nextIndex + 1;
        }

        function calculateTailMiss(tail, currentIndex) {
            const subsequent = allData.slice(currentIndex + 1);
            const nextIndex = subsequent.findIndex(d => 
                d.red.some(n => n % 10 === tail)
            );
            return nextIndex === -1 ? subsequent.length : nextIndex + 1;
        }

        // 分页功能（保持不变）
        function getPaginatedData() {
            const start = (currentPage - 1) * ITEMS_PER_PAGE;
            return allData.slice(start, start + ITEMS_PER_PAGE);
        }

        function renderPagination() {
            const totalPages = Math.ceil(all / ITEMS_PER_PAGE);
            const pagination = document.getElementById('pagination-controls');
            const buttons = [];
            
            // 分页按钮生成逻辑保持不变
            // ...
        }

        window.changePage = function(newPage) {
            // 分页逻辑保持不变
            // ...
        };
    </script>
</body>
</html>