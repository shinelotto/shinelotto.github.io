/**
 * 工具函数
 * 包含通用工具函数
 */

/**
 * 格式化数字，补零显示
 * @param {number} num - 要格式化的数字
 * @param {number} length - 总长度
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num, length = 2) {
    return num.toString().padStart(length, '0');
}

/**
 * 获取颜色基于数值
 * @param {number} value - 数值
 * @param {number} maxValue - 最大值
 * @returns {string} 颜色值
 */
function getColorByValue(value, maxValue) {
    const ratio = value / maxValue;
    
    if (ratio < 0.3) {
        return '#3498db'; // 蓝色，冷色
    } else if (ratio < 0.7) {
        return '#f39c12'; // 橙色，温色
    } else {
        return '#e74c3c'; // 红色，热色
    }
}

// ============================================================================
// 新增：统一遗漏值计算函数（与SSQ代码和data_processor.py保持一致）
// ============================================================================

/**
 * 计算每期的遗漏值矩阵
 * 按照从当前期往前查找的逻辑
 * 
 * @param {Array} winningNumbers - 开奖号码数组，每期一个数组
 * @param {number} totalNumbers - 总号码数
 * @returns {Array} 每期的遗漏值矩阵
 */
function calculateMissedValues(winningNumbers, totalNumbers) {
    const missedValues = [];
    const dataCount = winningNumbers.length;
    
    if (dataCount === 0) {
        return missedValues;
    }
    
    // 对于每一期，计算每个号码的遗漏值
    for (let currentIndex = 0; currentIndex < dataCount; currentIndex++) {
        const rowMissed = {};
        
        // 计算每个号码的遗漏值
        for (let num = 1; num <= totalNumbers; num++) {
            let found = false;
            let lastSeenIndex = -1; // 从未出现过
            
            // 从当前期往前查找（向更早期查找）
            for (let searchIndex = currentIndex; searchIndex >= 0; searchIndex--) {
                if (winningNumbers[searchIndex].includes(num)) {
                    // 找到最近一次出现
                    lastSeenIndex = searchIndex;
                    found = true;
                    break;
                }
            }
            
            if (found) {
                // 计算遗漏值 = 当前期索引 - 找到期索引
                rowMissed[num] = currentIndex - lastSeenIndex;
            } else {
                // 从未出现过，设为18
                rowMissed[num] = 18;
            }
        }
        
        missedValues.push(rowMissed);
    }
    
    return missedValues;
}

/**
 * 根据遗漏期数计算冷温热状态
 * 使用统一的冷温热判断标准：
 * 热号：遗漏0-3期
 * 温号：遗漏4-16期
 * 冷号：遗漏≥17期
 * 
 * @param {number} missedPeriods - 遗漏期数
 * @returns {string} 冷温热状态
 */
function getColdWarmHotStatus(missedPeriods) {
    if (missedPeriods < 4) {
        return "热号";
    } else if (missedPeriods <= 16) {
        return "温号";
    } else {
        return "冷号";
    }
}

/**
 * 根据遗漏期数获取冷温热颜色
 * 使用统一的冷温热颜色标准：
 * 热号(遗漏0-3期): 红色 #f44336
 * 温号(遗漏4-16期): 橙色 #FFA500
 * 冷号(遗漏≥17期): 天蓝色 #87CEEB
 * 
 * @param {number} missedPeriods - 遗漏期数
 * @returns {string} 颜色值
 */
function getColdWarmHotColor(missedPeriods) {
    if (missedPeriods < 4) {
        return "#f44336";  // 热号 - 红色
    } else if (missedPeriods <= 16) {
        return "#FFA500";  // 温号 - 橙色
    } else {
        return "#87CEEB";  // 冷号 - 天蓝色
    }
}

/**
 * 计算每期的冷温热状态矩阵
 * 
 * @param {Array} winningNumbers - 开奖号码数组
 * @param {number} totalNumbers - 总号码数
 * @returns {Array} 每期的冷温热状态矩阵
 */
function calculateColdWarmHotMatrix(winningNumbers, totalNumbers) {
    // 计算遗漏值矩阵
    const missedValues = calculateMissedValues(winningNumbers, totalNumbers);
    
    // 转换为冷温热状态矩阵
    const statusMatrix = [];
    for (let i = 0; i < missedValues.length; i++) {
        const statusRow = {};
        for (let num = 1; num <= totalNumbers; num++) {
            const missed = missedValues[i][num] || 18;
            statusRow[num] = getColdWarmHotStatus(missed);
        }
        statusMatrix.push(statusRow);
    }
    
    return statusMatrix;
}

// ============================================================================
// 原有函数保持不变，确保向后兼容
// ============================================================================

/**
 * 计算统计指标
 * @param {Array} numbers - 号码数组
 * @returns {Object} 统计对象
 */
function calculateStatistics(numbers) {
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return {};
    }
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const stats = {};
    
    // 基本统计
    stats.sum = sorted.reduce((a, b) => a + b, 0);
    stats.average = stats.sum / numbers.length;
    stats.min = Math.min(...numbers);
    stats.max = Math.max(...numbers);
    stats.range = stats.max - stats.min;
    
    // 大小比（大于平均值为大）
    const avg = stats.average;
    stats.bigCount = numbers.filter(n => n > avg).length;
    stats.smallCount = numbers.length - stats.bigCount;
    stats.sizeRatio = `${stats.bigCount}:${stats.smallCount}`;
    
    // 奇偶比
    stats.oddCount = numbers.filter(n => n % 2 === 1).length;
    stats.evenCount = numbers.length - stats.oddCount;
    stats.oddEvenRatio = `${stats.oddCount}:${stats.evenCount}`;
    
    // 质合比
    const isPrime = num => {
        if (num <= 1) return false;
        if (num <= 3) return true;
        if (num % 2 === 0 || num % 3 === 0) return false;
        for (let i = 5; i * i <= num; i += 6) {
            if (num % i === 0 || num % (i + 2) === 0) return false;
        }
        return true;
    };
    
    stats.primeCount = numbers.filter(isPrime).length;
    stats.compositeCount = numbers.length - stats.primeCount;
    stats.primeRatio = `${stats.primeCount}:${stats.compositeCount}`;
    
    // 012路比
    const road012 = [0, 0, 0];
    numbers.forEach(n => road012[n % 3]++);
    stats.road012Ratio = `${road012[0]}:${road012[1]}:${road012[2]}`;
    
    // AC值
    stats.acValue = calculateACValue(numbers);
    
    return stats;
}

/**
 * 计算AC值
 * @param {Array} numbers - 号码数组
 * @returns {number} AC值
 */
function calculateACValue(numbers) {
    if (numbers.length < 2) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const differences = new Set();
    
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            differences.add(Math.abs(sorted[i] - sorted[j]));
        }
    }
    
    return differences.size - (sorted.length - 1);
}

/**
 * 计算遗漏值 - 保留原有接口
 * @param {Array} history - 历史数据
 * @param {number} currentNumber - 当前号码
 * @param {number} maxNumber - 最大号码
 * @returns {Object} 遗漏信息
 */
function calculateOmission(history, currentNumber, maxNumber) {
    const omissions = {};
    
    // 初始化遗漏值
    for (let i = 1; i <= maxNumber; i++) {
        omissions[i] = {
            omission: history.length,
            maxOmission: 0,
            avgOmission: 0,
            lastAppearance: null
        };
    }
    
    // 计算遗漏值
    let totalAppearances = 0;
    history.forEach((numbers, index) => {
        numbers.forEach(num => {
            if (num <= maxNumber) {
                omissions[num].omission = 0;
                omissions[num].lastAppearance = index + 1;
                totalAppearances++;
            }
        });
        
        // 更新未出现号码的遗漏值
        for (let i = 1; i <= maxNumber; i++) {
            if (!numbers.includes(i)) {
                omissions[i].omission++;
                if (omissions[i].omission > omissions[i].maxOmission) {
                    omissions[i].maxOmission = omissions[i].omission;
                }
            }
        }
    });
    
    // 计算平均遗漏值
    for (let i = 1; i <= maxNumber; i++) {
        omissions[i].avgOmission = totalAppearances > 0 ? 
            Math.round(history.length / (omissions[i].lastAppearance ? 1 : 0.5)) : 
            history.length;
    }
    
    return omissions[currentNumber] || { omission: 0, maxOmission: 0, avgOmission: 0, lastAppearance: null };
}

/**
 * 计算冷温热号 - 保留原有接口
 * @param {Array} history - 历史数据
 * @param {number} periods - 统计期数
 * @returns {Object} 冷温热号分类
 */
function calculateColdWarmHot(history, periods = 100) {
    const recentHistory = history.slice(0, periods);
    const frequency = {};
    const maxNumber = Math.max(...recentHistory.flat());
    
    // 初始化频率计数器
    for (let i = 1; i <= maxNumber; i++) {
        frequency[i] = 0;
    }
    
    // 统计出现频率
    recentHistory.forEach(numbers => {
        numbers.forEach(num => {
            if (num <= maxNumber) {
                frequency[num]++;
            }
        });
    });
    
    // 计算平均频率
    const totalAppearances = Object.values(frequency).reduce((a, b) => a + b, 0);
    const avgFrequency = totalAppearances / maxNumber;
    
    // 分类
    const result = {
        cold: [],  // 冷号：频率 < 平均频率的50%
        warm: [],  // 温号：平均频率的50% <= 频率 <= 平均频率的150%
        hot: []    // 热号：频率 > 平均频率的150%
    };
    
    for (let i = 1; i <= maxNumber; i++) {
        const freq = frequency[i];
        if (freq < avgFrequency * 0.5) {
            result.cold.push(i);
        } else if (freq > avgFrequency * 1.5) {
            result.hot.push(i);
        } else {
            result.warm.push(i);
        }
    }
    
    return result;
}

/**
 * 查找连号
 * @param {Array} numbers - 号码数组
 * @returns {Array} 连号数组
 */
function findConsecutiveNumbers(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const consecutive = [];
    let currentGroup = [];
    
    for (let i = 0; i < sorted.length; i++) {
        if (currentGroup.length === 0) {
            currentGroup.push(sorted[i]);
        } else if (sorted[i] === currentGroup[currentGroup.length - 1] + 1) {
            currentGroup.push(sorted[i]);
        } else {
            if (currentGroup.length >= 2) {
                consecutive.push([...currentGroup]);
            }
            currentGroup = [sorted[i]];
        }
    }
    
    if (currentGroup.length >= 2) {
        consecutive.push(currentGroup);
    }
    
    return consecutive;
}

/**
 * 查找同尾号
 * @param {Array} numbers - 号码数组
 * @returns {Object} 同尾号分组
 */
function findSameTailNumbers(numbers) {
    const tailGroups = {};
    
    numbers.forEach(num => {
        const tail = num % 10;
        if (!tailGroups[tail]) {
            tailGroups[tail] = [];
        }
        tailGroups[tail].push(num);
    });
    
    // 过滤出有多个号码的尾数组
    const result = {};
    Object.keys(tailGroups).forEach(tail => {
        if (tailGroups[tail].length > 1) {
            result[tail] = tailGroups[tail];
        }
    });
    
    return result;
}

/**
 * 查找重号
 * @param {Array} currentNumbers - 当前期号码
 * @param {Array} prevNumbers - 上期号码
 * @returns {Array} 重号数组
 */
function findRepeatNumbers(currentNumbers, prevNumbers) {
    return currentNumbers.filter(num => prevNumbers.includes(num));
}

/**
 * 查找邻号
 * @param {Array} currentNumbers - 当前期号码
 * @param {Array} prevNumbers - 上期号码
 * @returns {Array} 邻号数组
 */
function findAdjacentNumbers(currentNumbers, prevNumbers) {
    const adjacent = [];
    
    prevNumbers.forEach(num => {
        if (currentNumbers.includes(num - 1) || currentNumbers.includes(num + 1)) {
            adjacent.push(num);
        }
    });
    
    return adjacent;
}

/**
 * 生成随机号码
 * @param {number} count - 号码数量
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} unique - 是否唯一
 * @returns {Array} 随机号码数组
 */
function generateRandomNumbers(count, min, max, unique = true) {
    const numbers = [];
    
    while (numbers.length < count) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        
        if (!unique || !numbers.includes(num)) {
            numbers.push(num);
        }
    }
    
    return numbers.sort((a, b) => a - b);
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式
 * @returns {string} 格式化后的时间字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
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
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

/**
 * 从URL获取查询参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 设置查询参数
 * @param {string} name - 参数名
 * @param {string} value - 参数值
 */
function setQueryParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
}

/**
 * 删除查询参数
 * @param {string} name - 参数名
 */
function removeQueryParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
}

/**
 * 复制到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise} Promise对象
 */
// 注意：原函数似乎不完整，这里保留原有结构
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}