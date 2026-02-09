/**
 * 图表绘制工具
 * 包含各种图表类型的绘制函数
 * 整合SSQ后区系统的遗漏值计算和冷温热状态判断逻辑
 * 修改：遗漏值显示和冷温热状态判断分离为独立模式
 * 新增：单个参数走势图功能
 */

class LotteryCharts {
    constructor() {
        this.colors = {
            red: '#e74c3c',
            blue: '#3498db',
            green: '#2ecc71',
            orange: '#e67e22',
            purple: '#9b59b6',
            yellow: '#f1c40f',
            cyan: '#1abc9c',
            pink: '#e84393',
            darkBlue: '#2c3e50'
        };
        
        // 冷温热颜色配置
        this.numberStatusColors = {
            'hot': '#f44336',      // 热号 - 红色
            'warm': '#FFA500',     // 温号 - 橙色
            'cold': '#87CEEB',     // 冷号 - 天蓝色
            'default': '#f44336'   // 默认红色
        };
        
        // 数据缓存
        this.allDrawData = null;
        this.currentDrawData = null;
        this.isFiltered = false;
        this.currentStats = null;
        
        // 彩票类型配置
        this.lotteryConfigs = {
            'ssq_red': { totalNumbers: 33 },
            'ssq_blue': { totalNumbers: 16 },
            'dlt_front': { totalNumbers: 35 },
            'dlt_back': { totalNumbers: 12 }
        };
        
        // ============================================================================
        // 新增：参数走势图配置
        // ============================================================================
        this.paramTrendConfigs = {
            // 双色球红球参数走势图配置
            'ssq_red': {
                '龙头': { 
                    title: '红球龙头走势图',
                    paramName: '龙头',
                    columnCount: 14, 
                    minValue: 1,
                    maxValue: 28,
                    valueRanges: [
                        { min: 1, max: 2, label: '1-2' },
                        { min: 3, max: 4, label: '3-4' },
                        { min: 5, max: 6, label: '5-6' },
                        { min: 7, max: 8, label: '7-8' },
                        { min: 9, max: 10, label: '9-10' },
                        { min: 11, max: 12, label: '11-12' },
                        { min: 13, max: 14, label: '13-14' },
                        { min: 15, max: 16, label: '15-16' },
                        { min: 17, max: 18, label: '17-18' },
                        { min: 19, max: 20, label: '19-20' },
                        { min: 21, max: 22, label: '21-22' },
                        { min: 23, max: 24, label: '23-24' },
                        { min: 25, max: 26, label: '25-26' },
                        { min: 27, max: 28, label: '27-28' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '凤尾': { 
                    title: '红球凤尾走势图',
                    paramName: '凤尾',
                    columnCount: 14,  
                    minValue: 6,
                    maxValue: 33,
                    valueRanges: [
                        { min: 32, max: 33, label: '32-33' },
                        { min: 30, max: 31, label: '30-31' },
                        { min: 28, max: 29, label: '28-29' },
                        { min: 26, max: 27, label: '26-27' },
                        { min: 24, max: 25, label: '24-25' },
                        { min: 22, max: 23, label: '22-23' },
                        { min: 20, max: 21, label: '20-21' },
                        { min: 18, max: 19, label: '18-19' },
                        { min: 16, max: 17, label: '16-17' },
                        { min: 14, max: 15, label: '14-15' },
                        { min: 12, max: 13, label: '12-13' },
                        { min: 10, max: 11, label: '10-11' },
                        { min: 8, max: 9, label: '8-9' },
                        { min: 6, max: 7, label: '6-7' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '和值': { 
                    title: '红球和值走势图',
                    paramName: '和值',
                    columnCount: 6,  
                    minValue: 21,
                    maxValue: 183,
                    valueRanges: [
                        { min: 21, max: 60, label: '21-60' },
                        { min: 61, max: 80, label: '61-80' },
                        { min: 81, max: 100, label: '81-100' },
                        { min: 101, max: 120, label: '101-120' },
                        { min: 121, max: 140, label: '121-140' },
                        { min: 141, max: 183, label: '141-183' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '跨度': { 
                    title: '红球跨度走势图',
                    paramName: '跨度',
                    columnCount: 14,  
                    minValue: 5,
                    maxValue: 32,
                    valueRanges: [
                        { min: 5, max: 6, label: '5-6' },
                        { min: 7, max: 8, label: '7-8' },
                        { min: 9, max: 10, label: '9-10' },
                        { min: 11, max: 12, label: '11-12' },
                        { min: 13, max: 14, label: '13-14' },
                        { min: 15, max: 16, label: '15-16' },
                        { min: 17, max: 18, label: '17-18' },
                        { min: 19, max: 20, label: '19-20' },
                        { min: 21, max: 22, label: '21-22' },
                        { min: 23, max: 24, label: '23-24' },
                        { min: 25, max: 26, label: '25-26' },
                        { min: 27, max: 28, label: '27-28' },
                        { min: 29, max: 30, label: '29-30' },
                        { min: 31, max: 32, label: '31-32' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                'AC值': { 
                    title: '红球AC值走势图',
                    paramName: 'AC值',
                    columnCount: 11,  
                    minValue: 0,
                    maxValue: 10,
                    formatValue: (v) => v.toString()
                },
                '大小比': { 
                    title: '红球大小比走势图',
                    paramName: '大小比',
                    columnCount: 7,  
                    values: ['3:3', '4:2', '2:4', '5:1', '1:5', '6:0', '0:6'],
                    formatValue: (v) => v.toString()
                },
                '质合比': { 
                    title: '红球质合比走势图',
                    paramName: '质合比',
                    columnCount: 7, 
                    values: ['0:6', '1:5', '2:4', '3:3', '4:2', '5:1', '6:0'],
                    formatValue: (v) => v.toString()
                },
                '012路比': { 
                    title: '红球012路比走势图',
                    paramName: '012路比',
                    columnCount: 28,  
                    values: ['6:0:0', '5:1:0', '5:0:1', '4:2:0', '4:1:1', '4:0:2', 
                             '3:3:0', '3:2:1', '3:1:2', '3:0:3', '2:4:0', '2:3:1',
                             '2:2:2', '2:1:3', '2:0:4', '1:5:0', '1:4:1', '1:3:2',
                             '1:2:3', '1:1:4', '1:0:5', '0:6:0', '0:5:1', '0:4:2',
                             '0:3:3', '0:2:4', '0:1:5', '0:0:6'],
                    formatValue: (v) => v.toString()
                },
                '区间比': { 
                    title: '红球区间比走势图',
                    paramName: '区间比',
                    columnCount: 28,  
                    values: ['6:0:0', '5:1:0', '5:0:1', '4:2:0', '4:1:1', '4:0:2', 
                             '3:3:0', '3:2:1', '3:1:2', '3:0:3', '2:4:0', '2:3:1',
                             '2:2:2', '2:1:3', '2:0:4', '1:5:0', '1:4:1', '1:3:2',
                             '1:2:3', '1:1:4', '1:0:5', '0:6:0', '0:5:1', '0:4:2',
                             '0:3:3', '0:2:4', '0:1:5', '0:0:6'],
                    formatValue: (v) => v.toString()
                },
                '奇偶比': { 
                    title: '红球奇偶比走势图',
                    paramName: '奇偶比',
                    columnCount: 7,  
                    values: ['0:6', '1:5', '2:4', '3:3', '4:2', '5:1', '6:0'],
                    formatValue: (v) => v.toString()
                },
                '连号': { 
                    title: '红球连号走势图',
                    paramName: '连号',
                    columnCount: 10,  
                    values: ['无连号', '2连', '3连', '4连', '5连', '2连+2连', '2连+3连', '2连+4连', '3连+3连', '2连+2连+2连'],
                    formatValue: (v) => v.toString()
                },
                '同尾': { 
                    title: '红球同尾走势图',
                    paramName: '同尾',
                    columnCount: 9, 
                    values: ['无同尾', '2同尾', '3同尾', '4同尾', '2同尾+2同尾', '2同尾+3同尾', '2同尾+4同尾', '3同尾+3同尾', '2同尾+2同尾+2同尾'],
                    formatValue: (v) => v.toString()
                },
                '冷温热比': { 
                    title: '红球冷温热比走势图',
                    paramName: '冷温热比',
                    columnCount: 28,  // 冷温热比组合
                    values: ['0:0:6', '0:1:5', '0:2:4', '0:3:3', '0:4:2', '0:5:1', '0:6:0',
                             '1:0:5', '1:1:4', '1:2:3', '1:3:2', '1:4:1', '1:5:0',
                             '2:0:4', '2:1:3', '2:2:2', '2:3:1', '2:4:0',
                             '3:0:3', '3:1:2', '3:2:1', '3:3:0',
                             '4:0:2', '4:1:1', '4:2:0',
                             '5:0:1', '5:1:0',
                             '6:0:0'],
                    formatValue: (v) => v.toString()
                },
                '重号': { 
                    title: '红球重号走势图',
                    paramName: '重号',
                    columnCount: 6,  
                    minValue: 0,
                    maxValue: 5,
                    formatValue: (v) => v.toString()
                },
                '邻号': { 
                    title: '红球邻号走势图',
                    paramName: '邻号',
                    columnCount: 7,  
                    minValue: 0,
                    maxValue: 6,
                    formatValue: (v) => v.toString()
                }
            },
            // 双色球蓝球参数走势图配置
            'ssq_blue': {
                '振幅': { 
                    title: '蓝球振幅走势图',
                    paramName: '振幅',
                    columnCount: 16,  
                    minValue: 0,
                    maxValue: 15,
                    formatValue: (v) => v.toString()
                },
                '大小': { 
                    title: '蓝球大小走势图',
                    paramName: '大小',
                    columnCount: 2, 
                    values: ['大', '小'],
                    formatValue: (v) => v.toString()
                },
                '奇偶': { 
                    title: '蓝球奇偶走势图',
                    paramName: '奇偶',
                    columnCount: 2,  
                    values: ['奇', '偶'],
                    formatValue: (v) => v.toString()
                },
                '质合': { 
                    title: '蓝球质合走势图',
                    paramName: '质合',
                    columnCount: 2,  
                    values: ['质', '合'],
                    formatValue: (v) => v.toString()
                },
                '012路': { 
                    title: '蓝球012路走势图',
                    paramName: '012路',
                    columnCount: 3,  
                    values: ['0', '1', '2'],
                    formatValue: (v) => v.toString()
                },
                '区间': { 
                    title: '蓝球区间走势图',
                    paramName: '区间',
                    columnCount: 4, 
                    values: ['一区', '二区', '三区', '四区'],
                    formatValue: (v) => v.toString()
                },
                '冷温热': { 
                    title: '蓝球冷温热走势图',
                    paramName: '冷温热',
                    columnCount: 3,  
                    values: ['冷', '温', '热'],
                    formatValue: (v) => v.toString()
                },
                '重号': { 
                    title: '蓝球重号走势图',
                    paramName: '重号',
                    columnCount: 2,  
                    minValue: 0,
                    maxValue: 1,
                    formatValue: (v) => v.toString()
                },
                '邻号': { 
                    title: '蓝球邻号走势图',
                    paramName: '邻号',
                    columnCount: 2, 
                    minValue: 0,
                    maxValue: 1,
                    formatValue: (v) => v.toString()
                }
            },
            // 大乐透前区参数走势图配置
            'dlt_front': {
                '龙头': { 
                    title: '前区龙头走势图',
                    paramName: '龙头',
                    columnCount: 14,  
                    minValue: 1,
                    maxValue: 31,
                    valueRanges: [
                        { min: 1, max: 2, label: '1-2' },
                        { min: 3, max: 4, label: '3-4' },
                        { min: 5, max: 6, label: '5-6' },
                        { min: 7, max: 8, label: '7-8' },
                        { min: 9, max: 10, label: '9-10' },
                        { min: 11, max: 12, label: '11-12' },
                        { min: 13, max: 14, label: '13-14' },
                        { min: 15, max: 16, label: '15-16' },
                        { min: 17, max: 18, label: '17-18' },
                        { min: 19, max: 20, label: '19-20' },
                        { min: 21, max: 22, label: '21-22' },
                        { min: 23, max: 24, label: '23-24' },
                        { min: 25, max: 26, label: '25-26' },
                        { min: 27, max: 31, label: '27-31' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '凤尾': { 
                    title: '前区凤尾走势图',
                    paramName: '凤尾',
                    columnCount: 14,
                    minValue: 5,
                    maxValue: 35,
                    valueRanges: [
                        { min: 34, max: 35, label: '34-35' },
                        { min: 32, max: 33, label: '32-33' },
                        { min: 30, max: 31, label: '30-31' },
                        { min: 28, max: 29, label: '28-29' },
                        { min: 26, max: 27, label: '26-27' },
                        { min: 24, max: 25, label: '24-25' },
                        { min: 22, max: 23, label: '22-23' },
                        { min: 20, max: 21, label: '20-21' },
                        { min: 18, max: 19, label: '18-19' },
                        { min: 16, max: 17, label: '16-17' },
                        { min: 14, max: 15, label: '14-15' },
                        { min: 12, max: 13, label: '12-13' },
                        { min: 10, max: 11, label: '10-11' },
                        { min: 5, max: 9, label: '5-9' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '和值': { 
                    title: '前区和值走势图',
                    paramName: '和值',
                    columnCount: 6,  
                    minValue: 15,
                    maxValue: 165,
                    valueRanges: [
                        { min: 15, max: 50, label: '15-50' },
                        { min: 51, max: 70, label: '51-70' },
                        { min: 71, max: 90, label: '71-90' },
                        { min: 91, max: 110, label: '91-110' },
                        { min: 111, max: 130, label: '111-130' },
                        { min: 131, max: 165, label: '131-165' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                '跨度': { 
                    title: '前区跨度走势图',
                    paramName: '跨度',
                    columnCount: 14,  
                    minValue: 4,
                    maxValue: 34,
                    valueRanges: [
                        { min: 4, max: 5, label: '4-5' },
                        { min: 6, max: 7, label: '6-7' },
                        { min: 8, max: 9, label: '8-9' },
                        { min: 10, max: 11, label: '10-11' },
                        { min: 12, max: 13, label: '12-13' },
                        { min: 14, max: 15, label: '14-15' },
                        { min: 16, max: 17, label: '16-17' },
                        { min: 18, max: 19, label: '18-19' },
                        { min: 20, max: 21, label: '20-21' },
                        { min: 22, max: 23, label: '22-23' },
                        { min: 24, max: 25, label: '24-25' },
                        { min: 26, max: 27, label: '26-27' },
                        { min: 28, max: 29, label: '28-29' },
                        { min: 30, max: 34, label: '30-34' }
                    ],
                    formatValue: function(v) {
                        if (this.valueRanges) {
                            const range = this.valueRanges.find(r => v >= r.min && v <= r.max);
                            return range ? range.label : v.toString();
                        }
                        return v.toString();
                    }
                },
                'AC值': { 
                    title: '前区AC值走势图',
                    paramName: 'AC值',
                    columnCount: 7,  
                    minValue: 0,
                    maxValue: 6,
                    formatValue: (v) => v.toString()
                },
                '大小比': { 
                    title: '前区大小比走势图',
                    paramName: '大小比',
                    columnCount: 6,  
                    values: ['0:5', '1:4', '2:3', '3:2', '4:1', '5:0'],
                    formatValue: (v) => v.toString()
                },
                '质合比': { 
                    title: '前区质合比走势图',
                    paramName: '质合比',
                    columnCount: 6,  
                    values: ['0:5', '1:4', '2:3', '3:2', '4:1', '5:0'],
                    formatValue: (v) => v.toString()
                },
                '012路比': { 
                    title: '前区012路比走势图',
                    paramName: '012路比',
                    columnCount: 21, 
                    values: ['5:0:0', '4:1:0', '4:0:1', '3:2:0', '3:1:1', '3:0:2', 
                             '2:3:0', '2:2:1', '2:1:2', '2:0:3', '1:4:0', '1:3:1',
                             '1:2:2', '1:1:3', '1:0:4', '0:5:0', '0:4:1', '0:3:2',
                             '0:2:3', '0:1:4', '0:0:5'],
                    formatValue: (v) => v.toString()
                },
                '区间比': { 
                    title: '前区区间比走势图',
                    paramName: '区间比',
                    columnCount: 21,  
                    values: ['5:0:0', '4:1:0', '4:0:1', '3:2:0', '3:1:1', '3:0:2', 
                             '2:3:0', '2:2:1', '2:1:2', '2:0:3', '1:4:0', '1:3:1',
                             '1:2:2', '1:1:3', '1:0:4', '0:5:0', '0:4:1', '0:3:2',
                             '0:2:3', '0:1:4', '0:0:5'],
                    formatValue: (v) => v.toString()
                },
                '奇偶比': { 
                    title: '前区奇偶比走势图',
                    paramName: '奇偶比',
                    columnCount: 6,  
                    values: ['0:5', '1:4', '2:3', '3:2', '4:1', '5:0'],
                    formatValue: (v) => v.toString()
                },
                '连号': { 
                    title: '前区连号走势图',
                    paramName: '连号',
                    columnCount: 7, 
                    values: ['无连号', '2连', '3连', '4连', '5连', '2连+2连', '2连+3连'],
                    formatValue: (v) => v.toString()
                },
                '同尾': { 
                    title: '前区同尾走势图',
                    paramName: '同尾',
                    columnCount: 6,  
                    values: ['无同尾', '2同尾', '3同尾', '4同尾', '2同尾+2同尾', '2同尾+3同尾'],
                    formatValue: (v) => v.toString()
                },
                '冷温热比': { 
                    title: '前区冷温热比走势图',
                    paramName: '冷温热比',
                    columnCount: 21,  
                    values: ['0:0:5', '0:1:4', '0:2:3', '0:3:2', '0:4:1', '0:5:0',
                             '1:0:4', '1:1:3', '1:2:2', '1:3:1', '1:4:0',
                             '2:0:3', '2:1:2', '2:2:1', '2:3:0',
                             '3:0:2', '3:1:1', '3:2:0',
                             '4:0:1', '4:1:0',
                             '5:0:0'],
                    formatValue: (v) => v.toString()
                },
                '重号': { 
                    title: '前区重号走势图',
                    paramName: '重号',
                    columnCount: 6,  
                    minValue: 0,
                    maxValue: 5,
                    formatValue: (v) => v.toString()
                },
                '邻号': { 
                    title: '前区邻号走势图',
                    paramName: '邻号',
                    columnCount: 6,  
                    minValue: 0,
                    maxValue: 5,
                    formatValue: (v) => v.toString()
                }
            },
            // 大乐透后区参数走势图配置
            'dlt_back': {
                '龙头': { 
                    title: '后区龙头走势图',
                    paramName: '龙头',
                    columnCount: 11,  
                    minValue: 1,
                    maxValue: 11,
                    formatValue: (v) => v < 10 ? '0' + v : v.toString()
                },
                '凤尾': { 
                    title: '后区凤尾走势图',
                    paramName: '凤尾',
                    columnCount: 11,
                    minValue: 2,
                    maxValue: 12,
                    formatValue: (v) => v < 10 ? '0' + v : v.toString()
                },
                '和值': { 
                    title: '后区和值走势图',
                    paramName: '和值',
                    columnCount: 21,  
                    minValue: 3,
                    maxValue: 23,
                    formatValue: (v) => v.toString()
                },
                '跨度': { 
                    title: '后区跨度走势图',
                    paramName: '跨度',
                    columnCount: 11, 
                    minValue: 1,
                    maxValue: 11,
                    formatValue: (v) => v.toString()
                },
                '大小比': { 
                    title: '后区大小比走势图',
                    paramName: '大小比',
                    columnCount: 3,  
                    values: ['0:2', '1:1', '2:0'],
                    formatValue: (v) => v.toString()
                },
                '质合比': { 
                    title: '后区质合比走势图',
                    paramName: '质合比',
                    columnCount: 3,  
                    values: ['0:2', '1:1', '2:0'],
                    formatValue: (v) => v.toString()
                },
                '012路比': { 
                    title: '后区012路比走势图',
                    paramName: '012路比',
                    columnCount: 6,  
                    values: ['2:0:0', '1:1:0', '1:0:1', '0:2:0', '0:1:1', '0:0:2'],
                    formatValue: (v) => v.toString()
                },
                '区间比': { 
                    title: '后区区间比走势图',
                    paramName: '区间比',
                    columnCount: 6, 
                    values: ['2:0:0', '1:1:0', '1:0:1', '0:2:0', '0:1:1', '0:0:2'],
                    formatValue: (v) => v.toString()
                },
                '奇偶比': { 
                    title: '后区奇偶比走势图',
                    paramName: '奇偶比',
                    columnCount: 3, 
                    values: ['0:2', '1:1', '2:0'],
                    formatValue: (v) => v.toString()
                },
                '冷温热比': { 
                    title: '后区冷温热比走势图',
                    paramName: '冷温热比',
                    columnCount: 6,  
                    values: ['0:0:2', '0:1:1', '0:2:0', '1:0:1', '1:1:0', '2:0:0'],
                    formatValue: (v) => v.toString()
                },
                '重号': { 
                    title: '后区重号走势图',
                    paramName: '重号',
                    columnCount: 3,  
                    minValue: 0,
                    maxValue: 2,
                    formatValue: (v) => v.toString()
                },
                '邻号': { 
                    title: '后区邻号走势图',
                    paramName: '邻号',
                    columnCount: 3,  
                    minValue: 0,
                    maxValue: 2,
                    formatValue: (v) => v.toString()
                }
            }
        };
    }
    
    /**
     * ============================================================================
     * 核心修改：将遗漏值显示和冷温热状态判断分离
     * 修改1：遗漏值独立显示，从第一期开始未开出的号码遗漏值为1，依次增加
     * 修改2：冷温热状态基于实际遗漏数据判断
     * ============================================================================
     */
    
    /**
     * 获取彩票配置
     */
    getLotteryConfig(lotteryType, areaType) {
        const key = `${lotteryType}_${areaType}`;
        return this.lotteryConfigs[key] || { totalNumbers: 33 };
    }
    
    /**
     * 计算独立的遗漏值显示（模式1）
     * 规则：从第一期开始，未开出的号码遗漏值为1，依次增加
     * 开出号码后，下一期从1开始累加
     * 注意：这只是显示用的遗漏值，不用于冷温热状态判断
     */
    calculateDisplayMissedValues(winningNumbers, totalNumbers) {
        if (!winningNumbers || winningNumbers.length === 0) {
            return [];
        }
        
        const dataCount = winningNumbers.length;
        const displayMissed = [];
        
        // 初始化第一期的遗漏值
        const firstMissed = {};
        const firstWinningNums = winningNumbers[0] || [];
        
        for (let num = 1; num <= totalNumbers; num++) {
            if (firstWinningNums.includes(num)) {
                // 第一期开出的号码，显示遗漏值为0
                firstMissed[num] = 0;
            } else {
                // 第一期未开出的号码，显示遗漏值为1
                firstMissed[num] = 1;
            }
        }
        displayMissed.push(firstMissed);
        
        // 计算后续期的遗漏值
        for (let currentIndex = 1; currentIndex < dataCount; currentIndex++) {
            const rowMissed = {};
            const currentWinningNums = winningNumbers[currentIndex] || [];
            const prevWinningNums = winningNumbers[currentIndex - 1] || [];
            const prevMissed = displayMissed[currentIndex - 1];
            
            for (let num = 1; num <= totalNumbers; num++) {
                if (currentWinningNums.includes(num)) {
                    // 本期开出的号码，显示遗漏值为0
                    rowMissed[num] = 0;
                } else {
                    if (prevWinningNums.includes(num)) {
                        // 上期开出了，本期没开出，从1开始
                        rowMissed[num] = 1;
                    } else {
                        // 上期也没开出，在上期遗漏值基础上+1
                        rowMissed[num] = prevMissed[num] + 1;
                    }
                }
            }
            
            displayMissed.push(rowMissed);
        }
        
        return displayMissed;
    }
    
    /**
     * 计算实际的遗漏数据用于冷温热状态判断（模式2）
     * 规则：从第一期开始，未开出的号码遗漏值为18
     * 每次开出后重置，下一期从0开始计算
     */
    calculateActualMissedForStatus(winningNumbers, totalNumbers) {
        if (!winningNumbers || winningNumbers.length === 0) {
            return [];
        }
        
        const dataCount = winningNumbers.length;
        const actualMissed = [];
        
        // 初始化第一期的实际遗漏值
        const firstActual = {};
        const firstWinningNums = winningNumbers[0] || [];
        
        for (let num = 1; num <= totalNumbers; num++) {
            if (firstWinningNums.includes(num)) {
                // 第一期开出的号码，实际遗漏值为0
                firstActual[num] = 0;
            } else {
                // 第一期未开出的号码，实际遗漏值为18
                firstActual[num] = 18;
            }
        }
        actualMissed.push(firstActual);
        
        // 计算后续期的实际遗漏值
        for (let currentIndex = 1; currentIndex < dataCount; currentIndex++) {
            const rowActual = {};
            const currentWinningNums = winningNumbers[currentIndex] || [];
            
            for (let num = 1; num <= totalNumbers; num++) {
                if (currentWinningNums.includes(num)) {
                    // 本期开出的号码，实际遗漏值为0
                    rowActual[num] = 0;
                } else {
                    // 查找上一期这个号码的实际遗漏值
                    const prevActual = actualMissed[currentIndex - 1][num];
                    
                    if (prevActual === 0) {
                        // 上期开出了，本期没开出，从1开始
                        rowActual[num] = 1;
                    } else {
                        // 上期也没开出，在上期实际遗漏值基础上+1
                        rowActual[num] = prevActual + 1;
                    }
                }
            }
            
            actualMissed.push(rowActual);
        }
        
        return actualMissed;
    }
    
    /**
     * 获取冷温热状态 - 基于实际遗漏数据
     * 热号(0-3期)，温号(4-16期)，冷号(≥17期)
     */
    getColdWarmHotStatus(actualMissedPeriods) {
        let status, color;
        
        if (actualMissedPeriods >= 17) {
            status = 'cold';
            color = this.numberStatusColors.cold;
        } else if (actualMissedPeriods >= 4) {
            status = 'warm';
            color = this.numberStatusColors.warm;
        } else if (actualMissedPeriods >= 0) {
            status = 'hot';
            color = this.numberStatusColors.hot;
        } else {
            status = 'cold';
            color = this.numberStatusColors.cold;
        }
        
        return { status, color };
    }
    
    /**
     * 获取本期出现号码的冷温热状态
     * 基于实际遗漏数据判断
     */
    getWinningNumberStatus(ballNum, rowIndex, displayMissedValues, actualMissedValues) {
        if (rowIndex === 0) {
            return this.getColdWarmHotStatus(18);
        }
        
        // 使用上期的实际遗漏值来判断
        if (actualMissedValues && actualMissedValues[rowIndex - 1] && 
            actualMissedValues[rowIndex - 1][ballNum] !== undefined) {
            const previousActualMissed = actualMissedValues[rowIndex - 1][ballNum];
            return this.getColdWarmHotStatus(previousActualMissed);
        }
        
        return this.getColdWarmHotStatus(0);
    }

/**
 * 基于状态颜色统计冷温热比
 * 统计当期开出号码的冷温热状态比例
 * 这个函数确保冷温热比参数列与球体颜色状态保持一致
 */
calculateColdWarmHotRatioFromStatusColors(winningNums, rowIndex) {
    let coldCount = 0;  // 天蓝色冷号计数
    let warmCount = 0;  // 橙色温号计数
    let hotCount = 0;   // 红色热号计数
    
    // 遍历当期开出的所有号码
    winningNums.forEach(ballNum => {
        // 关键修改：直接查找页面上已经渲染的球体元素，获取其颜色状态
        const ballElement = document.querySelector(`[data-ball-number="${ballNum}"][data-row="${rowIndex}"]`);
        
        if (ballElement) {
            // 从元素属性中直接获取状态
            const status = ballElement.getAttribute('data-status');
            console.log(`号码 ${ballNum}: 直接获取状态=${status}`);
            
            if (status === 'cold') {
                coldCount++;  // 天蓝色冷号
            } else if (status === 'warm') {
                warmCount++;  // 橙色温号
            } else if (status === 'hot') {
                hotCount++;  // 红色热号
            }
        } else {
            // 如果找不到元素，使用与球体颜色相同的判断逻辑
            console.log(`号码 ${ballNum}: 未找到球体元素，使用默认热号`);
            hotCount++;
        }
    });
    
    const ratio = `${coldCount}:${warmCount}:${hotCount}`;
    console.log(`直接统计结果: 冷号=${coldCount}, 温号=${warmCount}, 热号=${hotCount}, 比值=${ratio}`);
    
    return ratio;
}
    
    /**
 * 智能计算参数列宽 - 基于参数值内容自适应
 * 修改：为蓝球列和后区列增加额外宽度
 */
calculateAdaptiveParamWidths(containerWidth, config, displayParams) {
    if (!displayParams || displayParams.length === 0) {
        return this.calculateAdaptiveSizes(containerWidth, config);
    }
    
    // 计算号码总列数 = 基础号码列 + 额外号码列
    const baseNumberColsCount = config.numberCount;  // 基础号码数
    const extraColsCount = this.getExtraColumnsCount(config);  // 额外列数
    
    // 获取额外列配置
    const extraColumnsConfig = this.getExtraColumnsConfig(config);
    
    // 关键修改：为额外列设置更大的宽度倍数
    let extraColWidthMultiplier = 1.0;
    if (extraColumnsConfig) {
        if (extraColumnsConfig.displayMode === 'double') {
            // 后区列：需要显示两个球，需要2倍宽度
            extraColWidthMultiplier = 2.0;
        } else if (extraColumnsConfig.displayMode === 'single') {
            // 蓝球列：单个球，但可以稍宽一些
            extraColWidthMultiplier = 1.5;
        }
    }
    
    // 计算有效总列数（考虑额外列宽度倍数）
    const effectiveExtraCols = extraColsCount * extraColWidthMultiplier;
    const totalNumberColsCount = baseNumberColsCount + effectiveExtraCols;
    
    const paramColsCount = config.paramNames ? config.paramNames.length : 0;
    
    const minNumberCellWidth = 20;
    const minParamCellWidth = 30;
    const maxParamCellWidth = 100;
    const minIssueColWidth = 50;
    
    // 1. 收集每列所有值，计算最大宽度
    const columnData = new Array(paramColsCount).fill().map(() => []);
    
    const sampleRows = Math.min(20, displayParams.length);
    for (let rowIndex = 0; rowIndex < sampleRows; rowIndex++) {
        const rowParams = displayParams[rowIndex] || {};
        config.paramNames.forEach((paramName, colIndex) => {
            const value = rowParams[paramName];
            if (value !== undefined && value !== null) {
                columnData[colIndex].push(value.toString());
            }
        });
    }
    
    // 2. 为每列计算合适宽度
    const paramColumnWidths = [];
    
    for (let colIndex = 0; colIndex < paramColsCount; colIndex++) {
        const paramName = config.paramNames[colIndex];
        const values = columnData[colIndex];
        
        let maxWidth = this.estimateTextWidth(paramName, 12) + 6;
        
        if (values.length > 0) {
            values.forEach(value => {
                const valueWidth = this.estimateTextWidth(value, 10) + 10;
                maxWidth = Math.max(maxWidth, valueWidth);
            });
        }
        
        if (paramName === '连号' || paramName === '同尾') {
            maxWidth = Math.max(maxWidth, 90);
        }
        
        maxWidth = Math.max(minParamCellWidth, maxWidth);
        maxWidth = Math.min(maxParamCellWidth, maxWidth);
        
        paramColumnWidths.push(Math.ceil(maxWidth));
    }
    
    // 3. 计算总宽度（考虑额外列宽度倍数）
    const numbersWidth = baseNumberColsCount * minNumberCellWidth;
    const extraWidth = extraColsCount * minNumberCellWidth * extraColWidthMultiplier;
    const totalParamWidth = paramColumnWidths.reduce((sum, width) => sum + width, 0);
    const minTotalWidth = minIssueColWidth + numbersWidth + extraWidth + totalParamWidth;
    
    console.log(`智能列宽计算: 基础列=${baseNumberColsCount}, 额外列=${extraColsCount}(宽度倍数=${extraColWidthMultiplier}), 号码总宽=${numbersWidth}, 额外列宽=${extraWidth}, 参数总宽=${totalParamWidth}, 最小总宽=${minTotalWidth}, 容器宽=${containerWidth}`);
    
    if (containerWidth >= minTotalWidth) {
        const scaleFactor = Math.min(containerWidth / minTotalWidth, 1.3);
        
        return {
            issueColWidth: Math.floor(minIssueColWidth * scaleFactor),
            numberCellWidth: Math.floor(minNumberCellWidth * scaleFactor),
            paramColWidths: paramColumnWidths.map(width => Math.floor(width * scaleFactor)),
            paramColWidth: Math.floor(totalParamWidth / paramColsCount * scaleFactor),
            cellHeight: Math.floor(20 * scaleFactor),
            fontSize: Math.floor(8 * scaleFactor),
            // 新增布局信息
            baseNumberColsCount: baseNumberColsCount,
            extraColsCount: extraColsCount,
            totalNumberColsCount: totalNumberColsCount,
            // 额外列配置
            extraColumnsConfig: extraColumnsConfig,
            // 新增：额外列宽度倍数
            extraColWidthMultiplier: extraColWidthMultiplier
        };
    } else {
        const availableWidth = containerWidth - minIssueColWidth - numbersWidth - extraWidth;
        const scaleFactor = availableWidth / totalParamWidth;
        
        if (scaleFactor > 0.7) {
            return {
                issueColWidth: minIssueColWidth,
                numberCellWidth: minNumberCellWidth,
                paramColWidths: paramColumnWidths.map(width => Math.floor(width * scaleFactor)),
                paramColWidth: Math.floor((totalParamWidth * scaleFactor) / paramColsCount),
                cellHeight: 18,
                fontSize: 8,
                // 新增布局信息
                baseNumberColsCount: baseNumberColsCount,
                extraColsCount: extraColsCount,
                totalNumberColsCount: totalNumberColsCount,
                // 额外列配置
                extraColumnsConfig: extraColumnsConfig,
                // 新增：额外列宽度倍数
                extraColWidthMultiplier: extraColWidthMultiplier
            };
        } else {
            return {
                issueColWidth: minIssueColWidth,
                numberCellWidth: minNumberCellWidth,
                paramColWidths: new Array(paramColsCount).fill(minParamCellWidth),
                paramColWidth: minParamCellWidth,
                cellHeight: 18,
                fontSize: 8,
                // 新增布局信息
                baseNumberColsCount: baseNumberColsCount,
                extraColsCount: extraColsCount,
                totalNumberColsCount: totalNumberColsCount,
                // 额外列配置
                extraColumnsConfig: extraColumnsConfig,
                // 新增：额外列宽度倍数
                extraColWidthMultiplier: extraColWidthMultiplier
            };
        }
    }
}
    
    /**
     * 获取额外列数
     */
    getExtraColumnsCount(config) {
        const lotteryType = config.lotteryType;
        const areaType = config.areaType;
        
        // 只在主区走势图中添加对应后区列
        if (lotteryType === 'ssq' && areaType === 'red') {
            return 1;  // 蓝球列
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            return 1;  // 后区列
        }
        
        // 后区走势图本身不需要额外列
        return 0;
    }
    
    /**
     * 获取额外列配置
     */
    getExtraColumnsConfig(config) {
        const lotteryType = config.lotteryType;
        const areaType = config.areaType;
        
        if (lotteryType === 'ssq' && areaType === 'red') {
            return {
                type: 'single_ball',  // 单球列
                header: '蓝球',         // 表头显示
                dataField: 'blue',    // 数据字段
                color: '#1E90FF',  // 蓝色
                displayMode: 'single'  // 显示单个号码
            };
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            return {
                type: 'double_balls',  // 双球列
                header: '后 区',        // 表头显示
                dataField: 'back_balls',  // 数据字段
                color: '#1E90FF',  // 蓝色
                displayMode: 'double'  // 显示两个号码
            };
        }
        
        return null;
    }
    
    /**
     * 估算文本宽度
     */
    estimateTextWidth(text, fontSize = 10) {
        if (!text) return 0;
        
        // 不同字符的近似宽度
        const charWidths = {
            chinese: fontSize * 1.2,  // 汉字
            number: fontSize * 0.6,   // 数字
            symbol: fontSize * 0.4,   // 符号
            space: fontSize * 0.3     // 空格
        };
        
        let totalWidth = 0;
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            
            if ((charCode >= 0x4E00 && charCode <= 0x9FFF) ||  // 汉字
                (charCode >= 0x3400 && charCode <= 0x4DBF)) {  // 扩展汉字
                totalWidth += charWidths.chinese;
            } else if (charCode >= 0x30 && charCode <= 0x39) {  // 数字
                totalWidth += charWidths.number;
            } else if (charCode === 0x20 || charCode === 0xA0) {  // 空格
                totalWidth += charWidths.space;
            } else if (charCode === 0x2B || charCode === 0x2D ||  // + -
                       charCode === 0x2E || charCode === 0x2C ||  // . ,
                       charCode === 0x3A) {                       // :
                totalWidth += charWidths.symbol;
            } else {
                totalWidth += fontSize * 0.6;  // 其他字符
            }
        }
        
        return totalWidth;
    }
    
    /**
     * ============================================================================
     * 新增：参数走势图功能
     * ============================================================================
     */
    
    /**
     * 创建参数走势图
     * 根据截图样式，显示单个参数在不同期数的分布
     */
    createParamTrendChart(container, data, lotteryType = 'ssq', areaType = 'red', paramName = 'AC值') {
        if (!container || !data || !data.issues || !data.parameters) {
            console.error('无效的参数走势图数据');
            return;
        }
        
        const containerWidth = container.clientWidth || 2200;
        container.innerHTML = '';
        
        // 获取参数配置
        const paramConfig = this.getParamTrendConfig(lotteryType, areaType, paramName);
        if (!paramConfig) {
            console.error(`找不到参数配置: ${lotteryType}_${areaType}_${paramName}`);
            return;
        }
        
        const displayCount = data.issues.length;
        const displayIssues = data.issues;
        const displayParams = data.parameters;
        
        console.log(`创建参数走势图: ${paramConfig.title}, ${displayCount} 期数据`);
        
        // 计算自适应尺寸
        const adaptiveSizes = this.calculateParamTrendSizes(containerWidth, paramConfig, displayCount);
        
        const issueColWidth = adaptiveSizes.issueColWidth;
        const paramColWidth = adaptiveSizes.paramColWidth;
        const cellHeight = adaptiveSizes.cellHeight;
        const fontSize = adaptiveSizes.fontSize;
        
        const paramColsCount = paramConfig.columnCount;
        const totalWidth = issueColWidth + (paramColsCount * paramColWidth);
        const totalHeight = (displayCount + 1) * cellHeight;
        
        // 创建SVG容器
        const svg = d3.select(container)
            .append('svg')
            .attr('width', totalWidth + 20)
            .attr('height', totalHeight + 50)
            .attr('class', 'param-trend-chart')
            .style('max-width', '100%')
            .style('display', 'block')
            .style('margin', '0 auto')
            .style('overflow', 'visible');
        
        const g = svg.append('g')
            .attr('transform', 'translate(10, 40)');
        
        // 绘制整个表格外边框
        g.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', totalWidth)
            .attr('height', totalHeight)
            .attr('fill', '#fff')
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1);
        
        // ===== 新增：绘制表头浅灰色背景 =====
        g.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', totalWidth)
            .attr('height', cellHeight)  // 表头行高度
            .attr('fill', '#f5f5f5')     // 浅灰色背景
            .attr('stroke', 'none')      // 无边框
            .attr('opacity', 0.8);       // 轻微透明
        
        // 绘制表头下划线
        g.append('line')
            .attr('x1', 0)
            .attr('x2', totalWidth)
            .attr('y1', cellHeight)
            .attr('y2', cellHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1);

        // 添加内部行分隔线
        for (let rowIndex = 1; rowIndex <= displayCount; rowIndex++) {
            g.append('line')
                .attr('x1', 0)
                .attr('x2', totalWidth)
                .attr('y1', rowIndex * cellHeight)
                .attr('y2', rowIndex * cellHeight)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.1);
        }
        
        // 添加列分隔线
        // 1. 期号列和参数列之间的分隔线
        g.append('line')
            .attr('x1', issueColWidth)
            .attr('x2', issueColWidth)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.2);
        
        // 2. 参数列内部的列分隔线
        for (let i = 1; i <= paramColsCount; i++) {
            const x = issueColWidth + i * paramColWidth;
            
            g.append('line')
                .attr('x1', x)
                .attr('x2', x)
                .attr('y1', 0)
                .attr('y2', totalHeight)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.1)
                .attr('opacity', 1);
        }
        
        // 绘制期号列表头
        g.append('text')
            .attr('x', issueColWidth / 2)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize + 2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('期号');
        
        // 绘制期号列数据
        displayIssues.forEach((issue, rowIndex) => {
            g.append('text')
                .attr('x', issueColWidth / 2)
                .attr('y', (rowIndex + 1.5) * cellHeight)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${fontSize + 2}px`)
                .attr('fill', '#333')
                .text(issue);
        });
        
        // 绘制参数列表头
        for (let i = 0; i < paramColsCount; i++) {
            const xPos = issueColWidth + i * paramColWidth + paramColWidth / 2;
            const columnValue = this.getParamColumnValue(paramConfig, i);
            
            g.append('text')
                .attr('x', xPos)
                .attr('y', cellHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${fontSize + 2}px`)
                .attr('font-weight', 'bold')
                .attr('fill', '#333')
                .text(columnValue);
        }
        
        // 绘制参数数据
        this.renderParamTrendData(g, paramConfig, displayParams, displayIssues,
                                 issueColWidth, paramColWidth, cellHeight, fontSize);
        
        // 绘制蓝色连线
        this.renderParamTrendLines(g, paramConfig, displayParams, displayIssues,
                                  issueColWidth, paramColWidth, cellHeight);
        
        // 添加标题
        svg.append('text')
            .attr('x', totalWidth / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#2c3e50')
            .text(paramConfig.title);
        
        svg.append('text')
            .attr('x', totalWidth - 10)
            .attr('y', totalHeight + 40)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', '#999')
            .text(``);
        
        // === 新增：行选择功能 ===
        const selectedRows = new Set();
        
        for (let rowIndex = 0; rowIndex < displayCount; rowIndex++) {
            const clickRect = g.append('rect')
                .attr('x', 0)
                .attr('y', (rowIndex + 1) * cellHeight)
                .attr('width', totalWidth)
                .attr('height', cellHeight)
                .attr('fill', 'transparent')
                .style('cursor', 'pointer');
            
            clickRect.on('click', function() {
                const clickedRowIndex = rowIndex;
                
                if (selectedRows.has(clickedRowIndex)) {
                    selectedRows.delete(clickedRowIndex);
                    clickRect.classed('selected-row-bg', false);
                } else {
                    selectedRows.add(clickedRowIndex);
                    clickRect.classed('selected-row-bg', true);
                }
            });
        }
        
        return { 
            svg, 
            g, 
            paramConfig, 
            selectedRows: selectedRows 
        };
    }
    
    /**
     * 获取参数走势图配置
     */
    getParamTrendConfig(lotteryType, areaType, paramName) {
        const key = `${lotteryType}_${areaType}`;
        const configs = this.paramTrendConfigs[key];
        
        if (configs && configs[paramName]) {
            return configs[paramName];
        }
        
        console.warn(`未找到 ${key}_${paramName} 的参数配置，使用默认配置`);
        return {
            title: `${this.getAreaName(lotteryType, areaType)} ${paramName}走势图`,
            paramName: paramName,
            columnCount: 10,
            minValue: 0,
            maxValue: 9,
            formatValue: (v) => v.toString()
        };
    }
    
    /**
     * 获取区域名称
     */
    getAreaName(lotteryType, areaType) {
        const names = {
            'ssq_red': '双色球红球',
            'ssq_blue': '双色球蓝球',
            'dlt_front': '大乐透前区',
            'dlt_back': '大乐透后区'
        };
        return names[`${lotteryType}_${areaType}`] || '未知';
    }
    
    /**
     * 获取参数列显示的值
     */
    getParamColumnValue(paramConfig, columnIndex) {
        if (paramConfig.valueRanges && paramConfig.valueRanges[columnIndex]) {
            return paramConfig.valueRanges[columnIndex].label;
        }

        if (paramConfig.values && paramConfig.values[columnIndex]) {
            return paramConfig.values[columnIndex];
        }
        
        if (paramConfig.minValue !== undefined && paramConfig.maxValue !== undefined) {
            const value = paramConfig.minValue + columnIndex;
            return paramConfig.formatValue ? paramConfig.formatValue(value) : value.toString();
        }
        
        return columnIndex.toString();
    }
    
    /**
     * 计算参数走势图的自适应尺寸
     */
    calculateParamTrendSizes(containerWidth, paramConfig, displayCount) {
        const columnCount = paramConfig.columnCount;
        
        const minIssueColWidth = 50;
        const minParamCellWidth = 45;
        const baseCellHeight = 30;
        
        const minTotalWidth = minIssueColWidth + (columnCount * minParamCellWidth);
        
        console.log(`参数走势图尺寸计算: 容器宽=${containerWidth}, 列数=${columnCount}, 最小总宽=${minTotalWidth}`);
        
        if (containerWidth >= minTotalWidth) {
            const scaleFactor = Math.min(containerWidth / minTotalWidth, 1.5);
            
            return {
                issueColWidth: Math.floor(minIssueColWidth * scaleFactor),
                paramColWidth: Math.floor(minParamCellWidth * scaleFactor),
                cellHeight: Math.floor(baseCellHeight * scaleFactor),
                fontSize: Math.floor(8 * scaleFactor)
            };
        } else {
            return {
                issueColWidth: minIssueColWidth,
                paramColWidth: minParamCellWidth,
                cellHeight: baseCellHeight,
                fontSize: 8
            };
        }
    }
    
    /**
     * 渲染参数走势图数据
     */
    renderParamTrendData(g, paramConfig, displayParams, displayIssues,
                        issueColWidth, paramColWidth, cellHeight, fontSize) {
        
        const columnCount = paramConfig.columnCount;
        
        displayIssues.forEach((issue, rowIndex) => {
            if (displayParams && displayParams[rowIndex]) {
                const paramValue = displayParams[rowIndex][paramConfig.paramName];
                
                if (paramValue !== undefined && paramValue !== null) {
                    // 找到参数值对应的列索引
                    const columnIndex = this.findParamColumnIndex(paramConfig, paramValue);
                    
                    if (columnIndex >= 0 && columnIndex < columnCount) {
                        const xPos = issueColWidth + columnIndex * paramColWidth + paramColWidth / 2;
                        const yPos = (rowIndex + 1.5) * cellHeight;
                        
                        // 绘制圆点
                        g.append('circle')
                            .attr('cx', xPos)
                            .attr('cy', yPos)
                            .attr('r', Math.min(cellHeight * 0.35, paramColWidth * 0.3))
                            .attr('fill', '#3498db')
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 1)
                            .attr('class', 'param-trend-dot')
                            .attr('data-issue', issue)
                            .attr('data-param-value', paramValue)
                            .attr('title', `期号: ${issue}, ${paramConfig.paramName}: ${paramValue}`);
                        
                        // 绘制数值文字
                        const displayValue = paramConfig.formatValue ? 
                                           paramConfig.formatValue(paramValue) : 
                                           paramValue.toString();
                        
                        g.append('text')
                            .attr('x', xPos)
                            .attr('y', yPos)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', `${fontSize + 1}px`)
                            .attr('font-weight', 'bold')
                            .attr('fill', '#fff')
                            .text(displayValue);
                    }
                }
            }
        });
    }
    
    /**
     * 渲染参数走势图的蓝色连线
     */
    renderParamTrendLines(g, paramConfig, displayParams, displayIssues,
                         issueColWidth, paramColWidth, cellHeight) {
        
        const columnCount = paramConfig.columnCount;
        const validRows = [];
        
        // 收集有效数据行
        displayIssues.forEach((issue, rowIndex) => {
            if (displayParams && displayParams[rowIndex]) {
                const paramValue = displayParams[rowIndex][paramConfig.paramName];
                
                if (paramValue !== undefined && paramValue !== null) {
                    const columnIndex = this.findParamColumnIndex(paramConfig, paramValue);
                    
                    if (columnIndex >= 0 && columnIndex < columnCount) {
                        const xPos = issueColWidth + columnIndex * paramColWidth + paramColWidth / 2;
                        const yPos = (rowIndex + 1.5) * cellHeight;
                        
                        validRows.push({
                            rowIndex,
                            issue,
                            paramValue,
                            columnIndex,
                            x: xPos,
                            y: yPos
                        });
                    }
                }
            }
        });
        
        // 绘制连线 - 连接到球体外边缘
        for (let i = 0; i < validRows.length - 1; i++) {
            const current = validRows[i];
            const next = validRows[i + 1];
        
            // 如果两期间隔太大，不绘制连线
            if (next.rowIndex - current.rowIndex > 10) {
                continue;
            }
        
            // 计算球体半径（球体直径约为单元格高度的80%）
            const ballRadius = cellHeight * 0.30;
        
            // 计算两点之间的角度
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
        
            if (distance === 0) continue; // 避免除以零
        
            // 计算单位向量
            const unitX = dx / distance;
            const unitY = dy / distance;
        
            // 调整起点和终点，让直线在球体边缘停止
            const startX = current.x + unitX * ballRadius;
            const startY = current.y + unitY * ballRadius;
            const endX = next.x - unitX * ballRadius;
            const endY = next.y - unitY * ballRadius;
        
            // 只有当调整后的距离大于0时才绘制连线
            const adjustedDistance = Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY));
            if (adjustedDistance <= 0) continue;
        
           // 创建直线路径（从球体边缘到球体边缘）
            g.append('path')
                .attr('d', `M ${startX},${startY} L ${endX},${endY}`)
                .attr('fill', 'none')
                .attr('stroke', '#3498db')
                .attr('stroke-width', 1.6)
                .attr('stroke-opacity', 0.8)
                .attr('class', 'param-trend-line')
                .attr('data-from', current.issue)
                .attr('data-to', next.issue)
                .attr('title', `从 ${current.issue}(${current.paramValue}) 到 ${next.issue}(${next.paramValue})`);
            }
    }
    
    /**
 * 查找参数值对应的列索引
 */
findParamColumnIndex(paramConfig, paramValue) {
    // 1. 如果是预设值数组（如：大小比、奇偶比等）
    if (paramConfig.values) {
        const strValue = paramValue.toString();
        return paramConfig.values.findIndex(v => v === strValue);
    }
    
    // 2. 如果有值范围配置（如：龙头、凤尾、和值等）
    if (paramConfig.valueRanges) {
        const numericValue = parseInt(paramValue, 10);
        if (!isNaN(numericValue)) {
            // 查找包含该数值的范围
            for (let i = 0; i < paramConfig.valueRanges.length; i++) {
                const range = paramConfig.valueRanges[i];
                if (numericValue >= range.min && numericValue <= range.max) {
                    return i; // 返回范围索引
                }
            }
        }
        // 如果没有找到匹配范围，尝试字符串匹配
        const strValue = paramValue.toString();
        for (let i = 0; i < paramConfig.valueRanges.length; i++) {
            const columnValue = this.getParamColumnValue(paramConfig, i);
            if (columnValue === strValue) {
                return i;
            }
        }
        return -1;
    }
    
    // 3. 如果是纯数值范围（如：AC值、重号等）
    if (paramConfig.minValue !== undefined && paramConfig.maxValue !== undefined) {
        const numericValue = parseInt(paramValue, 10);
        if (!isNaN(numericValue)) {
            const columnIndex = numericValue - paramConfig.minValue;
            if (columnIndex >= 0 && columnIndex < paramConfig.columnCount) {
                return columnIndex;
            }
        }
    }
    
    // 4. 默认按字符串匹配
    const strValue = paramValue.toString();
    for (let i = 0; i < paramConfig.columnCount; i++) {
        const columnValue = this.getParamColumnValue(paramConfig, i);
        if (columnValue === strValue) {
            return i;
        }
    }
    
    return -1;
}
    
    /**
     * 使用自适应列宽的渲染方法
     */
    renderSeparatedMissedValuesWithAutoWidths(g, config, displayNumbers, displayIssues, 
                                            issueColWidth, numberCellWidth, paramColWidths,
                                            cellHeight, fontSize, totalWidth, paramsStartX, displayParams) {
        
        const totalNumbers = config.numberCount;
        const displayMissedValues = this.calculateDisplayMissedValues(displayNumbers, totalNumbers);
        const actualMissedValues = this.calculateActualMissedForStatus(displayNumbers, totalNumbers);

        displayNumbers.forEach((winningNums, rowIndex) => {
            // 遍历所有号码
            for (let num = 1; num <= totalNumbers; num++) {
                const colIndex = num - 1;
                const xPos = issueColWidth + colIndex * numberCellWidth + numberCellWidth / 2;
                const yPos = (rowIndex + 1.5) * cellHeight;
                
                const isWinningNumber = winningNums.includes(num);
                
                if (isWinningNumber) {
                    const statusInfo = this.getWinningNumberStatus(
                        num, rowIndex, displayMissedValues, actualMissedValues
                    );
                    
                    // 绘制彩色圆球
                    g.append('circle')
                        .attr('cx', xPos)
                        .attr('cy', yPos)
                        .attr('r', cellHeight * 0.4)
                        .attr('fill', statusInfo.color)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5)
                        .attr('class', 'lottery-ball')
                        .attr('data-status', statusInfo.status)
                        .attr('title', `号码: ${config.formatNumber(num)}, 状态: ${statusInfo.status === 'hot' ? '热号' : statusInfo.status === 'warm' ? '温号' : '冷号'}`);
                    
                    // 绘制号码文字
                    g.append('text')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize - 1}px`)
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(num));
                } else {
                    const displayMissed = displayMissedValues[rowIndex][num];
                    
                    if (displayMissed > 0) {
                        g.append('text')
                            .attr('x', xPos)
                            .attr('y', yPos)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', `${fontSize - 2}px`)
                            .attr('font-weight', 'normal')
                            .attr('fill', '#aaa')
                            .attr('title', `号码: ${config.formatNumber(num)}, 显示遗漏: ${displayMissed}期`)
                            .text(displayMissed);
                    }
                }
            }
            
            // 绘制参数数据（使用自适应列宽）
            if (displayParams && displayParams[rowIndex]) {
                const params = displayParams[rowIndex];
                let currentParamX = paramsStartX;
                
                config.paramNames.forEach((paramName, colIndex) => {
                    const paramWidth = paramColWidths[colIndex];
                    const paramValue = params[paramName];
                    
                    if (paramValue !== undefined && paramValue !== null) {
                        const xPos = currentParamX + paramWidth / 2;
                        const yPos = (rowIndex + 1.5) * cellHeight;
                        
                        const isNumeric = !isNaN(paramValue) && paramValue !== '';
                        
                        g.append('text')
                            .attr('x', xPos)
                            .attr('y', yPos)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', `${fontSize}px`)
                            .attr('font-weight', isNumeric ? 'bold' : 'normal')
                            .attr('fill', isNumeric ? '#2c3e50' : '#666')
                            .text(paramValue);
                    }
                    
                    currentParamX += paramWidth;
                });
            }
        });
        
        return { displayMissedValues, actualMissedValues };
    }
    
    /**
     * ============================================================================
     * 原有功能
     * ============================================================================
     */

    /**
 * 创建彩票基本走势图
 * 使用分离的遗漏值和冷温热状态逻辑
 * 修改：支持额外列自适应宽度
 */
createBasicTrendChart(container, data, lotteryType = 'ssq', areaType = 'red') {
    if (!container || !data || !data.issues || !data.winningNumbers) {
        console.error('无效的基本走势图数据');
        return;
    }
    
    const containerWidth = container.clientWidth || 2200;
    container.innerHTML = '';
    
    const config = this.getBasicTrendConfig(lotteryType, areaType);
    config.lotteryType = lotteryType;
    config.areaType = areaType;
    
    const displayCount = data.issues.length;
    const displayIssues = data.issues;
    const displayNumbers = data.winningNumbers;
    const displayParams = data.parameters || [];

    // 检查蓝球数据
    if (data.blueBalls && data.blueBalls.length > 0) {
        console.log("检测到蓝球数据:", data.blueBalls);
    
        // 将蓝球数据合并到 parameters 中
        data.blueBalls.forEach((blueBall, index) => {
            if (index < displayParams.length) {
                if (!displayParams[index]['_extra_data']) {
                    displayParams[index]['_extra_data'] = {};
                }
                displayParams[index]['_extra_data'] = {
                    type: 'blue_ball',
                    value: blueBall
                };
                console.log(`第${index+1}期蓝球: ${blueBall}`);
            }
        });
    }
    
    console.log(`开始渲染 ${lotteryType}_${areaType}, ${displayCount} 期数据`);
    
    // 使用智能列宽计算
    const adaptiveSizes = this.calculateAdaptiveParamWidths(containerWidth, config, displayParams);
    
    const issueColWidth = adaptiveSizes.issueColWidth;
    const numberCellWidth = adaptiveSizes.numberCellWidth;
    const cellHeight = adaptiveSizes.cellHeight;
    const fontSize = adaptiveSizes.fontSize;
    const paramColWidths = adaptiveSizes.paramColWidths;
    
    // 获取布局信息
    const baseNumberColsCount = adaptiveSizes.baseNumberColsCount || config.numberCount;
    const extraColsCount = adaptiveSizes.extraColsCount || 0;
    const totalNumberColsCount = adaptiveSizes.totalNumberColsCount || config.numberCount;
    const extraColumnsConfig = adaptiveSizes.extraColumnsConfig || null;
    const extraColWidthMultiplier = adaptiveSizes.extraColWidthMultiplier || 1.0;
    const numberColsCount = baseNumberColsCount + extraColsCount;
    
    const paramColsCount = config.paramNames ? config.paramNames.length : 0;
    
    // 关键修改：计算额外列的实际宽度
    const extraColWidth = numberCellWidth * extraColWidthMultiplier;
    const numbersWidth = baseNumberColsCount * numberCellWidth;
    const extraWidth = extraColsCount * extraColWidth;
    const paramsWidth = paramColWidths.reduce((sum, width) => sum + width, 0);
    
    const totalWidth = issueColWidth + numbersWidth + extraWidth + paramsWidth;
    const totalHeight = (displayCount + 1) * cellHeight;
    
    // 计算关键位置
    const mainBallsStartX = issueColWidth;  // 主区号码开始位置
    const extraBallsStartX = mainBallsStartX + numbersWidth;  // 额外列开始位置
    const paramsStartX = extraBallsStartX + extraWidth;  // 参数开始位置
    
    console.log(`布局: 主区列=${baseNumberColsCount}, 额外列=${extraColsCount}(宽度倍数=${extraColWidthMultiplier}), 总号码列=${totalNumberColsCount}`);
    console.log(`位置: 主区开始=${mainBallsStartX}, 额外列开始=${extraBallsStartX}, 参数开始=${paramsStartX}`);
    console.log(`宽度: 主区宽=${numbersWidth}, 额外列宽=${extraWidth}, 总宽=${totalWidth}`);
    
    // 创建SVG容器
    const svg = d3.select(container)
        .append('svg')
        .attr('width', totalWidth + 20)
        .attr('height', totalHeight + 50)
        .attr('class', 'basic-trend-chart')
        .style('max-width', '100%')
        .style('display', 'block')
        .style('margin', '0 auto')
        .style('overflow', 'visible');
    
    const g = svg.append('g')
        .attr('transform', 'translate(10, 40)');
    
    // 绘制整个表格外边框
    g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', totalWidth)
        .attr('height', totalHeight)
        .attr('fill', '#fff')
        .attr('stroke', 'black')
        .attr('stroke-width', 0.1);

    // ===== 新增：绘制表头浅灰色背景 =====
    g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', totalWidth)
        .attr('height', cellHeight)  // 表头行高度
        .attr('fill', '#f5f5f5')     // 浅灰色背景
        .attr('stroke', 'none')      // 无边框
        .attr('opacity', 0.8);       // 轻微透明
    
    // 绘制表头下划线
    g.append('line')
        .attr('x1', 0)
        .attr('x2', totalWidth)
        .attr('y1', cellHeight)
        .attr('y2', cellHeight)
        .attr('stroke', 'black')
        .attr('stroke-width', 0.1);

    // 添加内部行分隔线
    for (let rowIndex = 1; rowIndex <= displayCount; rowIndex++) {
        g.append('line')
            .attr('x1', 0)
            .attr('x2', totalWidth)
            .attr('y1', rowIndex * cellHeight)
            .attr('y2', rowIndex * cellHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1);
    }
    
    // 添加内部列分隔线
    // 1. 期号列和主区号码列之间的分隔线
    g.append('line')
        .attr('x1', issueColWidth)
        .attr('x2', issueColWidth)
        .attr('y1', 0)
        .attr('y2', totalHeight)
        .attr('stroke', 'black')
        .attr('stroke-width', 0.2);
    
    // 2. 主区号码区域内部的列分隔线
    for (let i = 1; i <= baseNumberColsCount; i++) {
        const x = issueColWidth + i * numberCellWidth;
        
    // 检查是否是分区线
    const isDivision = this.isDivisionLine(i, lotteryType, areaType);
    
    if (isDivision) {
        console.log(`绘制主区分区线: 第${i}列, 位置=${x}, 彩票类型 ${lotteryType}_${areaType}`);
        
        g.append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', 'black')       
            .attr('stroke-width', 0.3)       
            .attr('opacity', 1)
            .attr('class', 'division-line')
            .attr('title', `分区线: 第${Math.ceil(i / 11)}区与第${Math.ceil(i / 11) + 1}区`);
    } else {
        g.append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1)
            .attr('opacity', 1);
    }
}
    
    // 3. 主区号码和额外列之间的分隔线
    if (extraColsCount > 0) {
        const extraColEndX = extraBallsStartX + extraColWidth;

        g.append('line')
            .attr('x1', extraColEndX)
            .attr('x2', extraColEndX)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.3)
            .attr('stroke-dasharray', 'none')  
            .attr('opacity', 1)
            .attr('class', 'extra-column-right-border')
            .attr('title', extraColumnsConfig.header + '列右边框');
    }
    
    // 4. 参数区域内部的列分隔线
    let currentParamX = paramsStartX;
    for (let i = 1; i < paramColsCount; i++) {
        currentParamX += paramColWidths[i-1];
        g.append('line')
            .attr('x1', currentParamX)
            .attr('x2', currentParamX)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1);
    }
    
    // 绘制期号列
    g.append('text')
        .attr('x', issueColWidth / 2)
        .attr('y', cellHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', `${fontSize + 2}px`)
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text('期号');
    
    displayIssues.forEach((issue, rowIndex) => {
        g.append('text')
        .attr('x', issueColWidth / 2)
        .attr('y', (rowIndex + 1.5) * cellHeight)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', `${fontSize + 2}px`)
        .attr('fill', '#333')
        .text(issue);
    });
    
    // 绘制主区号码列表头
    for (let i = 0; i < baseNumberColsCount; i++) {
        const xPos = issueColWidth + i * numberCellWidth + numberCellWidth / 2;
        
        g.append('text')
            .attr('x', xPos)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize+ 2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(config.formatNumber(i + 1));
    }
    
    // 绘制额外列表头
    if (extraColumnsConfig) {
        const extraHeaderX = extraBallsStartX + extraColWidth / 2;
        g.append('text')
            .attr('x', extraHeaderX)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize+ 2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(extraColumnsConfig.header);
    }
    
    // 绘制参数列表头（使用自适应列宽）
    currentParamX = paramsStartX;
    config.paramNames.forEach((paramName, index) => {
        const paramWidth = paramColWidths[index];
        const xPos = currentParamX + paramWidth / 2;
        
        g.append('text')
            .attr('x', xPos)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize+ 2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(paramName);
        
        currentParamX += paramWidth;
    });
    
    // 渲染主区数据
    this.renderMainBallData(g, config, displayNumbers, displayIssues,
                           issueColWidth, numberCellWidth, paramColWidths,
                           cellHeight, fontSize, totalWidth, 
                           baseNumberColsCount, displayParams);
    
    // 渲染额外列数据
    if (extraColumnsConfig) {
        this.renderExtraColumnData(g, config, displayParams, extraColumnsConfig,
                                  extraBallsStartX, extraColWidth, cellHeight,
                                  fontSize, displayCount);
    }
    
    // 渲染参数数据
    this.renderParameterData(g, config, displayParams, paramsStartX, paramColWidths,
                            cellHeight, fontSize, displayCount);
    
    // 添加标题
    svg.append('text')
        .attr('x', totalWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text(config.title);
    
    svg.append('text')
        .attr('x', totalWidth - 10)
        .attr('y', totalHeight + 40)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('fill', '#999')
        .text(``);
    
    // === 新增：行选择功能 ===
    const selectedRows = new Set(); // 存储选中行的索引
    
    for (let rowIndex = 0; rowIndex < displayCount; rowIndex++) {
    // 创建透明的点击区域
        const clickRect = g.append('rect')
            .attr('x', 0)
            .attr('y', (rowIndex + 1) * cellHeight)
            .attr('width', totalWidth)
            .attr('height', cellHeight)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer');
    
        // 点击事件
        clickRect.on('click', function() {
            const clickedRowIndex = rowIndex;
        
            if (selectedRows.has(clickedRowIndex)) {
                // 取消选择
                selectedRows.delete(clickedRowIndex);
                clickRect.classed('selected-row-bg', false);
            } else {
                // 选择该行
                selectedRows.add(clickedRowIndex);
                clickRect.classed('selected-row-bg', true);
            }
        });
    }
    
    return { 
        svg, 
        g, 
        config, 
        selectedRows: selectedRows 
    };
} 
    /**
     * 渲染主区号码数据
     */
    renderMainBallData(g, config, displayNumbers, displayIssues,
                      issueColWidth, numberCellWidth, paramColWidths,
                      cellHeight, fontSize, totalWidth, 
                      baseNumberColsCount, displayParams) {
        
        const totalNumbers = baseNumberColsCount;
        const displayMissedValues = this.calculateDisplayMissedValues(displayNumbers, totalNumbers);
        const actualMissedValues = this.calculateActualMissedForStatus(displayNumbers, totalNumbers);

        displayNumbers.forEach((winningNums, rowIndex) => {

            let coldCount = 0, warmCount = 0, hotCount = 0;

            for (let num = 1; num <= totalNumbers; num++) {
                const colIndex = num - 1;
                const xPos = issueColWidth + colIndex * numberCellWidth + numberCellWidth / 2;
                const yPos = (rowIndex + 1.5) * cellHeight;
                
                const isWinningNumber = winningNums.includes(num);
                
                if (isWinningNumber) {
                    const statusInfo = this.getWinningNumberStatus(
                        num, rowIndex, displayMissedValues, actualMissedValues
                    );

                    // 直接统计冷温热号码数量
                    if (statusInfo.status === 'cold') {
                        coldCount++;  // 天蓝色冷号
                    } else if (statusInfo.status === 'warm') {
                        warmCount++;  // 橙色温号
                    } else if (statusInfo.status === 'hot') {
                        hotCount++;  // 红色热号
                    }
                    
                    g.append('circle')
                        .attr('cx', xPos)
                        .attr('cy', yPos)
                        .attr('r', cellHeight * 0.4)
                        .attr('fill', statusInfo.color)
                        .attr('stroke', 'none')
                        .attr('stroke-width', 0)
                        .attr('class', 'lottery-ball')
                        .style('filter', 'none')
                        .attr('data-status', statusInfo.status)
                        .attr('title', `号码: ${config.formatNumber(num)}, 状态: ${statusInfo.status === 'hot' ? '热号' : statusInfo.status === 'warm' ? '温号' : '冷号'}`);
                    
                    g.append('text')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize + 2}px`)
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(num));
                } else {
                    const displayMissed = displayMissedValues[rowIndex][num];
                    
                    if (displayMissed > 0) {
                        g.append('text')
                            .attr('x', xPos)
                            .attr('y', yPos)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', `${fontSize + 1}px`)
                            .attr('font-weight', 'normal')
                            .attr('fill', '#aaa')
                            .attr('title', `号码: ${config.formatNumber(num)}, 显示遗漏: ${displayMissed}期`)
                            .text(displayMissed);
                    }
                }
            }

            if (displayParams && displayParams[rowIndex]) {
                // 红球、大乐透前区/后区：冷温热比计算（保持原有正确逻辑）
                if (config.lotteryType === 'ssq' && config.areaType === 'red' ||
                    config.lotteryType === 'dlt' && (config.areaType === 'front' || config.areaType === 'back')) {

                    const ratio = `${coldCount}:${warmCount}:${hotCount}`;
                    displayParams[rowIndex]['冷温热比'] = ratio;
 
                // 调试信息
                if (rowIndex < 3) {
                    console.log(`直接统计 - 第${rowIndex+1}期: 冷号=${coldCount}, 温号=${warmCount}, 热号=${hotCount}, 比值=${ratio}`);
                }
            }
            // 蓝球：冷温热状态计算（新增修复）
            else if (config.lotteryType === 'ssq' && config.areaType === 'blue') {
                // 基于球体颜色统计结果确定状态
                let coldWarmHotStatus = '';
                
                // 蓝球只有一个号码，统计结果中只有一个为1，其他为0
                if (hotCount > 0) {
                    coldWarmHotStatus = '热';  // 有红色热号
                } else if (warmCount > 0) {
                    coldWarmHotStatus = '温';  // 有橙色温号
                } else if (coldCount > 0) {
                    coldWarmHotStatus = '冷';  // 有天蓝色冷号
                } else {
                    // 默认情况
                    coldWarmHotStatus = '热';
                }
                
                // 修复：设置蓝球冷温热状态
                displayParams[rowIndex]['冷温热'] = coldWarmHotStatus;
   
                // 调试信息
                if (rowIndex < 3) {
                    console.log(`蓝球第${rowIndex+1}期: 冷号=${coldCount}, 温号=${warmCount}, 热号=${hotCount}, 状态=${coldWarmHotStatus}`);
                }
            }
        }
    });

    return { displayMissedValues, actualMissedValues };
}

    /**
     * 渲染额外列数据
     */
    renderExtraColumnData(g, config, displayParams, extraColumnsConfig,
                         extraBallsStartX, numberCellWidth, cellHeight,
                         fontSize, displayCount) {
        
        for (let rowIndex = 0; rowIndex < displayCount; rowIndex++) {
            const extraColX = extraBallsStartX + numberCellWidth / 2;
            const yPos = (rowIndex + 1.5) * cellHeight;
            
            const extraData = displayParams && displayParams[rowIndex] ? 
                            displayParams[rowIndex]['_extra_data'] : null;
            
            if (extraData && extraData.value) {
                if (extraData.type === 'blue_ball' && extraData.value) {
                    // 渲染蓝球
                    const blueBall = extraData.value;
                    console.log(`渲染第${rowIndex+1}期蓝球: ${blueBall}`);
                    
                    g.append('circle')
                        .attr('cx', extraColX)
                        .attr('cy', yPos)
                        .attr('r', cellHeight * 0.4)
                        .attr('fill', '#1E90FF')
                        .attr('stroke', 'none')
                        .attr('stroke-width', 0)
                        .attr('class', 'lottery-ball extra-ball')
                        .style('filter', 'none')
                        .attr('title', `蓝球: ${config.formatNumber(blueBall)}`);
                    
                    g.append('text')
                        .attr('x', extraColX)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize + 2}px`)
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(blueBall));
                } else if (extraData.type === 'back_balls' && extraData.value && extraData.value.length > 0) {
                    // 渲染后区两个号码
                    const backBalls = extraData.value;

                    // 使用与前区相同的半径计算公式
                    const ballRadius = cellHeight * 0.4;  
                    
                    console.log(`渲染第${rowIndex+1}期后区: ${backBalls.join(',')}`);

                    // 计算位置：第一个球在左侧，第二个球在右侧
                    const firstBallX = extraColX - ballRadius;
                    const secondBallX = extraColX + ballRadius;
                    
                    // 渲染第一个球
                    g.append('circle')
                        .attr('cx', firstBallX)
                        .attr('cy', yPos)
                        .attr('r', ballRadius)  // 使用相同的半径
                        .attr('fill', '#1E90FF')
                        .attr('stroke', 'none')
                        .attr('stroke-width', 0)  
                        .attr('class', 'lottery-ball extra-ball')
                        .style('filter', 'none')
                        .attr('title', `后区: ${config.formatNumber(backBalls[0])}`);
    
                    g.append('text')
                        .attr('x', firstBallX)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize + 2}px`)  
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(backBalls[0]));
    
                // 渲染第二个球
                if (backBalls.length > 1) {
                    g.append('circle')
                        .attr('cx', secondBallX)
                        .attr('cy', yPos)
                        .attr('r', ballRadius)  // 使用相同的半径
                        .attr('fill', '#1E90FF')
                        .attr('stroke', 'none')
                        .attr('stroke-width', 0)  
                        .attr('class', 'lottery-ball extra-ball')
                        .style('filter', 'none')
                        .attr('title', `后区: ${config.formatNumber(backBalls[1])}`);
        
                    g.append('text')
                        .attr('x', secondBallX)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize + 2}px`)  
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(backBalls[1]));
                    }
                }
            } else {
                console.log(`第${rowIndex+1}期: 无额外列数据`, extraData);
            }
        }
    }
    
    /**
     * 渲染参数数据
     */
    renderParameterData(g, config, displayParams, paramsStartX, paramColWidths,
                       cellHeight, fontSize, displayCount) {
        
        for (let rowIndex = 0; rowIndex < displayCount; rowIndex++) {
            if (displayParams && displayParams[rowIndex]) {
                const params = displayParams[rowIndex];
                let currentParamX = paramsStartX;
                
                config.paramNames.forEach((paramName, colIndex) => {
                    const paramWidth = paramColWidths[colIndex];
                    const paramValue = params[paramName];
                    
                    if (paramValue !== undefined && paramValue !== null) {
                        const xPos = currentParamX + paramWidth / 2;
                        const yPos = (rowIndex + 1.5) * cellHeight;
                        
                        const isNumeric = !isNaN(paramValue) && paramValue !== '';
                        
                        g.append('text')
                            .attr('x', xPos)
                            .attr('y', yPos)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', `${fontSize + 2}px`)
                            .attr('font-weight', 'normal')
                            .attr('fill', '#333')
                            .text(paramValue);
                    }
                    
                    currentParamX += paramWidth;
                });
            }
        }
    }
    
    /**
     * 创建冷温热统计图表
     * 基于实际遗漏数据
     */
    createColdWarmHotChart(container, data, lotteryType = 'ssq', areaType = 'red') {
        if (!container || !data || !data.issues || !data.winningNumbers) {
            console.error('无效的冷温热图表数据');
            return;
        }
        
        const containerWidth = container.clientWidth || 2400;
        container.innerHTML = '';
        
        const config = this.getBasicTrendConfig(lotteryType, areaType);
        config.lotteryType = lotteryType;
        config.areaType = areaType;
        
        const displayCount = data.issues.length;
        const displayIssues = data.issues;
        const displayNumbers = data.winningNumbers;

        // 计算实际遗漏值用于状态判断
        const totalNumbers = config.numberCount;
        const actualMissedValues = this.calculateActualMissedForStatus(displayNumbers, totalNumbers);
        
        // 自适应计算布局
        const adaptiveSizes = this.calculateAdaptiveSizes(containerWidth, config);
        
        const issueColWidth = adaptiveSizes.issueColWidth;
        const numberCellWidth = adaptiveSizes.numberCellWidth;
        const cellHeight = adaptiveSizes.cellHeight;
        const fontSize = adaptiveSizes.fontSize;
        
        const numberColsCount = config.numberCount;
        const totalWidth = issueColWidth + (numberColsCount * numberCellWidth);
        const totalHeight = (displayCount + 1) * cellHeight;
        
        // 创建SVG容器
        const svg = d3.select(container)
            .append('svg')
            .attr('width', totalWidth + 20)
            .attr('height', totalHeight + 50)
            .attr('class', 'cold-warm-hot-chart')
            .style('max-width', '100%')
            .style('display', 'block')
            .style('margin', '0 auto')
            .style('overflow', 'visible');
        
        const g = svg.append('g')
            .attr('transform', 'translate(10, 40)');
        
        // 绘制整个表格外边框
        g.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', totalWidth)
            .attr('height', totalHeight)
            .attr('fill', '#fff')
            .attr('stroke', 'black')
            .attr('stroke-width', 0.1);
        
        // 绘制表头下划线
        g.append('line')
            .attr('x1', 0)
            .attr('x2', totalWidth)
            .attr('y1', cellHeight)
            .attr('y2', cellHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.3);

        // 添加内部行分隔线
        for (let rowIndex = 1; rowIndex <= displayCount; rowIndex++) {
            g.append('line')
                .attr('x1', 0)
                .attr('x2', totalWidth)
                .attr('y1', rowIndex * cellHeight)
                .attr('y2', rowIndex * cellHeight)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.1);
        }
        
        // 添加号码区域内部的列分隔线
        for (let i = 1; i < numberColsCount; i++) {
            const x = issueColWidth + i * numberCellWidth;

            g.append('line')
                .attr('x1', x)
                .attr('x2', x)
                .attr('y1', 0)
                .attr('y2', totalHeight)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.1)
                .attr('opacity', 0.3);
        }
        
        // 绘制期号列
        g.append('text')
            .attr('x', issueColWidth / 2)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize + 2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('期号');
        
        displayIssues.forEach((issue, rowIndex) => {
            g.append('text')
                .attr('x', issueColWidth / 2)
                .attr('y', (rowIndex + 1.5) * cellHeight)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${fontSize + 1}px`)
                .attr('fill', '#333')
                .text(issue);
        });
        
        // 绘制号码列表头
        for (let i = 0; i < numberColsCount; i++) {
            const xPos = issueColWidth + i * numberCellWidth + numberCellWidth / 2;
            
            g.append('text')
                .attr('x', xPos)
                .attr('y', cellHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${fontSize}px`)
                .attr('font-weight', 'bold')
                .attr('fill', '#333')
                .text(config.formatNumber(i + 1));
        }
        
        // 绘制冷温热状态
        displayNumbers.forEach((winningNums, rowIndex) => {
            // 遍历所有号码
            for (let num = 1; num <= totalNumbers; num++) {
                const colIndex = num - 1;
                const xPos = issueColWidth + colIndex * numberCellWidth + numberCellWidth / 2;
                const yPos = (rowIndex + 1.5) * cellHeight;
                
                const isWinningNumber = winningNums.includes(num);
                
                if (isWinningNumber) {
                    // 本期出现的号码 - 获取状态
                    let statusInfo;
                    if (rowIndex === 0) {
                        // 第一期
                        if (actualMissedValues[0] && actualMissedValues[0][num] !== undefined) {
                            statusInfo = this.getColdWarmHotStatus(actualMissedValues[0][num]);
                        } else {
                            statusInfo = this.getColdWarmHotStatus(0);
                        }
                    } else {
                        // 使用上期的实际遗漏值来判断
                        const previousActualMissed = actualMissedValues[rowIndex - 1][num];
                        statusInfo = this.getColdWarmHotStatus(previousActualMissed);
                    }
                    
                    // 绘制彩色圆球
                    g.append('circle')
                        .attr('cx', xPos)
                        .attr('cy', yPos)
                        .attr('r', cellHeight * 0.4)
                        .attr('fill', statusInfo.color)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5)
                        .attr('class', 'lottery-ball status-ball')
                        .attr('data-status', statusInfo.status)
                        .attr('title', `号码: ${config.formatNumber(num)}, 状态: ${statusInfo.status === 'hot' ? '热号' : statusInfo.status === 'warm' ? '温号' : '冷号'}, 实际遗漏: ${rowIndex === 0 ? 0 : actualMissedValues[rowIndex - 1][num]}`);
                    
                    // 绘制号码文字
                    g.append('text')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize - 1}px`)
                        .attr('font-weight', 'bold')
                        .attr('fill', '#fff')
                        .text(config.formatNumber(num));
                } else {
                    // 本期未出现的号码 - 显示当前的实际遗漏值
                    const currentActualMissed = actualMissedValues[rowIndex][num];
                    
                    g.append('text')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', `${fontSize - 2}px`)
                        .attr('font-weight', 'normal')
                        .attr('fill', '#aaa')
                        .attr('title', `号码: ${config.formatNumber(num)}, 实际遗漏: ${currentActualMissed}期`)
                        .text(currentActualMissed);
                }
            }
        });
        
        // 添加标题
        svg.append('text')
            .attr('x', totalWidth / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#2c3e50')
            .text(`${config.title} - 冷温热状态图`);
        
        // 添加图例
        const legendData = [
            { label: '热号(0-3期)', color: this.numberStatusColors.hot },
            { label: '温号(4-16期)', color: this.numberStatusColors.warm },
            { label: '冷号(≥17期)', color: this.numberStatusColors.cold }
        ];
        
        const legendStartX = 10;
        const legendY = totalHeight + 30;
        
        legendData.forEach((item, index) => {
            const legendX = legendStartX + index * 120;
            
            g.append('circle')
                .attr('cx', legendX)
                .attr('cy', legendY)
                .attr('r', 8)
                .attr('fill', item.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);
            
            g.append('text')
                .attr('x', legendX + 15)
                .attr('y', legendY)
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#666')
                .text(item.label);
        });
        
        svg.append('text')
            .attr('x', totalWidth - 10)
            .attr('y', totalHeight + 40)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', '#999')
            .text(``);
        
    // === 新增：行选择功能 ===
    const selectedRows = new Set();
    
    for (let rowIndex = 0; rowIndex < displayCount; rowIndex++) {
        const clickRect = g.append('rect')
            .attr('x', 0)
            .attr('y', (rowIndex + 1) * cellHeight)
            .attr('width', totalWidth)
            .attr('height', cellHeight)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer');
    
        clickRect.on('click', function() {
            const clickedRowIndex = rowIndex;
        
            if (selectedRows.has(clickedRowIndex)) {
                selectedRows.delete(clickedRowIndex);
                clickRect.classed('selected-row-bg', false);
            } else {
                selectedRows.add(clickedRowIndex);
                clickRect.classed('selected-row-bg', true);
            }
        });
    }
    
    return { 
        svg, 
        g, 
        config, 
        selectedRows: selectedRows
    };
}  

    /**
     * 检查是否是分区线
     */
    isDivisionLine(number, lotteryType, areaType) {
        if (lotteryType === 'ssq' && areaType === 'red') {
            return number === 11 || number === 22 || number === 33;
        } else if (lotteryType === 'ssq' && areaType === 'blue') {
            return number === 16;
        } else if (lotteryType === 'dlt' && areaType === 'front') {
            return number === 12 || number === 24 || number === 35; 
        } else if (lotteryType === 'dlt' && areaType === 'back') {
            return number === 12;
        }
        return false;
    }
    
    /**
     * 根据容器宽度计算自适应尺寸
     */
    calculateAdaptiveSizes(containerWidth, config) {
        const numberColsCount = config.numberCount;
        const paramColsCount = config.paramNames ? config.paramNames.length : 0;
        
        const minNumberCellWidth = 20;
        const minParamCellWidth = 30;
        const minIssueColWidth = 40;
        const baseCellHeight = 30;
        
        const minTotalWidth = minIssueColWidth + 
                             (numberColsCount * minNumberCellWidth) + 
                             (paramColsCount * minParamCellWidth);
        
        console.log(`基础尺寸计算: 容器宽=${containerWidth}, 最小总宽=${minTotalWidth}`);
        
        if (containerWidth >= minTotalWidth) {
            const scaleFactor = Math.min(containerWidth / minTotalWidth, 1.3);
            
            const result = {
                issueColWidth: Math.floor(minIssueColWidth * scaleFactor),
                numberCellWidth: Math.floor(minNumberCellWidth * scaleFactor),
                paramColWidth: Math.floor(minParamCellWidth * scaleFactor),
                cellHeight: Math.floor(30 * scaleFactor),
                fontSize: Math.floor(8 * scaleFactor)
            };
            
            console.log(`使用缩放尺寸: 缩放因子=${scaleFactor}`);
            return result;
        } else {
            const result = {
                issueColWidth: minIssueColWidth,
                numberCellWidth: minNumberCellWidth,
                paramColWidth: minParamCellWidth,
                cellHeight: 30,
                fontSize: 8
            };
            
            console.log('使用最小尺寸');
            return result;
        }
    }
    
    /**
     * 获取基本走势图配置（包括双色球红球、蓝球和大乐透前区、后区）
     */
    getBasicTrendConfig(lotteryType, areaType) {
        const configs = {
            'ssq_red': {
                title: '',
                numberCount: 33,
                paramNames: ['龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', 
                            '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', 
                            '重号', '邻号'],
                formatNumber: n => n < 10 ? '0' + n : n.toString(),
                maxRows: 0
            },
            'ssq_blue': {
                title: '',
                numberCount: 16,
                paramNames: ['振幅', '大小', '奇偶', '质合', '012路', '区间', '冷温热', 
                            '重号', '邻号' ],
                formatNumber: n => n < 10 ? '0' + n : n.toString(),
                maxRows: 0
            },
            'dlt_front': {
                title: '',
                numberCount: 35,
                paramNames: ['龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比',
                            '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比',
                            '重号', '邻号'],
                formatNumber: n => n < 10 ? '0' + n : n.toString(),
                maxRows: 0
            },
            'dlt_back': {
                title: '',
                numberCount: 12,
                paramNames: ['龙头', '凤尾', '和值', '跨度', '大小比', '质合比',
                            '012路比', '区间比', '奇偶比', '冷温热比', '重号', '邻号'],
                formatNumber: n => n < 10 ? '0' + n : n.toString(),
                maxRows: 0
            }
        };
        
        const key = `${lotteryType}_${areaType}`;
        return configs[key] || configs['dlt_back'];
    }
    
    /**
     * 设置数据源
     */
    setDataSource(allData, currentData = null, stats = null) {
        this.allDrawData = allData;
        this.currentDrawData = currentData || allData;
        this.isFiltered = currentData !== null;
        this.currentStats = stats;
    }
}

// 导出全局实例
window.LotteryCharts = new LotteryCharts();

// ============================================================================
// 全局辅助函数
// ============================================================================

function renderBasicTrendChart(data) {
    if (!data || data.length === 0) {
        console.error('renderBasicTrendChart: 没有数据可渲染');
        return;
    }
    
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error('renderBasicTrendChart: 找不到图表容器元素 #chart-container');
        return;
    }
    
    const firstItem = data[0];
    let lotteryType, areaType;
    
    if (firstItem.red_balls) {
        lotteryType = 'ssq';
        areaType = 'red';
    } else if (firstItem.blue !== undefined) {
        lotteryType = 'ssq';
        areaType = 'blue';
    } else if (firstItem.front_balls) {
        lotteryType = 'dlt';
        areaType = 'front';
    } else if (firstItem.back_balls) {
        lotteryType = 'dlt';
        areaType = 'back';
    } else {
        console.error('renderBasicTrendChart: 未知的数据格式:', firstItem);
        return;
    }
    
    console.log(`renderBasicTrendChart: 彩票类型 ${lotteryType}_${areaType}, ${data.length} 条数据`);
    console.log('使用分离的遗漏值计算模式：');
    console.log('1. 显示遗漏值：从1开始累加');
    console.log('2. 冷温热状态：基于实际遗漏值（首期未开出=18）');

    const chartData = formatDataForChart(data, lotteryType, areaType);
    
    if (!chartData) {
        console.error('renderBasicTrendChart: 数据转换失败');
        return;
    }
    
    try {
        if (window.LotteryCharts && window.LotteryCharts.createBasicTrendChart) {
            window.LotteryCharts.createBasicTrendChart(container, chartData, lotteryType, areaType);
            console.log('renderBasicTrendChart: 图表渲染完成，包含额外列功能');
        } else {
            console.error('renderBasicTrendChart: LotteryCharts 未定义或缺少 createBasicTrendChart 方法');
        }
    } catch (error) {
        console.error('renderBasicTrendChart: 渲染图表时出错:', error);
    }
}

function renderColdWarmHotChart(data) {
    if (!data || data.length === 0) {
        console.error('renderColdWarmHotChart: 没有数据可渲染');
        return;
    }
    
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error('renderColdWarmHotChart: 找不到图表容器元素 #chart-container');
        return;
    }
    
    const firstItem = data[0];
    let lotteryType, areaType;
    
    if (firstItem.red_balls) {
        lotteryType = 'ssq';
        areaType = 'red';
    } else if (firstItem.blue !== undefined) {
        lotteryType = 'ssq';
        areaType = 'blue';
    } else if (firstItem.front_balls) {
        lotteryType = 'dlt';
        areaType = 'front';
    } else if (firstItem.back_balls) {
        lotteryType = 'dlt';
        areaType = 'back';
    } else {
        console.error('renderColdWarmHotChart: 未知的数据格式:', firstItem);
        return;
    }
    
    console.log(`renderColdWarmHotChart: 彩票类型 ${lotteryType}_${areaType}, ${data.length} 条数据`);
    console.log('渲染冷温热状态图，基于实际遗漏值计算');
    
    const chartData = formatDataForChart(data, lotteryType, areaType);
    
    if (!chartData) {
        console.error('renderColdWarmHotChart: 数据转换失败');
        return;
    }
    
    try {
        if (window.LotteryCharts && window.LotteryCharts.createColdWarmHotChart) {
            window.LotteryCharts.createColdWarmHotChart(container, chartData, lotteryType, areaType);
            console.log('renderColdWarmHotChart: 冷温热图表渲染完成');
        } else {
            console.error('renderColdWarmHotChart: LotteryCharts 未定义或缺少 createColdWarmHotChart 方法');
        }
    } catch (error) {
        console.error('renderColdWarmHotChart: 渲染图表时出错:', error);
    }
}

/**
 * 新增：渲染参数走势图
 * @param {Array} data - 彩票数据数组
 * @param {string} paramName - 参数名称，如 'AC值'
 */
function renderParamTrendChart(data, paramName) {
    if (!data || data.length === 0) {
        console.error('renderParamTrendChart: 没有数据可渲染');
        return;
    }
    
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error('renderParamTrendChart: 找不到图表容器元素 #chart-container');
        return;
    }
    
    const firstItem = data[0];
    let lotteryType, areaType;
    
    // 根据数据结构判断彩票类型和区域
    if (firstItem.red_balls) {
        lotteryType = 'ssq';
        areaType = 'red';
    } else if (firstItem.blue !== undefined) {
        lotteryType = 'ssq';
        areaType = 'blue';
    } else if (firstItem.front_balls) {
        lotteryType = 'dlt';
        areaType = 'front';
    } else if (firstItem.back_balls) {
        lotteryType = 'dlt';
        areaType = 'back';
    } else {
        console.error('renderParamTrendChart: 未知的数据格式:', firstItem);
        return;
    }
    
    console.log(`renderParamTrendChart: 彩票类型 ${lotteryType}_${areaType}, 参数 ${paramName}, ${data.length} 条数据`);
    console.log('渲染参数走势图，支持红球15个参数、蓝球9个参数、前区15个参数、后区12个参数');
    
    const chartData = formatDataForChart(data, lotteryType, areaType);
    
    if (!chartData) {
        console.error('renderParamTrendChart: 数据转换失败');
        return;
    }
    
    try {
        if (window.LotteryCharts && window.LotteryCharts.createParamTrendChart) {
            window.LotteryCharts.createParamTrendChart(container, chartData, lotteryType, areaType, paramName);
            console.log(`renderParamTrendChart: ${paramName} 参数走势图渲染完成`);
        } else {
            console.error('renderParamTrendChart: LotteryCharts 未定义或缺少 createParamTrendChart 方法');
        }
    } catch (error) {
        console.error('renderParamTrendChart: 渲染图表时出错:', error);
    }
}

function formatDataForChart(data, lotteryType, areaType) {
    console.log('formatDataForChart: 开始转换数据，冷温热比将在渲染时直接统计');
    
    const issues = [];
    const winningNumbers = [];
    const parameters = [];
    
    data.forEach((item, index) => {
        if (!item || !item.issue) {
            return;
        }
        
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
            params['冷温热比'] = ''; // 先留空，渲染时填充
            params['重号'] = item.repeat_count || '';
            params['邻号'] = item.adjacent_count || '';
            
            // 存储蓝球数据
            const blueBall = item.blue || null;
            params['_extra_data'] = {
                type: 'blue_ball',
                value: blueBall
            };
        } else if (lotteryType === 'ssq' && areaType === 'blue') {
            if (item.blue !== undefined) {
                params['振幅'] = 0;
                params['大小'] = item.blue > 8 ? '大' : '小';
                params['奇偶'] = item.blue % 2 === 0 ? '偶' : '奇';
                params['质合'] = [1, 2, 3, 5, 7, 11, 13].includes(item.blue) ? '质' : '合';
                params['012路'] = item.blue % 3;
                params['区间'] = item.blue <= 4 ? '一区' : 
                                      item.blue <= 8 ? '二区' : 
                                      item.blue <= 12 ? '三区' : '四区';
                params['冷温热'] = ''; // 先留空
                params['重号'] = 0;
                params['邻号'] = 0;
            }
        } else if (lotteryType === 'dlt' && areaType === 'front') {
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
            params['冷温热比'] = ''; // 先留空，渲染时填充
            params['重号'] = item.repeat_count || '';
            params['邻号'] = item.adjacent_count || '';
            
            // 存储后区数据
            const backBalls = item.back_balls || [];
            params['_extra_data'] = {
                type: 'back_balls',
                value: backBalls
            };
        } else if (lotteryType === 'dlt' && areaType === 'back') {
            params['龙头'] = item.dragon_head || '';
            params['凤尾'] = item.phoenix_tail || '';
            params['和值'] = item.sum_value || '';
            params['跨度'] = item.span || '';
            params['大小比'] = item.size_ratio || '';
            params['质合比'] = item.prime_ratio || '';
            params['012路比'] = item.road012_ratio || '';
            params['区间比'] = item.zone_ratio || '';
            params['奇偶比'] = item.odd_even_ratio || '';
            params['冷温热比'] = ''; // 先留空，渲染时填充
            params['重号'] = item.repeat_count || '';
            params['邻号'] = item.adjacent_count || '';
        }
        
        parameters.push(params);
    });
    
    console.log('formatDataForChart: 转换完成，冷温热比将在渲染时直接统计');
    
    return {
        issues,
        winningNumbers,
        parameters
    };
}

/**
 * 新增：获取所有可用的参数名称列表
 * 用于前端界面生成参数选择下拉菜单
 */
function getAvailableParamNames(lotteryType, areaType) {
    const paramSets = {
        'ssq_red': ['龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', 
                    '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', 
                    '重号', '邻号'],
        'ssq_blue': ['振幅', '大小', '奇偶', '质合', '012路', '区间', '冷温热', 
                    '重号', '邻号'],
        'dlt_front': ['龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比',
                     '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比',
                     '重号', '邻号'],
        'dlt_back': ['龙头', '凤尾', '和值', '跨度', '大小比', '质合比',
                    '012路比', '区间比', '奇偶比', '冷温热比', '重号', '邻号']
    };
    
    const key = `${lotteryType}_${areaType}`;
    return paramSets[key] || [];
}

/**
 * 新增：根据数据类型自动渲染对应图表
 * @param {Array} data - 彩票数据
 * @param {string} chartType - 图表类型：'basic'基本走势图, 'coldwarmhot'冷温热图, 'param'参数走势图
 * @param {string} paramName - 参数名称（仅当chartType='param'时使用）
 */
function renderChart(data, chartType = 'basic', paramName = null) {
    if (!data || data.length === 0) {
        console.error('renderChart: 没有数据可渲染');
        return;
    }
    
    console.log(`renderChart: 渲染类型=${chartType}, 参数名称=${paramName}`);
    
    switch (chartType) {
        case 'basic':
            renderBasicTrendChart(data);
            break;
        case 'coldwarmhot':
            renderColdWarmHotChart(data);
            break;
        case 'param':
            if (!paramName) {
                console.error('renderChart: 参数走势图需要指定参数名称');
                return;
            }
            renderParamTrendChart(data, paramName);
            break;
        default:
            console.error('renderChart: 未知的图表类型:', chartType);
            renderBasicTrendChart(data);
    }
}

// DOM加载完成后注册全局函数
document.addEventListener('DOMContentLoaded', function() {
    console.log('charts.js 已加载，使用分离的遗漏值计算和冷温热状态判断逻辑');
    console.log('核心修改:');
    console.log('1. 显示遗漏值独立计算: 从1开始累加');
    console.log('2. 冷温热状态独立判断: 基于实际遗漏值（首期未开出=18）');
    console.log('3. 独立冷温热比计算器: 支持SSQ红球、DLT前区、DLT后区');
    console.log('4. 智能自适应列宽: 根据参数值内容自动调整列宽');
    console.log('5. 统一边框线: 所有内外边框线和分割线统一为极细黑色实线');
    console.log('6. 额外列功能: 支持SSQ红球走势图增加蓝球列，DLT前区走势图增加后区列');
    console.log('7. 通用布局: 支持多种彩票类型的额外列配置');
    console.log('8. 调试增强: 添加数据调试功能，便于排查蓝球数据显示问题');
    console.log('9. 新增参数走势图功能: 支持红球15个参数、蓝球9个参数、前区15个参数、后区12个参数的走势图');
    
    // 注册全局函数
    window.renderBasicTrendChart = renderBasicTrendChart;
    window.renderColdWarmHotChart = renderColdWarmHotChart;
    window.renderParamTrendChart = renderParamTrendChart;
    window.renderChart = renderChart;
    window.getAvailableParamNames = getAvailableParamNames;
    
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .basic-trend-chart,
        .cold-warm-hot-chart,
        .param-trend-chart {
            font-family: Arial, sans-serif;
        }
        
        .lottery-ball {
            transition: all 0.2s ease;
        }
        
        .extra-ball {
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        }
        
        .division-line {
            pointer-events: none;
        }
        
        .chart-container {
            overflow-x: auto;
            width: 100%;
        }
        
        /* 参数走势图样式 */
        .param-trend-dot {
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .param-trend-dot:hover {
            r: 8;
            fill: #1565C0;
            stroke-width: 2;
        }
        
        .param-trend-line {
            transition: stroke-opacity 0.3s ease;
        }
        
        .param-trend-line:hover {
            stroke-opacity: 1;
            stroke-width: 2;
        }
        
        @keyframes pulse-hot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @keyframes pulse-warm {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @keyframes pulse-cold {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        /* 额外列分隔线样式 */
        .extra-column-divider {
            stroke-dasharray: 5,3;
            stroke-width: 1.5;
        }

        /* 行选择样式 */
        .selected-row-bg {
            fill: rgba(220, 242, 255, 0.3) !important;
        }
        
        /* 参数走势图网格线 */
        .param-trend-grid {
            stroke: #e0e0e0;
            stroke-width: 0.5;
        }
        
        /* 高亮效果 */
        .param-highlight {
            animation: param-highlight 2s ease-in-out infinite;
        }
        
        @keyframes param-highlight {
            0%, 100% { 
                fill: #1E90FF;
                stroke: #fff;
            }
            50% { 
                fill: #FF5722;
                stroke: #FF5722;
            }
        }
    `;
    document.head.appendChild(style);
});