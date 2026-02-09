from flask import Blueprint, render_template, jsonify, request, current_app
from utils.cache import cached
import os
import pandas as pd
import numpy as np
from datetime import datetime

# ==================== DLT 页面蓝图 ====================
dlt_page_bp = Blueprint('dlt_page', __name__,
                       url_prefix='/dlt',
                       template_folder='../templates/dlt',
                       static_folder='../static')

# ==================== DLT API 蓝图 ====================
dlt_api_bp = Blueprint('dlt_api', __name__,
                      url_prefix='/api/v1/dlt')

# 创建数据模型实例
dlt_data = None

def load_dlt_data(csv_path):
    """加载大乐透数据"""
    df = pd.read_csv(csv_path)
    
    # 检查列名
    if len(df.columns) >= 7:
        df.columns = ['issue', 'front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']
    else:
        # 尝试自动检测列名
        print("警告: CSV列数不足，尝试自动处理...")
    
    # 转换为整数
    for col in ['front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
    
    # 按期号排序（从旧到新）
    df = df.sort_values('issue', ascending=True).reset_index(drop=True)
    
    return df

# ==================== 新增的精确计算函数 ====================

def calculate_consecutive_groups(front_balls):
    """计算连号组合 - 与前端JS逻辑保持一致"""
    if not front_balls or len(front_balls) < 2:
        return "无连号"
    
    sorted_balls = sorted(front_balls)
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
    
    consecutive_types.sort()
    return '+'.join(consecutive_types) if consecutive_types else '无连号'

def calculate_same_tail_groups(front_balls):
    """计算同尾组合 - 与前端JS逻辑保持一致"""
    if not front_balls or len(front_balls) < 2:
        return "无同尾"
    
    # 计算尾数
    tails = [ball % 10 for ball in front_balls]
    
    # 按尾数分组
    tail_groups = {}
    for i, tail in enumerate(tails):
        if tail not in tail_groups:
            tail_groups[tail] = []
        tail_groups[tail].append(front_balls[i])
    
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

def calculate_all_missed_periods(ball_type='front'):
    """
    计算所有号码在所有期的遗漏期数
    使用从当前期往前查找的逻辑
    从未出现过的设为18
    
    Args:
        ball_type: 'front' 或 'back'
    
    Returns:
        遗漏期数字典：{号码: {期索引: 遗漏值}}
    """
    if dlt_data is None or len(dlt_data) == 0:
        return {}
    
    missed_periods = {}
    data_count = len(dlt_data)
    
    # 初始化所有号码
    if ball_type == 'front':
        total_numbers = 35
    else:  # back
        total_numbers = 12
    
    for num in range(1, total_numbers + 1):
        missed_periods[num] = {}
    
    # 对于每一期，计算每个号码的遗漏值
    for current_index in range(data_count):
        row = dlt_data.iloc[current_index]
        
        if ball_type == 'front':
            # 获取当前期前区号码
            current_balls = [
                int(row['front1']), int(row['front2']), int(row['front3']),
                int(row['front4']), int(row['front5'])
            ]
        else:  # back
            # 获取当前期后区号码
            current_balls = [
                int(row['back1']), int(row['back2'])
            ]
        
        # 计算每个号码的遗漏值
        for num in range(1, total_numbers + 1):
            found = False
            
            # 从当前期往前查找
            for search_index in range(current_index, -1, -1):
                search_row = dlt_data.iloc[search_index]
                
                if ball_type == 'front':
                    # 检查前区
                    search_balls = [
                        int(search_row['front1']), int(search_row['front2']), int(search_row['front3']),
                        int(search_row['front4']), int(search_row['front5'])
                    ]
                else:  # back
                    # 检查后区
                    search_balls = [
                        int(search_row['back1']), int(search_row['back2'])
                    ]
                
                if num in search_balls:
                    # 找到最近一次出现
                    missed_periods[num][current_index] = current_index - search_index
                    found = True
                    break
            
            if not found:
                # 从未出现过，设为18
                missed_periods[num][current_index] = 18
    
    return missed_periods

def calculate_missed_periods(ball_number, ball_type='front', current_index=0):
    """
    计算号码的遗漏期数 - 使用从当前期往前查找的逻辑
    
    Args:
        ball_number: 号码
        ball_type: 'front' 或 'back'
        current_index: 当前期数索引（0表示第一期）
    
    Returns:
        遗漏期数，如果从未出现过返回18
    """
    if dlt_data is None or len(dlt_data) == 0:
        return 18
    
    if current_index >= len(dlt_data):
        return 18
    
    # 从当前期往前查找
    for search_index in range(current_index, -1, -1):
        row = dlt_data.iloc[search_index]
        
        if ball_type == 'front':
            # 检查前区
            front_balls = [
                int(row['front1']), int(row['front2']), int(row['front3']),
                int(row['front4']), int(row['front5'])
            ]
            if ball_number in front_balls:
                # 找到最近一次出现
                return current_index - search_index
        elif ball_type == 'back':
            # 检查后区
            back_balls = [
                int(row['back1']), int(row['back2'])
            ]
            if ball_number in back_balls:
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

def calculate_cold_warm_hot_ratio(balls, current_index, ball_type='front'):
    """
    计算冷温热比例 - 使用统一的遗漏值计算逻辑
    
    Args:
        balls: 当前期号码列表
        current_index: 当前期索引
        ball_type: 'front' 或 'back'
    
    Returns:
        冷温热比例字符串 "cold_count:warm_count:hot_count"
    """
    if not balls:
        return "0:0:0"
    
    cold_count = 0
    warm_count = 0
    hot_count = 0
    
    for ball_num in balls:
        missed = calculate_missed_periods(ball_num, ball_type, current_index)
        
        if missed < 4:
            hot_count += 1
        elif missed <= 16:
            warm_count += 1
        else:
            cold_count += 1
    
    return f"{cold_count}:{warm_count}:{hot_count}"

def get_cold_warm_hot(numbers, ball_type='front', current_index=0):
    """
    获取冷温热状态字符串 - 使用统一的遗漏值计算逻辑
    
    Args:
        numbers: 号码列表
        ball_type: 'front' 或 'back'
        current_index: 当前期数索引
    
    Returns:
        "hot_count:warm_count:cold_count"
    """
    if not numbers or dlt_data is None or len(dlt_data) == 0:
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

def calculate_repeat_and_adjacent_numbers_v2(current_balls, all_previous_data, current_index, ball_type='front'):
    """计算重号和邻号数量 - 与前端JS逻辑保持一致"""
    if current_index == 0 or not all_previous_data:
        return 0, 0  # 第一期没有重号和邻号
    
    prev_balls = all_previous_data[current_index - 1]['balls']
    
    # 重号：当前期号码在上期也出现过
    repeat_numbers = set(current_balls) & set(prev_balls)
    repeat_count = len(repeat_numbers)
    
    # 邻号：当前期号码与上期号码相差±1
    adjacent_count = 0
    for curr_ball in current_balls:
        for prev_ball in prev_balls:
            if abs(curr_ball - prev_ball) == 1:
                adjacent_count += 1
                break  # 每个号码只算一次（避免重复计数）
    
    return repeat_count, adjacent_count

# ==================== 按照指定顺序的数据获取函数 ====================

def get_front_basic_trend_data():
    """获取前区基本走势数据 - 严格按照指定顺序：'龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', '重号', '邻号'"""
    if dlt_data is None or len(dlt_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    
    # 先收集所有数据以便计算重号和邻号
    all_draw_data = []
    for i, row in dlt_data.iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        all_draw_data.append({'issue': str(row['issue']), 'balls': front_balls})
    
    # 逐条处理数据
    for i, row in dlt_data.iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        
        # 计算重号和邻号
        repeat_count, adjacent_count = calculate_repeat_and_adjacent_numbers_v2(
            front_balls, all_draw_data, i, 'front'
        )
        
        # 按照指定顺序计算各项参数
        # 1. 龙头
        dragon_head = min(front_balls) if front_balls else 0
        
        # 2. 凤尾
        phoenix_tail = max(front_balls) if front_balls else 0
        
        # 3. 和值
        sum_value = sum(front_balls)
        
        # 4. 跨度
        span_value = phoenix_tail - dragon_head
        
        # 5. AC值
        ac_value = calculate_ac_value(front_balls)
        
        # 6. 大小比
        size_ratio = calculate_size_ratio(front_balls)
        
        # 7. 质合比
        prime_ratio = calculate_prime_ratio(front_balls)
        
        # 8. 012路比
        road012_ratio = calculate_road012_ratio(front_balls)
        
        # 9. 区间比
        zone_ratio = calculate_zone_ratio(front_balls)
        
        # 10. 奇偶比
        odd_even_ratio = calculate_odd_even_ratio(front_balls)
        
        # 11. 连号
        consecutive_groups = calculate_consecutive_groups(front_balls)
        
        # 12. 同尾
        same_tail_groups = calculate_same_tail_groups(front_balls)
        
        # 13. 冷温热比 - 使用统一的遗漏值计算逻辑
        cold_warm_hot_ratio = calculate_cold_warm_hot_ratio(front_balls, i, 'front')
        
        # 14. 重号
        # repeat_count 已在前面计算
        
        # 15. 邻号
        # adjacent_count 已在前面计算
        
        # 构建符合前端期望的数据格式（保持原有字段名，但按指定顺序组织逻辑）
        data.append({
            'issue': str(row['issue']),
            'front_balls': front_balls,
            'back_balls': back_balls,
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

def get_back_basic_trend_data():
    """获取后区基本走势数据 - 严格按照指定顺序：'龙头', '凤尾', '和值', '跨度', '大小比', '质合比', '012路比', '区间比', '奇偶比', '冷温热比', '重号', '邻号'"""
    if dlt_data is None or len(dlt_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    
    # 先收集所有数据以便计算重号和邻号
    all_back_draw_data = []
    for i, row in dlt_data.iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        all_back_draw_data.append({'issue': str(row['issue']), 'balls': back_balls})
    
    # 逐条处理数据
    for i, row in dlt_data.iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        
        # 计算后区重号和邻号
        repeat_count, adjacent_count = calculate_repeat_and_adjacent_numbers_v2(
            back_balls, all_back_draw_data, i, 'back'
        )

        # 1. 龙头
        dragon_head = min(back_balls) if back_balls else 0
        
        # 2. 凤尾
        phoenix_tail = max(back_balls) if back_balls else 0
        
        # 3. 和值
        sum_value = sum(back_balls)
        
        # 4. 跨度
        span_value = max(back_balls) - min(back_balls) if back_balls else 0
        
        # 5. 大小比
        size_ratio = calculate_size_ratio_back(back_balls)
        
        # 6. 质合比
        prime_ratio = calculate_prime_ratio_back(back_balls)
        
        # 7. 012路比
        road012_ratio = calculate_road012_ratio_back(back_balls)
        
        # 8. 区间比
        zone_ratio = calculate_zone_ratio_back(back_balls)
        
        # 9. 奇偶比
        odd_even_ratio = calculate_odd_even_ratio(back_balls)
        
        # 10. 冷温热比 - 使用统一的遗漏值计算逻辑
        cold_warm_hot_ratio = calculate_cold_warm_hot_ratio(back_balls, i, 'back')
        
        # 11. 重号
        # repeat_count 已在前面计算
        
        # 12. 邻号
        # adjacent_count 已在前面计算
        
        # 构建符合前端期望的数据格式
        data.append({
            'issue': str(row['issue']),
            'front_balls': front_balls,
            'back_balls': back_balls,
            # 按照指定顺序排列的统计参数
            'dragon_head': dragon_head,              # 1. 龙头
            'phoenix_tail': phoenix_tail,            # 2. 凤尾
            'sum_value': sum_value,                  # 3. 和值
            'span': span_value,                      # 4. 跨度
            'size_ratio': size_ratio,                # 5. 大小比
            'prime_ratio': prime_ratio,              # 6. 质合比
            'road012_ratio': road012_ratio,          # 7. 012路比
            'zone_ratio': zone_ratio,                # 8. 区间比
            'odd_even_ratio': odd_even_ratio,        # 9. 奇偶比
            'cold_warm_hot_ratio': cold_warm_hot_ratio, # 10. 冷温热比
            'repeat_count': repeat_count,            # 11. 重号
            'adjacent_count': adjacent_count         # 12. 邻号
        })
    
    return {'data': data, 'total': len(data)}

def get_basic_trend_data():
    """获取基本走势数据（包含统计信息）"""
    if dlt_data is None or len(dlt_data) == 0:
        return {'data': [], 'total': 0}
    
    data = []
    for i, row in dlt_data.iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        
        # 计算前区统计指标
        stats = calculate_statistics_for_api(front_balls)
        
        data.append({
            'issue': str(row['issue']),
            'front_balls': front_balls,
            'back_balls': back_balls,
            'dragon_head': min(front_balls) if front_balls else 0,
            'phoenix_tail': max(front_balls) if front_balls else 0,
            'sum_value': stats['sum'],
            'span': stats['span'],
            'ac_value': stats['ac_value'],
            'size_ratio': stats['size_ratio'],
            'prime_ratio': stats['prime_ratio'],
            'road012_ratio': stats['road012_ratio'],
            'zone_ratio': stats['zone_ratio'],
            'odd_even_ratio': stats['odd_even_ratio']
            
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
    
    # 大小比（大乐透前区以17为分界，后区以6为分界）
    big_count = sum(1 for n in numbers if n > 17)
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
    
    # 区间比（大乐透前区：1-12, 13-24, 25-35）
    zone_counts = [
        sum(1 for n in numbers if 1 <= n <= 12),
        sum(1 for n in numbers if 13 <= n <= 24),
        sum(1 for n in numbers if 25 <= n <= 35)
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
    if dlt_data is None or len(dlt_data) == 0:
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
    elif chart_type == "back_sum":
        return get_back_sum_data()
    elif chart_type == "back_span":
        return get_back_span_data()
    elif chart_type == "back_sizeratio":
        return get_back_sizeratio_data()
    elif chart_type == "back_primeratio":
        return get_back_primeratio_data()
    elif chart_type == "back_road012ratio":
        return get_back_road012ratio_data()
    elif chart_type == "back_zoneratio":
        return get_back_zoneratio_data()
    elif chart_type == "back_oddevenratio":
        return get_back_oddevenratio_data()
    elif chart_type == "back_coldwarmhotratio":
        return get_back_coldwarmhotratio_data()
    else:
        return get_general_distribution_data(chart_type)

# ==================== 前区分布图函数 ====================

def get_dragonhead_data():
    """获取龙头数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计龙头出现次数
    dragonhead_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        if front_balls:
            dragonhead = min(front_balls)
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
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计凤尾出现次数
    phoenixtail_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        if front_balls:
            phoenixtail = max(front_balls)
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
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计和值出现次数
    sum_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        if front_balls:
            sum_value = sum(front_balls)
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
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计跨度出现次数
    span_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        if front_balls:
            span = max(front_balls) - min(front_balls)
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
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计AC值出现次数
    ac_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        front_balls = [
            int(row['front1']), int(row['front2']), int(row['front3']),
            int(row['front4']), int(row['front5'])
        ]
        if front_balls:
            ac_value = calculate_ac_value(front_balls)
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

# ==================== 后区分布图函数 ====================

def get_back_sum_data():
    """获取后区和值数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区和值出现次数
    sum_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            sum_value = sum(back_balls)
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

def get_back_span_data():
    """获取后区跨度数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区跨度出现次数
    span_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            span = max(back_balls) - min(back_balls)
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

def get_back_sizeratio_data():
    """获取后区大小比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区大小比出现次数
    size_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            size_ratio = calculate_size_ratio_back(back_balls)
            size_counts[size_ratio] = size_counts.get(size_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (size_ratio, count) in enumerate(sorted(size_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": size_ratio,
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_back_primeratio_data():
    """获取后区质合比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区质合比出现次数
    prime_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            prime_ratio = calculate_prime_ratio_back(back_balls)
            prime_counts[prime_ratio] = prime_counts.get(prime_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (prime_ratio, count) in enumerate(sorted(prime_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": prime_ratio,
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_back_road012ratio_data():
    """获取后区012路比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区012路比出现次数
    road_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            road012_ratio = calculate_road012_ratio_back(back_balls)
            road_counts[road012_ratio] = road_counts.get(road012_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (road012_ratio, count) in enumerate(sorted(road_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": road012_ratio,
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_back_zoneratio_data():
    """获取后区区间比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区区间比出现次数
    zone_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            zone_ratio = calculate_zone_ratio_back(back_balls)
            zone_counts[zone_ratio] = zone_counts.get(zone_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (zone_ratio, count) in enumerate(sorted(zone_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": zone_ratio,
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_back_oddevenratio_data():
    """获取后区奇偶比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区奇偶比出现次数
    odd_even_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            odd_even_ratio = calculate_odd_even_ratio(back_balls)
            odd_even_counts[odd_even_ratio] = odd_even_counts.get(odd_even_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (odd_even_ratio, count) in enumerate(sorted(odd_even_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": odd_even_ratio,
            "value": count,
            "category": 0
        })
    
    return {
        "nodes": nodes,
        "links": []
    }

def get_back_coldwarmhotratio_data():
    """获取后区冷温热比数据"""
    if dlt_data is None or len(dlt_data) == 0:
        return {"nodes": [], "links": []}
    
    # 统计后区冷温热比出现次数
    cwh_counts = {}
    for _, row in dlt_data.head(100).iterrows():
        back_balls = [
            int(row['back1']), int(row['back2'])
        ]
        if back_balls:
            cwh_ratio = calculate_cold_warm_hot_ratio(back_balls, 0, 'back')
            cwh_counts[cwh_ratio] = cwh_counts.get(cwh_ratio, 0) + 1
    
    # 转换为节点格式
    nodes = []
    for i, (cwh_ratio, count) in enumerate(sorted(cwh_counts.items())):
        nodes.append({
            "id": f"node_{i}",
            "name": cwh_ratio,
            "value": count,
            "category": 0
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
    """计算前区大小比（以17为分界线）"""
    if not numbers:
        return "0:0"
    big_count = sum(1 for n in numbers if n > 17)
    small_count = len(numbers) - big_count
    return f"{big_count}:{small_count}"

def calculate_size_ratio_back(numbers):
    """计算后区大小比（以6为分界线）"""
    if not numbers:
        return "0:0"
    big_count = sum(1 for n in numbers if n > 6)
    small_count = len(numbers) - big_count
    return f"{big_count}:{small_count}"

def calculate_prime_ratio(numbers):
    """计算前区质合比"""
    if not numbers:
        return "0:0"
    prime_numbers = {1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31}
    prime_count = sum(1 for n in numbers if n in prime_numbers)
    composite_count = len(numbers) - prime_count
    return f"{prime_count}:{composite_count}"

def calculate_prime_ratio_back(numbers):
    """计算后区质合比"""
    if not numbers:
        return "0:0"
    prime_numbers = {1, 2, 3, 5, 7, 11}
    prime_count = sum(1 for n in numbers if n in prime_numbers)
    composite_count = len(numbers) - prime_count
    return f"{prime_count}:{composite_count}"

def calculate_road012_ratio(numbers):
    """计算前区012路比"""
    if not numbers:
        return "0:0:0"
    road_counts = {0: 0, 1: 0, 2: 0}
    for n in numbers:
        road_counts[n % 3] += 1
    return f"{road_counts[0]}:{road_counts[1]}:{road_counts[2]}"

def calculate_road012_ratio_back(numbers):
    """计算后区012路比"""
    if not numbers:
        return "0:0:0"
    road_counts = {0: 0, 1: 0, 2: 0}
    for n in numbers:
        road_counts[n % 3] += 1
    return f"{road_counts[0]}:{road_counts[1]}:{road_counts[2]}"

def calculate_zone_ratio(numbers):
    """计算前区区间比（1-12, 13-24, 25-35）"""
    if not numbers:
        return "0:0:0"
    zone_counts = [
        sum(1 for n in numbers if 1 <= n <= 12),
        sum(1 for n in numbers if 13 <= n <= 24),
        sum(1 for n in numbers if 25 <= n <= 35)
    ]
    return f"{zone_counts[0]}:{zone_counts[1]}:{zone_counts[2]}"

def calculate_zone_ratio_back(numbers):
    """计算后区区间比"""
    if not numbers:
        return "0:0:0"
    zone_counts = [
        sum(1 for n in numbers if 1 <= n <= 4),
        sum(1 for n in numbers if 5 <= n <= 8),
        sum(1 for n in numbers if 9 <= n <= 12)
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
    
    # 大小比（以17为分界线）
    big_count = sum(1 for n in numbers if n > 17)
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

def get_zone_ratio(numbers, total_numbers=35, zones=3):
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

# ==================== DLT 页面路由定义 ====================

@dlt_page_bp.route('/')
@cached(timeout=60)
def index():
    """大乐透主页"""
    return render_template('dlt/base.html', chart_name="大乐透分析")

@dlt_page_bp.route('/trends/front-basic')
@cached(timeout=60)
def front_basic_trend_page():
    """前区基本走势图页面 - 参数顺序：'龙头', '凤尾', '和值', '跨度', 'AC值', '大小比', '质合比', '012路比', '区间比', '奇偶比', '连号', '同尾', '冷温热比', '重号', '邻号'"""
    print("=== 进入front_basic_trend_page函数 ===")
    
    try:
        data_result = get_front_basic_trend_data()
        print(f"获取到数据条数: {data_result['total']}")
        
        # 详细检查数据
        if data_result['data'] and len(data_result['data']) > 0:
            first_item = data_result['data'][0]
            print(f"第一条数据结构: {list(first_item.keys())}")
            print(f"第一条数据内容预览: {str(first_item)[:200]}...")
        else:
            print("警告: 数据为空!")
        
        result = render_template('dlt/front_basic_trend.html', 
                              chart_name="前区基本走势图",
                              data=data_result['data'],
                              total=data_result['total'],
                              calculate_statistics=calculate_statistics,
                              get_zone_ratio=get_zone_ratio,
                              find_consecutive_numbers=find_consecutive_numbers,
                              find_same_tail_numbers=find_same_tail_numbers,
                              calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                              get_ball_status_by_missed=get_ball_status_by_missed)
        
        print("模板渲染成功") 
        return result
        
    except Exception as e:
        print(f"!!! 模板渲染错误: {e}")
        return f"<h1>错误: {str(e)}</h1>"

# 前区页面路由（按照指定顺序）
@dlt_page_bp.route('/trends/dragonhead')
@cached(timeout=60)
def front_dragonhead_page():
    """前区龙头 - 第1个参数"""
    chart_data = get_distribution_chart_data("dragonhead")
    return render_template('dlt/front_dragonhead.html', 
                          chart_name="前区龙头",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/phoenixtail')
@cached(timeout=60)
def front_phoenixtail_page():
    """前区凤尾 - 第2个参数"""
    chart_data = get_distribution_chart_data("phoenixtail")
    return render_template('dlt/front_phoenixtail.html', 
                          chart_name="前区凤尾",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/sum')
@cached(timeout=60)
def front_sum_page():
    """前区和值 - 第3个参数"""
    chart_data = get_distribution_chart_data("sum")
    return render_template('dlt/front_sum.html', 
                          chart_name="前区和值",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/span')
@cached(timeout=60)
def front_span_page():
    """前区跨度 - 第4个参数"""
    chart_data = get_distribution_chart_data("span")
    return render_template('dlt/front_span.html', 
                          chart_name="前区跨度",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/acvalue')
@cached(timeout=60)
def front_acvalue_page():
    """前区AC值 - 第5个参数"""
    chart_data = get_distribution_chart_data("ac_value")
    return render_template('dlt/front_acvalue.html', 
                          chart_name="前区AC值",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/size-ratio')
@cached(timeout=60)
def front_sizeratio_page():
    """前区大小比 - 第6个参数"""
    chart_data = get_distribution_chart_data("size_ratio")
    return render_template('dlt/front_sizeratio.html', 
                          chart_name="前区大小比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/prime-ratio')
@cached(timeout=60)
def front_primeratio_page():
    """前区质合比 - 第7个参数"""
    chart_data = get_distribution_chart_data("prime_ratio")
    return render_template('dlt/front_primeratio.html', 
                          chart_name="前区质合比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/road012-ratio')
@cached(timeout=60)
def front_road012ratio_page():
    """前区012路比 - 第8个参数"""
    chart_data = get_distribution_chart_data("road012_ratio")
    return render_template('dlt/front_road012ratio.html', 
                          chart_name="前区012路比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/zone-ratio')
@cached(timeout=60)
def front_zoneratio_page():
    """前区区间比 - 第9个参数"""
    chart_data = get_distribution_chart_data("zone_ratio")
    return render_template('dlt/front_zoneratio.html', 
                          chart_name="前区区间比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/odd-even-ratio')
@cached(timeout=60)
def front_oddevenratio_page():
    """前区奇偶比 - 第10个参数"""
    chart_data = get_distribution_chart_data("odd_even_ratio")
    return render_template('dlt/front_oddevenratio.html', 
                          chart_name="前区奇偶比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/consecutive')
@cached(timeout=60)
def front_consecutive_page():
    """前区连号 - 第11个参数"""
    chart_data = get_distribution_chart_data("consecutive")
    return render_template('dlt/front_consecutive.html', 
                          chart_name="前区连号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/same-tail')
@cached(timeout=60)
def front_sametail_page():
    """前区同尾 - 第12个参数"""
    chart_data = get_distribution_chart_data("same_tail")
    return render_template('dlt/front_sametail.html', 
                          chart_name="前区同尾",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/cold-warm-hot-ratio')
@cached(timeout=60)
def front_coldwarmhotratio_page():
    """前区冷温热比 - 第13个参数"""
    chart_data = get_distribution_chart_data("cold_warm_hot_ratio")
    return render_template('dlt/front_coldwarmhotratio.html', 
                          chart_name="前区冷温热比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/repeat')
@cached(timeout=60)
def front_repeat_page():
    """前区重号 - 第14个参数"""
    chart_data = get_distribution_chart_data("repeat")
    return render_template('dlt/front_repeat.html', 
                          chart_name="前区重号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/adjacent')
@cached(timeout=60)
def front_adjacent_page():
    """前区邻号 - 第15个参数"""
    chart_data = get_distribution_chart_data("adjacent")
    return render_template('dlt/front_adjacent.html', 
                          chart_name="前区邻号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='front': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

# 后区页面路由
@dlt_page_bp.route('/trends/back-basic')
@cached(timeout=60)
def back_basic_page():
    """后区基本走势图 - 参数顺序：'龙头', '凤尾', '和值', '跨度', '大小比', '质合比', '012路比', '区间比', '奇偶比', '冷温热比', '重号', '邻号'"""
    data = get_back_basic_trend_data()
    return render_template('dlt/back_basic.html', 
                          chart_name="后区基本走势图",
                          data=data['data'],
                          total=data['total'],
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-dragonhead')
@cached(timeout=60)
def back_dragonhead_page():
    """后区龙头 - 第1个参数"""
    chart_data = get_distribution_chart_data("back_dragonhead")
    return render_template('dlt/back_dragonhead.html', 
                          chart_name="后区龙头",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-phoenixtail')
@cached(timeout=60)
def back_phoenixtail_page():
    """后区凤尾 - 第2个参数"""
    chart_data = get_distribution_chart_data("back_phoenixtail")
    return render_template('dlt/back_phoenixtail.html', 
                          chart_name="后区凤尾",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-sum')
@cached(timeout=60)
def back_sum_page():
    """后区和值 - 第3个参数"""
    chart_data = get_distribution_chart_data("back_sum")
    return render_template('dlt/back_sum.html', 
                          chart_name="后区和值",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-span')
@cached(timeout=60)
def back_span_page():
    """后区跨度 - 第4个参数"""
    chart_data = get_distribution_chart_data("back_span")
    return render_template('dlt/back_span.html', 
                          chart_name="后区跨度",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-size-ratio')
@cached(timeout=60)
def back_sizeratio_page():
    """后区大小比 - 第5个参数"""
    chart_data = get_distribution_chart_data("back_sizeratio")
    return render_template('dlt/back_sizeratio.html', 
                          chart_name="后区大小比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-prime-ratio')
@cached(timeout=60)
def back_primeratio_page():
    """后区质合比 - 第6个参数"""
    chart_data = get_distribution_chart_data("back_primeratio")
    return render_template('dlt/back_primeratio.html', 
                          chart_name="后区质合比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-road012-ratio')
@cached(timeout=60)
def back_road012ratio_page():
    """后区012路比 - 第7个参数"""
    chart_data = get_distribution_chart_data("back_road012ratio")
    return render_template('dlt/back_road012ratio.html', 
                          chart_name="后区012路比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-zone-ratio')
@cached(timeout=60)
def back_zoneratio_page():
    """后区区间比 - 第8个参数"""
    chart_data = get_distribution_chart_data("back_zoneratio")
    return render_template('dlt/back_zoneratio.html', 
                          chart_name="后区区间比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-odd-even-ratio')
@cached(timeout=60)
def back_oddevenratio_page():
    """后区奇偶比 - 第9个参数"""
    chart_data = get_distribution_chart_data("back_oddevenratio")
    return render_template('dlt/back_oddevenratio.html', 
                          chart_name="后区奇偶比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-cold-warm-hot-ratio')
@cached(timeout=60)
def back_coldwarmhotratio_page():
    """后区冷温热比 - 第10个参数"""
    chart_data = get_distribution_chart_data("back_coldwarmhotratio")
    return render_template('dlt/back_coldwarmhotratio.html', 
                          chart_name="后区冷温热比",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-repeat')
@cached(timeout=60)
def back_repeat_page():
    """后区重号 - 第11个参数"""
    chart_data = get_distribution_chart_data("repeat")
    return render_template('dlt/back_repeat.html', 
                          chart_name="后区重号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

@dlt_page_bp.route('/trends/back-adjacent')
@cached(timeout=60)
def back_adjacent_page():
    """后区邻号 - 第12个参数"""
    chart_data = get_distribution_chart_data("adjacent")
    return render_template('dlt/back_adjacent.html', 
                          chart_name="后区邻号",
                          chart_data=chart_data,
                          calculate_missed_periods=lambda n, t='back': calculate_missed_periods(n, t, 0),
                          get_ball_status_by_missed=get_ball_status_by_missed)

# ==================== DLT API 路由定义 ====================

@dlt_api_bp.route('/basic-trend')
@cached(timeout=60)
def api_basic_trend():
    """API: 获取基本走势数据"""
    data = get_basic_trend_data()
    return jsonify(data)

@dlt_api_bp.route('/distribution/<chart_type>')
@cached(timeout=300)
def api_distribution(chart_type):
    """API: 获取分布图数据"""
    data = get_distribution_chart_data(chart_type)
    return jsonify(data)

@dlt_api_bp.route('/front-trend')
@cached(timeout=60)
def api_front_trend():
    """API: 获取前区走势数据（供JavaScript使用）"""
    data = get_front_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data['data'],
        'total': data['total']
    })

@dlt_api_bp.route('/missed/<int:ball_number>')
@cached(timeout=60)
def api_missed(ball_number):
    """API: 获取号码遗漏数据"""
    ball_type = request.args.get('type', 'front')
    current_index = request.args.get('index', 0, type=int)
    
    if ball_type not in ['front', 'back']:
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

@dlt_api_bp.route('/cold-warm-hot')
@cached(timeout=60)
def api_cold_warm_hot():
    """API: 获取冷温热统计"""
    ball_type = request.args.get('type', 'front')
    current_index = request.args.get('index', 0, type=int)
    
    if ball_type not in ['front', 'back']:
        return jsonify({'error': '无效的球类型'}), 400

    if ball_type == 'front':
        numbers = list(range(1, 36))
    else:  # back
        numbers = list(range(1, 13))
    
    result = get_cold_warm_hot(numbers, ball_type, current_index)
    parts = result.split(':')
    
    return jsonify({
        'ball_type': ball_type,
        'hot_count': int(parts[0]),
        'warm_count': int(parts[1]),
        'cold_count': int(parts[2]),
        'total': int(parts[0]) + int(parts[1]) + int(parts[2])
    })

@dlt_api_bp.route('/front-basic-trend')
@cached(timeout=60)
def api_front_basic_trend():
    """API: 获取前区基本走势数据（用于JavaScript）"""
    data_result = get_front_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data_result['data'],
        'total': data_result['total']
    })

@dlt_api_bp.route('/back-basic-trend')
@cached(timeout=60)
def api_back_basic_trend():
    """API: 获取后区基本走势数据（用于JavaScript）"""
    data_result = get_back_basic_trend_data()
    return jsonify({
        'success': True,
        'data': data_result['data'],
        'total': data_result['total']
    })