/**
 * 主JavaScript文件
 * 包含通用功能、导航和响应式处理
 * 简化版本：专注于彩票走势图功能
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("页面加载完成，初始化功能...");
    
    // 初始化移动端菜单
    initMobileMenu();
    
    // 初始化标签页切换
    initTabs();
    
    // 初始化彩票走势图
    initLotteryTrendChart();
    
    // 添加响应式调整监听
    window.addEventListener('resize', debounce(handleResize, 250));
});

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navTabs = document.querySelector('.nav-tabs');
    const subNav = document.querySelector('.sub-nav');
    
    // 添加空值检查
    if (!menuToggle || !navTabs) {
        console.warn('移动端菜单元素不存在，跳过初始化');
        return;
    }
    
    menuToggle.addEventListener('click', function() {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isExpanded);
        navTabs.style.display = isExpanded ? 'none' : 'block';
        if (subNav) {
            subNav.style.display = isExpanded ? 'none' : 'block';
        }
    });
    
    // 初始状态（移动端隐藏菜单）
    if (window.innerWidth <= 768) {
        navTabs.style.display = 'none';
        if (subNav) {
            subNav.style.display = 'none';
        }
        menuToggle.style.display = 'block';
        menuToggle.setAttribute('aria-expanded', 'false');
    } else {
        menuToggle.style.display = 'none';
        menuToggle.setAttribute('aria-expanded', 'true');
    }
}

/**
 * 初始化标签页切换
 */
function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const subTabLinks = document.querySelectorAll('.sub-tab-link');
    
    // 主标签页切换
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            tabLinks.forEach(tab => tab.classList.remove('active'));
            subTabLinks.forEach(tab => tab.classList.remove('active'));
            
            // 设置当前标签为活动状态
            this.classList.add('active');
            
            // 加载对应内容
            const tabId = this.getAttribute('data-tab');
            loadTabContent(tabId);
        });
    });
    
    // 子标签页切换
    subTabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            subTabLinks.forEach(tab => tab.classList.remove('active'));
            
            // 设置当前标签为活动状态
            this.classList.add('active');
            
            // 加载对应内容
            const subTabId = this.getAttribute('data-subtab');
            loadSubTabContent(subTabId);
        });
    });
}

/**
 * 加载标签页内容
 */
function loadTabContent(tabId) {
    console.log(`加载标签页: ${tabId}`);
    
    // 更新URL但不刷新页面
    const newUrl = window.location.pathname.split('/').slice(0, 2).join('/') + '/' + tabId;
    history.pushState(null, '', newUrl);
    
    // 显示加载状态
    showLoading();
    
    // 模拟加载延迟
    setTimeout(() => {
        hideLoading();
    }, 300);
}

/**
 * 加载子标签页内容
 */
function loadSubTabContent(subTabId) {
    console.log(`加载子标签页: ${subTabId}`);
    
    // 显示加载状态
    showLoading();
    
    // 模拟加载延迟
    setTimeout(() => {
        hideLoading();
    }, 300);
}

/**
 * 初始化彩票走势图
 */
function initLotteryTrendChart() {
    console.log("开始初始化彩票走势图...");
    
    // 检查是否在走势图页面
    const isTrendPage = window.location.pathname.includes('/trends/');
    if (!isTrendPage) {
        console.log("非走势图页面，跳过图表初始化");
        return;
    }
    
    // 获取图表容器
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
        console.warn("未找到图表容器 #chart-container");
        return;
    }
    
    // 检查图表库是否加载
    if (typeof LotteryCharts === 'undefined') {
        console.error("LotteryCharts 图表库未加载");
        // 等待1秒后重试
        setTimeout(() => {
            console.log("重试加载彩票图表...");
            initLotteryTrendChart();
        }, 1000);
        return;
    }
    
    console.log("彩票图表库已加载");
    
    // 判断当前页面类型
    const path = window.location.pathname;
    let lotteryType, areaType;
    
    if (path.includes('/ssq/trends/red-')) {
        lotteryType = 'ssq';
        areaType = 'red';
    } else if (path.includes('/ssq/trends/blue-')) {
        lotteryType = 'ssq';
        areaType = 'blue';
    } else if (path.includes('/dlt/trends/front-')) {
        lotteryType = 'dlt';
        areaType = 'front';
    } else if (path.includes('/dlt/trends/back-')) {
        lotteryType = 'dlt';
        areaType = 'back';
    } else {
        console.log("未知的走势图类型:", path);
        return;
    }
    
    console.log(`检测到彩票类型: ${lotteryType}_${areaType}`);
    
    // 获取数据
    loadChartData(lotteryType, areaType)
        .then(data => {
            if (data && data.length > 0) {
                console.log(`成功获取 ${data.length} 期数据`);
                renderLotteryChart(chartContainer, data, lotteryType, areaType);
            } else {
                console.error("未获取到图表数据");
                showError("未获取到图表数据");
            }
        })
        .catch(error => {
            console.error("加载图表数据失败:", error);
            showError("加载图表数据失败: " + error.message);
        });
}

/**
 * 加载图表数据
 */
function loadChartData(lotteryType, areaType) {
    console.log(`加载 ${lotteryType}_${areaType} 数据...`);
    
    return new Promise((resolve, reject) => {
        // 方式1：从全局变量获取（优先级最高）
        if (typeof window.drawData !== 'undefined') {
            console.log("从 drawData 全局变量获取数据");
            resolve(window.drawData);
            return;
        }
        
        if (typeof window.data !== 'undefined') {
            console.log("从 data 全局变量获取数据");
            resolve(window.data);
            return;
        }
        
        // 方式2：从页面内嵌脚本获取
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            const content = script.textContent;
            if (content.includes('var drawData =') || content.includes('let drawData =') || content.includes('const drawData =')) {
                console.log("从内联脚本获取数据");
                // 提取数据
                try {
                    const match = content.match(/(?:var|let|const)\s+drawData\s*=\s*(\[.*?\]);/s);
                    if (match) {
                        const data = eval(`(${match[1]})`);
                        resolve(data);
                        return;
                    }
                } catch (e) {
                    console.warn("解析内联数据失败:", e);
                }
            }
        }
        
        // 方式3：从API获取
        let apiUrl = '';
        if (lotteryType === 'ssq' && areaType === 'red') {
            apiUrl = '/api/v1/ssq/red-basic-trend';
        } else if (lotteryType === 'ssq' && areaType === 'blue') {
            apiUrl = '/api/v1/ssq/blue-basic-trend';
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            apiUrl = '/api/v1/dlt/front-basic-trend';
        } else if (lotteryType === 'dlt' && areaType === 'back') {
            apiUrl = '/api/v1/dlt/back-basic-trend';
        }
        
        if (apiUrl) {
            console.log(`从API获取数据: ${apiUrl}`);
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API请求失败: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`API返回 ${data.length} 条数据`);
                    resolve(data);
                })
                .catch(reject);
        } else {
            reject(new Error("无法确定数据源"));
        }
    });
}

/**
 * 渲染彩票走势图
 */
function renderLotteryChart(container, data, lotteryType, areaType) {
    console.log(`=== 开始渲染 ${lotteryType}_${areaType} 走势图 ===`);
    console.log(`数据量: ${data.length}`);
    
    if (!data || data.length === 0) {
        console.error("无数据可渲染");
        showError("无数据可渲染");
        return;
    }
    
    // 调试：显示前几条数据
    console.log("前3期数据预览:");
    data.slice(0, 3).forEach((d, i) => {
        console.log(`  第${i+1}期: 期号=${d.issue}, 红球=${d.red_balls?.join(',')}, 蓝球=${d.blue}`);
    });
    
    // 清空容器
    container.innerHTML = '';
    
    // 显示加载状态
    showLoading();
    
    try {
        // 使用专门的图表库渲染
        if (lotteryType === 'ssq' && areaType === 'red') {
            console.log("渲染双色球红球基本走势图");
            
            // 使用charts.js中的formatDataForChart函数
            const chartData = window.formatDataForChart ? 
                window.formatDataForChart(data, lotteryType, areaType) :
                formatDataForChartSimple(data, lotteryType, areaType);
                
            if (chartData) {
                console.log("图表数据准备完成，开始渲染...");
                LotteryCharts.createBasicTrendChart(container, chartData, lotteryType, areaType);
                console.log("图表渲染完成");
            } else {
                console.error("格式化图表数据失败");
                showError("格式化图表数据失败");
            }
            
        } else if (lotteryType === 'ssq' && areaType === 'blue') {
            console.log("渲染双色球蓝球基本走势图");
            
            const chartData = window.formatDataForChart ? 
                window.formatDataForChart(data, lotteryType, areaType) :
                formatDataForChartSimple(data, lotteryType, areaType);
                
            if (chartData) {
                LotteryCharts.createBasicTrendChart(container, chartData, lotteryType, areaType);
            }
            
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            console.log("渲染大乐透前区基本走势图");
            
            const chartData = window.formatDataForChart ? 
                window.formatDataForChart(data, lotteryType, areaType) :
                formatDataForChartSimple(data, lotteryType, areaType);
                
            if (chartData) {
                LotteryCharts.createBasicTrendChart(container, chartData, lotteryType, areaType);
            }
            
        } else if (lotteryType === 'dlt' && areaType === 'back') {
            console.log("渲染大乐透后区基本走势图");
            
            const chartData = window.formatDataForChart ? 
                window.formatDataForChart(data, lotteryType, areaType) :
                formatDataForChartSimple(data, lotteryType, areaType);
                
            if (chartData) {
                LotteryCharts.createBasicTrendChart(container, chartData, lotteryType, areaType);
            }
            
        } else {
            console.warn(`未支持的图表类型: ${lotteryType}_${areaType}`);
            container.innerHTML = `<div class="error">不支持的图表类型: ${lotteryType}_${areaType}</div>`;
        }
    } catch (error) {
        console.error("渲染图表时出错:", error);
        showError("渲染图表失败: " + error.message);
        container.innerHTML = `<div class="error">图表渲染失败: ${error.message}</div>`;
    } finally {
        // 隐藏加载状态
        setTimeout(() => {
            hideLoading();
        }, 500);
    }
}

/**
 * 简化的图表数据格式化函数
 */
function formatDataForChartSimple(data, lotteryType, areaType) {
    console.log("使用简化的数据格式化函数");
    
    if (!data || data.length === 0) {
        return null;
    }
    
    const issues = [];
    const winningNumbers = [];
    const parameters = [];
    
    data.forEach((item, index) => {
        if (!item || !item.issue) return;
        
        issues.push(item.issue);
        
        let numbers = [];
        if (lotteryType === 'ssq' && areaType === 'red') {
            numbers = item.red_balls || [];
        } else if (lotteryType === 'ssq' && areaType === 'blue') {
            numbers = item.blue ? [item.blue] : [];
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            numbers = item.front_balls || [];
        } else if (lotteryType === 'dlt' && areaType === 'back') {
            numbers = item.back_balls || [];
        }
        
        winningNumbers.push(numbers);
        
        const params = {};
        if (lotteryType === 'ssq' && areaType === 'red') {
            params['龙头'] = item.dragon_head || '';
            params['凤尾'] = item.phoenix_tail || '';
            params['和值'] = item.sum_value || '';
            params['跨度'] = item.span || '';
            params['AC值'] = item.ac_value || '';
            params['大小比'] = item.size_ratio || '';
            params['质合比'] = item.prime_ratio || '';
            params['012路比'] = item.road012_ratio || '';
            params['区间比'] = item.zone_ratio || '';
            params['奇偶比'] = item.odd_even_ratio || '';
            params['连号'] = item.consecutive_desc || '';
            params['同尾'] = item.same_tail_desc || '';
            params['冷温热比'] = item.cold_warm_hot_ratio || '';
            params['重号'] = item.repeat_count || '';
            params['邻号'] = item.adjacent_count || '';
            
            // 关键：蓝球数据
            params['_extra_data'] = {
                type: 'blue_ball',
                value: item.blue || null
            };
            
            if (index < 3) {
                console.log(`  第${index+1}期蓝球: ${item.blue}`);
            }
        }
        
        parameters.push(params);
    });
    
    console.log(`数据格式化完成: ${issues.length} 期数据`);
    return { issues, winningNumbers, parameters };
}

/**
 * 显示加载状态
 */
function showLoading() {
    let loading = document.getElementById('loading-overlay');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loading.innerHTML = `
            <div style="text-align: center;">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                "></div>
                <div>正在加载图表...</div>
            </div>
        `;
        document.body.appendChild(loading);
        
        // 添加旋转动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    loading.style.display = 'flex';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * 显示错误消息
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 处理窗口大小变化
 */
function handleResize() {
    console.log("窗口大小变化，重新调整...");
    
    // 更新移动端菜单显示
    const menuToggle = document.getElementById('menu-toggle');
    const navTabs = document.querySelector('.nav-tabs');
    const subNav = document.querySelector('.sub-nav');

    if (!menuToggle) {
        console.warn('移动端菜单切换按钮不存在，跳过菜单响应式处理');
        return;
    }
    
    if (window.innerWidth <= 768) {
        if (menuToggle.getAttribute('aria-expanded') === 'false') {
            navTabs.style.display = 'none';
            if (subNav) subNav.style.display = 'none';
        }
        menuToggle.style.display = 'block';
    } else {
        navTabs.style.display = 'block';
        if (subNav) subNav.style.display = 'block';
        menuToggle.style.display = 'none';
        menuToggle.setAttribute('aria-expanded', 'true');
    }
}