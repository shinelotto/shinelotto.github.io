from flask import Blueprint, render_template, jsonify, request, current_app
from utils.cache import cached
import os
import pandas as pd
import numpy as np
from datetime import datetime

# ==================== SSQ 页面蓝图 ====================
ssq_page_bp = Blueprint('ssq_page', __name__, 
                       url_prefix='/ssq',
                       template_folder='../templates/ssq',
                       static_folder='../static')

# ==================== SSQ API 蓝图 ====================
ssq_api_bp = Blueprint('ssq_api', __name__,
                      url_prefix='/api/v1/ssq')

# 创建数据模型实例
ssq_data = None

def load_ssq_data(csv_path):
    """加载双色球数据"""
    df = pd.read_csv(csv_path)
    
    # 检查列名
    if len(df.columns) >= 8:
        df.columns = ['issue', 'red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']
    else:
        # 尝试自动检测列名
        print("警告: CSV列数不足，尝试自动处理...")
    
    # 转换为整数
    for col in ['red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
    
    # 按期号排序（从旧到新）
    df = df.sort_values('issue', ascending=True).reset_index(drop=True)
    
    return df

# ==================== 新增的精确计算函数 ====================

def calculate_consecutive_groups(red_balls):
    """计算连号组合 - 与前端JS逻辑保持一致"""
    if not red_balls or len(red_balls) < 2:
        return "无连号"
    
    sorted_balls = sorted(red_balls)
    consecutive_groups = []
    current_group = [sorted_balls[0]]
    
    for i in range(1, len(sorted_balls)):
        if sorted_balls[i] == sorted_balls[i-1] + 1:
            current_group.append(sorted_balls[i])
        else:
            if len(current_group) >= 2:
                consecutive_groups.append(current_group)
            current_group = [sorted_balls[i]]
    
    # 检查最后一组
    if len(current_group) >= 2:
        consecutive_groups.append(current_group)
    
    # 转换为连号类型描述
    consecutive_types = []
    for group in consecutive_groups:
        if len(group) == 2:
            consecutive_types.append('2连')
        elif len(group) == 3:
            consecutive_types.append('3连')
        elif len(group) == 4:
            consecutive_types.append('4连')
        elif len(group) == 5:
            consecutive_types.append('5连')
        elif len(group) == 6:
            consecutive_types.append('6连')
    
    consecutive_types.sort()
    return '+'.join(consecutive_types) if consecutive_types else '无连号'

def calculate_same_tail_groups(red_balls):
    """计算同尾组合 - 与前端JS逻辑保持一致"""
    if not red_balls or len(red_balls) < 2:
        return "无同尾"
    
    # 计算尾数
    tails = [ball % 10 for ball in red_balls]
    
    # 按尾数分组
    tail_groups = {}
    for i, tail in enumerate(tails):
        if tail not in tail_groups:
            tail_groups[tail] = []
        tail_groups[tail].append(red_balls[i])
    
    # 筛选有重复尾数的组
    same_tail_groups = [group for group in tail_groups.values() if len(group) >= 2]
    
    # 转换为同尾类型描述
    same_tail_types = []
    for group in same_tail_groups:
        if len(group) == 2:
            same_tail_types.append('2同尾')
        elif len(group) == 3:
            same_tail_types.append('3同尾')
        elif len(group) == 4:
            same_tail_types.append('4同尾')
    
    same_tail_types.sort()
    return '+'.join(same_tail_types) if same_tail_types else '无同尾'

# ============================================================================
# 统一遗漏值计算函数 - 使用从当前期往前查找的逻辑
# ============================================================================

def calculate_all_missed_periods(ball_type='red'):
    """
    计算所有号码在所有期的遗漏期数
    使用从当前期往前查找的逻辑
    从未出现过的设为18
    
    Args:
        ball_type: 'red' 或 'blue'
    
    Returns:
        遗漏期数字典：{号码: {期索引: 遗漏值}}
    """
    if ssq_data is None or len(ssq_data) == 0:
        return {}
    
    missed_periods = {}
    data_count = len(ssq_data)
    
    # 初始化所有号码
    if ball_type == 'red':
        total_numbers = 33
    else:  # blue
        total_numbers = 16
    
    for num in range(1, total_numbers + 1):
        missed_periods[num] = {}
    
    # 对于每一期，计算每个号码的遗漏值
    for current_index in range(data_count):
        row = ssq_data.iloc[current_index]
        
        if ball_type == 'red':
            # 获取当前期红球
            current_balls = [
                int(row['red1']), int(row['red2']), int(row['red3']),
                int(row['red4']), int(row['red5']), int(row['red6'])
            ]
        else:  # blue
            # 获取当前期蓝球
            current_balls = [int(row['blue'])]
        
        # 计算每个号码的遗漏值
        for num in range(1, total_numbers + 1):
            found = False
            
            # 从当前期往前查找
            for search_index in range(current_index, -1, -1):
                search_row = ssq_data.iloc[search_index]
                
                if ball_type == 'red':
                    # 检查红球
                    search_balls = [
                        int(search_row['red1']), int(search_row['red2']), int(search_row['red3']),
                        int(search_row['red4']), int(search_row['red5']), int(search_row['red6'])
                    ]
                else:  # blue
                    # 检查蓝球
                    search_balls = [int(search_row['blue'])]
                
                if num in search_balls:
                    # 找到最近一次出现
                    missed_periods[num][current_index] = current_index - search_index
                    found = True
                    break
            
            if not found:
                # 从未出现过，设为18
                missed_periods[num][current_index] = 18
    
    return missed_periods

def calculate_missed_periods(ball_number, ball_type='red', current_index=0):
    """
    计算号码的遗漏期数 - 使用从当前期往前查找的逻辑
    
    Args:
        ball_number: 号码 (1-33 或 1-16)
        ball_type: 'red' 或 'blue'
        current_index: 当前期数索引（0表示第一期）
    
    Returns:
        遗漏期数，如果从未出现过返回18
    """
    if ssq_data is None or len(ssq_data) == 0:
        return 18
    
    if current_index >= len(ssq_data):
        return 18
    
    # 从当前期往前查找
    for search_index in range(current_index, -1, -1):
        row = ssq_data.iloc[search_index]
        
        if ball_type == 'red':
            # 检查红球
            red_balls = [
                int(row['red1']), int(row['red2']), int(row['red3']),
                int(row['red4']), int(row['red5']), int(row['red6'])
            ]
            if ball_number in red_balls:
                # 找到最近一次出现
                return current_index - search_index
        elif ball_type == 'blue':
            # 检查蓝球
            if int(row['blue']) == ball_number:
                # 找到最近一次出现
                return current_index - search_index
    
    # 从未出现过
    return 18

def get_ball_status_by_missed(missed_periods):
    """
    根据遗漏期数判断号码状态
    使用统一的冷温热判断标准：
    热号：遗漏0-3期
    温号：遗漏4-16期
    冷号：遗漏≥17期
    
    Args:
        missed_periods: 遗漏期数
    
    Returns:
        'hot', 'warm', 'cold'
    """
    if missed_periods < 4:
        return 'hot'
    elif missed_periods <= 16:
        return 'warm'
    else:  # missed_periods >= 17
        return 'cold'

def get_cold_warm_hot_status_zh(missed_periods):
    """
    根据遗漏期数判断号码状态（中文）
    
    Args:
        missed_periods: 遗漏期数
    
    Returns:
        '热号', '温号', '冷号'
    """
    if missed_periods < 4:
        return '热号'
    elif missed_periods <= 16:
        return '温号'
    else:  # missed_periods >= 17
        return '冷号'

def calculate_cold_warm_hot_ratio(red_balls, current_index):
    """
    计算冷温热比例 - 使用统一的遗漏值计算逻辑
    
    Args:
        red_balls: 当前期红球列表
        current_index: 当前期索引
    
    Returns:
        冷温热比例字符串 "cold_count:warm_count:hot_count"
    """
    if not red_balls:
        return "0:0:0"
    
    cold_count = 0
    warm_count = 0
    hot_count = 0
    
    for ball_num in red_balls:
        missed = calculate_missed_periods(ball_num, 'red', current_index)
        
        if missed < 4:
            hot_count += 1
        elif missed <= 16:
            warm_count += 1
        else:
            cold_count += 1
    
    return f"{cold_count}:{warm_count}:{hot_count}"

def calculate_blue_cold_warm_hot_status(blue_ball, current_index):
    """
    计算蓝球冷温热状态 - 使用统一的遗漏值计算逻辑
    
    Args:
        blue_ball: 蓝球号码
        current_index: 当前期索引
    
    Returns:
        冷温热比例字符串: '冷' / '温' / '热'
    """
    if blue_ball is None:
        return '冷'
    
    missed = calculate_missed_periods(blue_ball, 'blue', current_index)
    
    if missed < 4:
        return '热'  # 遗漏0-3期：热号
    elif missed <= 16:
        return '温'  # 遗漏4-16期：温号
    else:
        return '冷'  # 遗漏≥17期：冷号

def get_cold_warm_hot(numbers, ball_type='red', current_index=0):
    """
    获取冷温热状态字符串 - 使用统一的遗漏值计算逻辑
    
    Args:
        numbers: 号码列表
        ball_type: 'red' 或 'blue'
        current_index: 当前期数索引
    
    Returns:
        "hot_count:warm_count:cold_count"
    """
    if not numbers or ssq_data is None or len(ssq_data) == 0:
        return "0:0:0"
    
    hot_count = 0
    warm_count = 0
    cold_count = 0
    
    for num in numbers:
        missed = calculate_missed_periods(num, ball_type, current_index)
        status = get_ball_status_by_missed(missed)
        
        if status == 'hot':
            hot_count += 1
        elif status == 'warm':
            warm_count += 1
        else:  # 'cold'
            cold_count += 1
    
    return f"{hot_count}:{warm_count}:{cold_count}"

def calculate_repeat_and_adjacent_numbers_v2(current_red_balls, all_previous_data, current_index):
    """计算重号和邻号数量 - 与前端JS逻辑保持一致"""
    if current_index == 0 or not all_previous_data:
        return 0, 0  # 第一期没有重号和邻号
    
    prev_red_balls = all_previous_data[current_index - 1]['red_balls']
    
    # 重号：当前期号码在上期也出现过
    repeat_numbers = set(current_red_balls) & set(prev_red_balls)
    repeat_count = len(repeat_numbers)
    
    # 邻号：当前期号码与上期号码相差±1
    adjacent_count = 0
    for curr_ball in current_red_balls:
        for prev_ball in prev_red_balls:
            if abs(curr_ball - prev_ball) == 1:
                adjacent_count += 1
                break  # 每个号码只算一次（避免重复计数）
    
    return repeat_count, adjacent_count

# ==================== 按照指定顺序的数据获取函数 ====================

def get_red_basic_trend_data():
    """获取红球基本走势数据 - 严格按照指定顺序：'龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', '重号', '邻号'"""
    if ssq_data is None or len(ssq_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    
    # 先收集所有数据以便计算重号和邻号
    all_draw_data = []
    for i, row in ssq_data.iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        all_draw_data.append({'issue': str(row['issue']), 'red_balls': red_balls})
    
    # 逐条处理数据
    for i, row in ssq_data.iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        
        # 计算重号和邻号
        repeat_count, adjacent_count = calculate_repeat_and_adjacent_numbers_v2(
            red_balls, all_draw_data, i
        )
        
        # 按照指定顺序计算各项参数
        # 1. 龙头
        dragon_head = min(red_balls) if red_balls else 0
        
        # 2. 凤尾
        phoenix_tail = max(red_balls) if red_balls else 0
        
        # 3. 和值
        sum_value = sum(red_balls)
        
        # 4. 跨度
        span_value = phoenix_tail - dragon_head
        
        # 5. AC值
        ac_value = calculate_ac_value(red_balls)
        
        # 6. 大小比
        size_ratio = calculate_size_ratio(red_balls)
        
        # 7. 质合比
        prime_ratio = calculate_prime_ratio(red_balls)
        
        # 8. 012路比
        road012_ratio = calculate_road012_ratio(red_balls)
        
        # 9. 区间比
        zone_ratio = calculate_zone_ratio(red_balls)
        
        # 10. 奇偶比
        odd_even_ratio = calculate_odd_even_ratio(red_balls)
        
        # 11. 连号
        consecutive_groups = calculate_consecutive_groups(red_balls)
        
        # 12. 同尾
        same_tail_groups = calculate_same_tail_groups(red_balls)
        
        # 13. 冷温热比 - 使用统一的遗漏值计算逻辑
        cold_warm_hot_ratio = calculate_cold_warm_hot_ratio(red_balls, i)
        
        # 14. 重号
        # repeat_count 已在前面计算
        
        # 15. 邻号
        # adjacent_count 已在前面计算
        
        # 构建符合前端期望的数据格式（保持原有字段名，但按指定顺序组织逻辑）
        data.append({
            'issue': str(row['issue']),
            'red_balls': red_balls,
            'blue': int(row['blue']),
            # 按照指定顺序排列的统计参数
            'dragon_head': dragon_head,           # 1. 龙头
            'phoenix_tail': phoenix_tail,         # 2. 凤尾
            'sum_value': sum_value,               # 3. 和值
            'span': span_value,                   # 4. 跨度
            'ac_value': ac_value,                 # 5. AC值
            'size_ratio': size_ratio,             # 6. 大小比
            'prime_ratio': prime_ratio,           # 7. 质合比
            'road012_ratio': road012_ratio,       # 8. 012路比
            'zone_ratio': zone_ratio,             # 9. 区间比
            'odd_even_ratio': odd_even_ratio,     # 10. 奇偶比
            'consecutive_desc': consecutive_groups, # 11. 连号
            'same_tail_desc': same_tail_groups,   # 12. 同尾
            'cold_warm_hot_ratio': cold_warm_hot_ratio, # 13. 冷温热比
            'repeat_count': repeat_count,         # 14. 重号
            'adjacent_count': adjacent_count      # 15. 邻号
        })
    
    return {'data': data, 'total': len(data)}

def get_blue_basic_trend_data():
    """获取蓝球基本走势数据 - 严格按照指定顺序：'振幅', '大小', '质合', '012路', '区间', '奇偶', '冷温热', '重号', '邻号'"""
    if ssq_data is None or len(ssq_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    
    # 逐条处理数据
    for i, row in ssq_data.iterrows():
        blue_ball = int(row['blue'])
        
        # 计算振幅
        amplitude = 0
        if len(data) > 0:
            prev_blue = data[-1]['blue']
            amplitude = abs(blue_ball - prev_blue)
        
        # 大小
        size = "大" if blue_ball > 8 else "小"
        
        # 质合
        prime_numbers = {1, 2, 3, 5, 7, 11, 13}
        prime = "质" if blue_ball in prime_numbers else "合"
        
        # 012路
        road012 = blue_ball % 3
        
        # 区间 (1-4:一区, 5-8:二区, 9-12:三区, 13-16:四区)
        if 1 <= blue_ball <= 4:
            zone = "一区"
        elif 5 <= blue_ball <= 8:
            zone = "二区"
        elif 9 <= blue_ball <= 12:
            zone = "三区"
        else:
            zone = "四区"
        
        # 奇偶
        odd_even = "奇" if blue_ball % 2 == 1 else "偶"
        
        # 冷温热状态（蓝球）- 使用统一的遗漏值计算逻辑
        cold_warm_hot_status = calculate_blue_cold_warm_hot_status(blue_ball, i)
        
        # 计算蓝球重号（与上期相同）
        repeat = 0
        if len(data) > 0 and data[-1]['blue'] == blue_ball:
            repeat = 1
        
        # 计算蓝球邻号（与上期相差±1）
        adjacent = 0
        if len(data) > 0:
            prev_blue = data[-1]['blue']
            if abs(blue_ball - prev_blue) == 1:
                adjacent = 1
        
        # 构建符合前端期望的数据格式（按照指定顺序）
        data.append({
            'issue': str(row['issue']),
            'blue': blue_ball,
            'amplitude': amplitude,                     # 1. 振幅
            'size': size,                                        # 2. 大小
            'prime': prime,                                 # 3. 质合
            'road012': road012,                          # 4. 012路
            'zone': zone,                                    # 5. 区间
            'odd_even': odd_even,                     # 6. 奇偶
            'cold_warm_hot': cold_warm_hot_status,    # 7. 冷温热
            'repeat': repeat,                              # 8. 重号
            'adjacent': adjacent                        # 9. 邻号
        })
    
    return {'data': data, 'total': len(data)}

def get_basic_trend_data():
    """获取基本走势数据（包含统计信息）"""
    if ssq_data is None or len(ssq_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    for i, row in ssq_data.iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        
        # 计算统计指标
        stats = calculate_statistics_for_api(red_balls)
        
        data.append({
            'issue': str(row['issue']),
            'red_balls': red_balls,
            'blue_ball': int(row['blue']),
            'sum_value': stats['sum'],
            'span': stats['span'],
            'ac_value': stats['ac_value'],
            'size_ratio': stats['size_ratio'],
            'prime_ratio': stats['prime_ratio'],
            'road012_ratio': stats['road012_ratio'],
            'zone_ratio': stats['zone_ratio'],
            'odd_even_ratio': stats['odd_even_ratio'],
            'dragon_head': min(red_balls) if red_balls else 0,
            'phoenix_tail': max(red_balls) if red_balls else 0
        })
    
    return {'data': data, 'total': len(data)}

def calculate_statistics_for_api(numbers):
    """为API计算统计指标"""
    if not numbers:
        return {
            'sum': 0,
            'span': 0,
            'ac_value': 0,
            'size_ratio': '0:0',
            'prime_ratio': '0:0',
            'road012_ratio': '0:0:0',
            'zone_ratio': '0:0:0',
            'odd_even_ratio': '0:0'
        }
    
    # 和值
    sum_value = sum(numbers)
    
    # 跨度
    span = max(numbers) - min(numbers) if numbers else 0
    
    # AC值
    ac_value = calculate_ac_value(numbers)
    
    # 大小比
    big_count = sum(1 for n in numbers if n > 16)
    small_count = len(numbers) - big_count
    size_ratio = f"{big_count}:{small_count}"
    
    # 质合比 - 将1视为质数
    prime_numbers = {1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31}
    prime_count = sum(1 for n in numbers if n in prime_numbers)
    composite_count = len(numbers) - prime_count
    prime_ratio = f"{prime_count}:{composite_count}"
    
    # 012路比
    road_counts = {0: 0, 1: 0, 2: 0}
    for n in numbers:
        road_counts[n % 3] += 1
    road012_ratio = f"{road_counts[0]}:{road_counts[1]}:{road_counts[2]}"
    
    # 区间比
    zone_counts = [
        sum(1 for n in numbers if 1 <= n <= 11),
        sum(1 for n in numbers if 12 <= n <= 22),
        sum(1 for n in numbers if 23 <= n <= 33)
    ]
    zone_ratio = f"{zone_counts[0]}:{zone_counts[1]}:{zone_counts[2]}"
    
    # 奇偶比
    odd_count = sum(1 for n in numbers if n % 2 == 1)
    even_count = len(numbers) - odd_count
    odd_even_ratio = f"{odd_count}:{even_count}"
    
    return {
        'sum': sum_value,
        'span': span,
        'ac_value': ac_value,
        'size_ratio': size_ratio,
        'prime_ratio': prime_ratio,
        'road012_ratio': road012_ratio,
        'zone_ratio': zone_ratio,
        'odd_even_ratio': odd_even_ratio
    }

def calculate_ac_value(numbers):
    """计算AC值"""
    if len(numbers) < 2:
        return 0
    
    numbers_sorted = sorted(numbers)
    differences = set()
    
    for i in range(len(numbers_sorted)):
        for j in range(i + 1, len(numbers_sorted)):
            differences.add(abs(numbers_sorted[i] - numbers_sorted[j]))
    
    return len(differences) - (len(numbers) - 1)

def get_distribution_chart_data(chart_type):
    """获取分布图数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 根据图表类型返回不同的数据
    if chart_type == "dragonhead":
        return get_dragonhead_data()
    elif chart_type == "phoenixtail":
        return get_phoenixtail_data()
    elif chart_type == "sum":
        return get_sum_data()
    elif chart_type == "span":
        return get_span_data()
    elif chart_type == "ac_value":
        return get_ac_value_data()
    elif chart_type == "size_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "prime_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "road012_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "zone_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "odd_even_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "consecutive":
        return get_general_distribution_data(chart_type)
    elif chart_type == "same_tail":
        return get_general_distribution_data(chart_type)
    elif chart_type == "cold_warm_hot_ratio":
        return get_general_distribution_data(chart_type)
    elif chart_type == "repeat":
        return get_general_distribution_data(chart_type)
    elif chart_type == "adjacent":
        return get_general_distribution_data(chart_type)
    elif chart_type == "amplitude":
        return get_amplitude_data()
    elif chart_type == "size":
        return get_size_data()
    elif chart_type == "prime":
        return get_prime_data()
    elif chart_type == "road012":
        return get_road012_data()
    elif chart_type == "zone":
        return get_zone_data()
    elif chart_type == "odd_even":
        return get_odd_even_data()
    elif chart_type == "cold_warm_hot":
        return get_cold_warm_hot_data()
    else:
        return get_general_distribution_data(chart_type)

# ==================== 红球分布图函数（保持原有顺序） ====================

def get_dragonhead_data():
    """获取龙头数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计龙头出现次数
    dragonhead_counts = {}
    for _, row in ssq_data.head(100).iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        if red_balls:
            dragonhead = min(red_balls)
            dragonhead_counts[dragonhead] = dragonhead_counts.get(dragonhead, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (dragonhead, count) in enumerate(sorted(dragonhead_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": str(dragonhead).zfill(2),
            "value": count,
            "category": dragonhead % 3
        })
    
    return {
        "nodes": nodes,
        "links": create_links_based_on_frequency(dragonhead_counts)
    }

def get_phoenixtail_data():
    """获取凤尾数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计凤尾出现次数
    phoenixtail_counts = {}
    for _, row in ssq_data.head(100).iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        if red_balls:
            phoenixtail = max(red_balls)
            phoenixtail_counts[phoenixtail] = phoenixtail_counts.get(phoenixtail, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (phoenixtail, count) in enumerate(sorted(phoenixtail_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": str(phoenixtail).zfill(2),
            "value": count,
            "category": phoenixtail % 3
        })
    
    return {
        "nodes": nodes,
        "links": create_links_based_on_frequency(phoenixtail_counts)
    }

def get_sum_data():
    """获取和值数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计和值出现次数
    sum_counts = {}
    for _, row in ssq_data.head(100).iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        if red_balls:
            sum_value = sum(red_balls)
            sum_counts[sum_value] = sum_counts.get(sum_value, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (sum_val, count) in enumerate(sorted(sum_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": str(sum_val),
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_span_data():
    """获取跨度数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计跨度出现次数
    span_counts = {}
    for _, row in ssq_data.head(100).iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        if red_balls:
            span = max(red_balls) - min(red_balls)
            span_counts[span] = span_counts.get(span, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (span, count) in enumerate(sorted(span_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": str(span),
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_ac_value_data():
    """获取AC值数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计AC值出现次数
    ac_counts = {}
    for _, row in ssq_data.head(100).iterrows():
        red_balls = [
            int(row['red1']), int(row['red2']), int(row['red3']),
            int(row['red4']), int(row['red5']), int(row['red6'])
        ]
        if red_balls:
            ac_value = calculate_ac_value(red_balls)
            ac_counts[ac_value] = ac_counts.get(ac_value, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (ac_value, count) in enumerate(sorted(ac_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": f"AC{ac_value}",
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

# ==================== 蓝球分布图函数 ====================

def get_amplitude_data():
    """获取蓝球振幅数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计振幅出现次数
    amplitude_counts = {}
    prev_blue = None
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        if prev_blue is not None:
            amplitude = abs(blue_ball - prev_blue)
            amplitude_counts[amplitude] = amplitude_counts.get(amplitude, 0) + 1
        prev_blue = blue_ball
    
    # 转换为节点格式
    nodes = []
    for i, (amplitude, count) in enumerate(sorted(amplitude_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": str(amplitude),
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_size_data():
    """获取蓝球大小数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计大小出现次数
    size_counts = {"大": 0, "小": 0}
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        size = "大" if blue_ball > 8 else "小"
        size_counts[size] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (size, count) in enumerate(size_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": size,
            "value": count,
            "category": i
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_prime_data():
    """获取蓝球质合数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计质合出现次数
    prime_numbers = {1, 2, 3, 5, 7, 11, 13}
    prime_counts = {"质": 0, "合": 0}
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        prime = "质" if blue_ball in prime_numbers else "合"
        prime_counts[prime] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (prime, count) in enumerate(prime_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": prime,
            "value": count,
            "category": i
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_road012_data():
    """获取蓝球012路数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计012路出现次数
    road_counts = {0: 0, 1: 0, 2: 0}
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        road012 = blue_ball % 3
        road_counts[road012] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (road, count) in enumerate(road_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": f"{road}路",
            "value": count,
            "category": road
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_zone_data():
    """获取蓝球区间数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计区间出现次数
    zone_counts = {"一区": 0, "二区": 0, "三区": 0, "四区": 0}
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        if 1 <= blue_ball <= 4:
            zone = "一区"
        elif 5 <= blue_ball <= 8:
            zone = "二区"
        elif 9 <= blue_ball <= 12:
            zone = "三区"
        else:
            zone = "四区"
        zone_counts[zone] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (zone, count) in enumerate(zone_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": zone,
            "value": count,
            "category": i
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_odd_even_data():
    """获取蓝球奇偶数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计奇偶出现次数
    odd_even_counts = {"奇": 0, "偶": 0}
    for _, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])
        odd_even = "奇" if blue_ball % 2 == 1 else "偶"
        odd_even_counts[odd_even] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (odd_even, count) in enumerate(odd_even_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": odd_even,
            "value": count,
            "category": i
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_cold_warm_hot_data():
    """获取蓝球冷温热数据"""
    if ssq_data is None or len(ssq_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计冷温热出现次数
    cold_warm_hot_counts = {"冷": 0, "温": 0, "热": 0}
    
    # 计算蓝球冷温热状态
    for i, row in ssq_data.head(100).iterrows():
        blue_ball = int(row['blue'])

        cold_warm_hot_status = calculate_blue_cold_warm_hot_status(blue_ball, i)

        if cold_warm_hot_status in cold_warm_hot_counts:
            cold_warm_hot_counts[cold_warm_hot_status] += 1
    
    # 转换为节点格式
    nodes = []
    for i, (status, count) in enumerate(cold_warm_hot_counts.items()):
        nodes.append({
            "id": f"node_{i}",
            "name": status,
            "value": count,
            "category": i
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_general_distribution_data(chart_type):
    """获取通用分布数据"""
    return {
        "nodes": [
            {"id": "node_0", "name": "数据1", "value": 100, "category": 0},
            {"id": "node_1", "name": "数据2", "value": 80, "category": 0},
            {"id": "node_2", "name": "数据3", "value": 60, "category": 1},
            {"id": "node_3", "name": "数据4", "value": 40, "category": 1},
            {"id": "node_4", "name": "数据5", "value": 20, "category": 2}
        ],
        "links": [
            {"source": "node_0", "target": "node_1"},
            {"source": "node_0", "target": "node_2"},
            {"source": "node_1", "target": "node_3"},
            {"source": "node_2", "target": "node_4"}
        ]
    }

def create_links_based_on_frequency(counts):
    """基于频率创建连接"""
    if not counts or len(counts) < 2:
        return []
    
    links = []
    items = list(counts.items())
    
    # 创建连接：高频节点连接到相邻的节点
    for i in range(len(items) - 1):
        num1, count1 = items[i]
        num2, count2 = items[i + 1]
        
        # 只连接相邻的号码
        if abs(num1 - num2) <= 5:
            weight = min(count1, count2) / max(max(counts.values()), 1) * 5
            links.append({
                "source": f"node_{i}",
                "target": f"node_{i+1}",
                "value": weight
            })
    
    return links

# ==================== 新增的辅助函数 ====================

def calculate_size_ratio(numbers):
    """计算大小比"""
    if not numbers:
        return "0:0"
    big_count = sum(1 for n in numbers if n > 16)
    small_count = len(numbers) - big_count
    return f"{big_count}:{small_count}"

def calculate_prime_ratio(numbers):
    """计算质合比"""
    if not numbers:
        return "0:0"
    prime_numbers = {1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31}
    prime_count = sum(1 for n in numbers if n in prime_numbers)
    composite_count = len(numbers) - prime_count
    return f"{prime_count}:{composite_count}"

def calculate_road012_ratio(numbers):
    """计算012路比"""
    if not numbers:
        return "0:0:0"
    road_counts = {0: 0, 1: 0, 2: 0}
    for n in numbers:
        road_counts[n % 3] += 1
    return f"{road_counts[0]}:{road_counts[1]}:{road_counts[2]}"

def calculate_zone_ratio(numbers):
    """计算区间比"""
    if not numbers:
        return "0:0:0"
    zone_counts = [
        sum(1 for n in numbers if 1 <= n <= 11),
        sum(1 for n in numbers if 12 <= n <= 22),
        sum(1 for n in numbers if 23 <= n <= 33)
    ]
    return f"{zone_counts[0]}:{zone_counts[1]}:{zone_counts[2]}"

def calculate_odd_even_ratio(numbers):
    """计算奇偶比"""
    if not numbers:
        return "0:0"
    odd_count = sum(1 for n in numbers if n % 2 == 1)
    even_count = len(numbers) - odd_count
    return f"{odd_count}:{even_count}"

# ==================== 模板需要的函数 ====================

def calculate_statistics(numbers):
    """计算统计指标 - 模板用"""
    if not numbers:
        return {
            'sum': 0,
            'range': 0,
            'acValue': 0,
            'sizeRatio': '0:0',
            'primeRatio': '0:0',
            'road012Ratio': '0:0:0',
            'oddEvenRatio': '0:0'
        }
    
    # 排序
    sorted_nums = sorted(numbers)
    
    # 和值
    sum_value = sum(numbers)
    
    # 跨度
    span = max(numbers) - min(numbers) if numbers else 0
    
    # AC值
    ac_value = calculate_ac_value(numbers)
    
    # 大小比（以16为分界线）
    big_count = sum(1 for n in numbers if n > 16)
    small_count = len(numbers) - big_count
    size_ratio = f"{big_count}:{small_count}"
    
    # 质合比 - 将1视为质数
    prime_numbers = {1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31}
    prime_count = sum(1 for n in numbers if n in prime_numbers)
    composite_count = len(numbers) - prime_count
    prime_ratio = f"{prime_count}:{composite_count}"
    
    # 012路比
    road_counts = {0: 0, 1: 0, 2: 0}
    for n in numbers:
        road_counts[n % 3] += 1
    road012_ratio = f"{road_counts[0]}:{road_counts[1]}:{road_counts[2]}"
    
    # 奇偶比
    odd_count = sum(1 for n in numbers if n % 2 == 1)
    even_count = len(numbers) - odd_count
    odd_even_ratio = f"{odd_count}:{even_count}"
    
    return {
        'sum': sum_value,
        'range': span,
        'acValue': ac_value,
        'sizeRatio': size_ratio,
        'primeRatio': prime_ratio,
        'road012Ratio': road012_ratio,
        'oddEvenRatio': odd_even_ratio
    }

def get_zone_ratio(numbers, total_numbers=33, zones=3):
    """获取区间比 - 模板用"""
    if not numbers:
        return ':'.join(['0'] * zones)
    
    zone_size = total_numbers // zones
    zone_counts = [0] * zones
    
    for num in numbers:
        zone_index = (num - 1) // zone_size
        if zone_index >= zones:
            zone_index = zones - 1
        zone_counts[zone_index] += 1
    
    return ':'.join(str(count) for count in zone_counts)

def find_consecutive_numbers(numbers):
    """查找连号 - 模板用"""
    if not numbers or len(numbers) < 2:
        return []
    
    sorted_nums = sorted(numbers)
    consecutive_groups = []
    current_group = []
    
    for i, num in enumerate(sorted_nums):
        if not current_group:
            current_group.append(num)
        elif num == current_group[-1] + 1:
            current_group.append(num)
        else:
            if len(current_group) >= 2:
                consecutive_groups.append(current_group.copy())
            current_group = [num]
    
    if len(current_group) >= 2:
        consecutive_groups.append(current_group)
    
    return consecutive_groups

def find_same_tail_numbers(numbers):
    """查找同尾号 - 模板用"""
    if not numbers or len(numbers) < 2:
        return []
    
    tail_groups = {}
    for num in numbers:
        tail = num % 10
        if tail not in tail_groups:
            tail_groups[tail] = []
        tail_groups[tail].append(num)
    
    # 只返回有多个号码的尾数组
    return [group for group in tail_groups.values() if len(group) > 1]

# ==================== SSQ 页面路由定义 ====================

@ssq_page_bp.route('/')
@cached(timeout=60)
def index():
    """双色球主页"""
    return render_template('ssq/base.html', chart_name="双色球分析")

@ssq_page_bp.route('/trends/red-basic')
@cached(timeout=60)
def red_basic_trend_page():
    """红球基本走势图页面 - 参数顺序：'龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', '重号', '邻号'"""
    print("=== 进入red_basic_trend_page函数 ===")
    
    try:
        data_result = get_red_basic_trend_data()
        print(f"获取到数据条数: {data_result['total']}")
        
        # 详细检查数据
        if data_result['data'] and len(data_result['data']) > 0:
            first_item = data_result['data'][0]
            print(f"第一条数据结构: {list(first_item.keys())}")
            print(f"第一条数据内容预览: {str(first_item)[:200]}...")
        else:
            print("警告: 数据为空!")
        
        result = render_template('ssq/red_basic_trend.html', 
                              chart_name="红球基本走势图",
                              data=data_result['data'],
                              total=data_result['total'],
                              calculate_statistics=calculate_statistics,
                              get_zone_ratio=get_zone_ratio,
                              find_consecutive_numbers=find_consecutive_numbers,
                              find_same_tail_numbers=find_same_tail_numbers,
                              calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                              get_ball_status_by_missed=get_ball_status_by_missed)
        
        print("模板渲染成功") 
        return result
        
    except Exception as e:
        print(f"!!! 模板渲染错误: {e}")
        return f"<h1>错误: {str(e)}</h1>"

# 红球页面路由（按照指定顺序）
@ssq_page_bp.route('/trends/dragonhead')
@cached(timeout=60)
def red_dragonhead_page():
    """红球龙头 - 第1个参数"""
    chart_data = get_distribution_chart_data("dragonhead")
    return render_template('ssq/red_dragonhead.html', 
                          chart_name="红球龙头",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/phoenixtail')
@cached(timeout=60)
def red_phoenixtail_page():
    """红球凤尾 - 第2个参数"""
    chart_data = get_distribution_chart_data("phoenixtail")
    return render_template('ssq/red_phoenixtail.html', 
                          chart_name="红球凤尾",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/sum')
@cached(timeout=60)
def red_sum_page():
    """红球和值 - 第3个参数"""
    chart_data = get_distribution_chart_data("sum")
    return render_template('ssq/red_sum.html', 
                          chart_name="红球和值",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/span')
@cached(timeout=60)
def red_span_page():
    """红球跨度 - 第4个参数"""
    chart_data = get_distribution_chart_data("span")
    return render_template('ssq/red_span.html', 
                          chart_name="红球跨度",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/acvalue')
@cached(timeout=60)
def red_acvalue_page():
    """红球AC值 - 第5个参数"""
    chart_data = get_distribution_chart_data("ac_value")
    return render_template('ssq/red_acvalue.html', 
                          chart_name="红球AC值",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/size-ratio')
@cached(timeout=60)
def red_sizeratio_page():
    """红球大小比 - 第6个参数"""
    chart_data = get_distribution_chart_data("size_ratio")
    return render_template('ssq/red_sizeratio.html', 
                          chart_name="红球大小比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/prime-ratio')
@cached(timeout=60)
def red_primeratio_page():
    """红球质合比 - 第7个参数"""
    chart_data = get_distribution_chart_data("prime_ratio")
    return render_template('ssq/red_primeratio.html', 
                          chart_name="红球质合比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/road012-ratio')
@cached(timeout=60)
def red_road012ratio_page():
    """红球012路比 - 第8个参数"""
    chart_data = get_distribution_chart_data("road012_ratio")
    return render_template('ssq/red_road012ratio.html', 
                          chart_name="红球012路比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/zone-ratio')
@cached(timeout=60)
def red_zoneratio_page():
    """红球区间比 - 第9个参数"""
    chart_data = get_distribution_chart_data("zone_ratio")
    return render_template('ssq/red_zoneratio.html', 
                          chart_name="红球区间比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/odd-even-ratio')
@cached(timeout=60)
def red_oddevenratio_page():
    """红球奇偶比 - 第10个参数"""
    chart_data = get_distribution_chart_data("odd_even_ratio")
    return render_template('ssq/red_oddevenratio.html', 
                          chart_name="红球奇偶比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/consecutive')
@cached(timeout=60)
def red_consecutive_page():
    """红球连号 - 第11个参数"""
    chart_data = get_distribution_chart_data("consecutive")
    return render_template('ssq/red_consecutive.html', 
                          chart_name="红球连号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/same-tail')
@cached(timeout=60)
def red_sametail_page():
    """红球同尾 - 第12个参数"""
    chart_data = get_distribution_chart_data("same_tail")
    return render_template('ssq/red_sametail.html', 
                          chart_name="红球同尾",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/cold-warm-hot-ratio')
@cached(timeout=60)
def red_coldwarmhotratio_page():
    """红球冷温热比 - 第13个参数"""
    chart_data = get_distribution_chart_data("cold_warm_hot_ratio")
    return render_template('ssq/red_coldwarmhotratio.html', 
                          chart_name="红球冷温热比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/repeat')
@cached(timeout=60)
def red_repeat_page():
    """红球重号 - 第14个参数"""
    chart_data = get_distribution_chart_data("repeat")
    return render_template('ssq/red_repeat.html', 
                          chart_name="红球重号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/adjacent')
@cached(timeout=60)
def red_adjacent_page():
    """红球邻号 - 第15个参数"""
    chart_data = get_distribution_chart_data("adjacent")
    return render_template('ssq/red_adjacent.html', 
                          chart_name="红球邻号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='red': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

# 蓝球页面路由（按照指定顺序）
@ssq_page_bp.route('/trends/blue-basic')
@cached(timeout=60)
def blue_basic_page():
    """蓝球基本走势图 - 参数顺序：'振幅', '大小', '质合', '012路', '区间', '奇偶', '冷温热', '重号', '邻号'"""
    data = get_blue_basic_trend_data()
    return render_template('ssq/blue_basic.html', 
                          chart_name="蓝球基本走势图",
                          data=data['data'],
                          total=data['total'],
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-amplitude')
@cached(timeout=60)
def blue_amplitude_page():
    """蓝球振幅 - 第1个参数"""
    chart_data = get_distribution_chart_data("amplitude")
    return render_template('ssq/blue_amplitude.html', 
                          chart_name="蓝球振幅",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-size')
@cached(timeout=60)
def blue_size_page():
    """蓝球大小 - 第2个参数"""
    chart_data = get_distribution_chart_data("size")
    return render_template('ssq/blue_size.html', 
                          chart_name="蓝球大小",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-prime')
@cached(timeout=60)
def blue_prime_page():
    """蓝球质合 - 第3个参数"""
    chart_data = get_distribution_chart_data("prime")
    return render_template('ssq/blue_prime.html', 
                          chart_name="蓝球质合",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-road012')
@cached(timeout=60)
def blue_road012_page():
    """蓝球012路 - 第4个参数"""
    chart_data = get_distribution_chart_data("road012")
    return render_template('ssq/blue_road012.html', 
                          chart_name="蓝球012路",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-zone')
@cached(timeout=60)
def blue_zone_page():
    """蓝球区间 - 第5个参数"""
    chart_data = get_distribution_chart_data("zone")
    return render_template('ssq/blue_zone.html', 
                          chart_name="蓝球区间",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-odd-even')
@cached(timeout=60)
def blue_oddeven_page():
    """蓝球奇偶 - 第6个参数"""
    chart_data = get_distribution_chart_data("odd_even")
    return render_template('ssq/blue_oddeven.html', 
                          chart_name="蓝球奇偶",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-cold-warm-hot')
@cached(timeout=60)
def blue_coldwarmhot_page():
    """蓝球冷温热 - 第7个参数（参照红球逻辑）"""
    chart_data = get_distribution_chart_data("cold_warm_hot")
    return render_template('ssq/blue_coldwarmhot.html', 
                          chart_name="蓝球冷温热",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-repeat')
@cached(timeout=60)
def blue_repeat_page():
    """蓝球重号 - 第8个参数"""
    chart_data = get_distribution_chart_data("repeat")
    return render_template('ssq/blue_repeat.html', 
                          chart_name="蓝球重号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@ssq_page_bp.route('/trends/blue-adjacent')
@cached(timeout=60)
def blue_adjacent_page():
    """蓝球邻号 - 第9个参数"""
    chart_data = get_distribution_chart_data("adjacent")
    return render_template('ssq/blue_adjacent.html', 
                          chart_name="蓝球邻号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='blue': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

# ==================== SSQ API 路由定义 ====================

@ssq_api_bp.route('/basic-trend')
@cached(timeout=60)
def api_basic_trend():
    """API: 获取基本走势数据"""
    data = get_basic_trend_data()
    return jsonify(data)

@ssq_api_bp.route('/distribution/<chart_type>')
@cached(timeout=300)
def api_distribution(chart_type):
    """API: 获取分布图数据"""
    data = get_distribution_chart_data(chart_type)
    return jsonify(data)

@ssq_api_bp.route('/red-trend')
@cached(timeout=60)
def api_red_trend():
    """API: 获取红球走势数据（供JavaScript使用）"""
    data = get_red_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data['data'],
        'total': data['total']
    })

@ssq_api_bp.route('/missed/<int:ball_number>')
@cached(timeout=60)
def api_missed(ball_number):
    """API: 获取号码遗漏数据"""
    ball_type = request.args.get('type', 'red')
    current_index = request.args.get('index', 0, type=int)
    
    if ball_type not in ['red', 'blue']:
        return jsonify({'error': '无效的球类型'}), 400
    
    missed = calculate_missed_periods(ball_number, ball_type, current_index)
    status = get_ball_status_by_missed(missed)
    
    return jsonify({
        'ball_number': ball_number,
        'ball_type': ball_type,
        'missed_periods': missed,
        'status': status,
        'status_zh': '热' if status == 'hot' else '温' if status == 'warm' else '冷'
    })

@ssq_api_bp.route('/cold-warm-hot')
@cached(timeout=60)
def api_cold_warm_hot():
    """API: 获取冷温热统计"""
    ball_type = request.args.get('type', 'red')
    current_index = request.args.get('index', 0, type=int)
    
    if ball_type not in ['red', 'blue']:
        return jsonify({'error': '无效的球类型'}), 400
    
    if ball_type == 'red':
        numbers = list(range(1, 34))
    else:  # blue
        numbers = list(range(1, 17))
    
    result = get_cold_warm_hot(numbers, ball_type, current_index)
    parts = result.split(':')
    
    return jsonify({
        'ball_type': ball_type,
        'hot_count': int(parts[0]),
        'warm_count': int(parts[1]),
        'cold_count': int(parts[2]),
        'total': int(parts[0]) + int(parts[1]) + int(parts[2])
    })

@ssq_api_bp.route('/red-basic-trend')
@cached(timeout=60)
def api_red_basic_trend():
    """API: 获取红球基本走势数据（用于JavaScript）"""
    data_result = get_red_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data_result['data'],
        'total': data_result['total']
    })

@ssq_api_bp.route('/blue-basic-trend')
@cached(timeout=60)
def api_blue_basic_trend():
    """API: 获取蓝球基本走势数据（用于JavaScript）"""
    data = get_blue_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data['data'],
        'total': data['total']
    })