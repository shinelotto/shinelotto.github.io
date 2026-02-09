#!/usr/bin/env python3
"""
彩票分析系统主应用
基于CSV数据文件，提供双色球和大乐透的走势分析
"""

import os
import sys
import socket
from flask import Flask, render_template, redirect, url_for, jsonify, request
from config import config
# 修改导入语句
from blueprints.ssq_bp import ssq_page_bp, ssq_api_bp, load_ssq_data as load_ssq_data_for_blueprint
from blueprints.dlt_bp import dlt_page_bp, dlt_api_bp, load_dlt_data as load_dlt_data_for_blueprint
from utils.cache import cache
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from datetime import datetime

# 加载环境变量
load_dotenv()

# 创建全局应用实例
app = None

def create_app(config_name='default'):
    """创建Flask应用"""
    global app
    app = Flask(__name__, 
               static_folder='static',
               template_folder='templates')
    
    # 加载配置
    app.config.from_object(config[config_name])
    
    # 初始化缓存
    cache.init_app(app)
    
    # 加载数据
    app.ssq_data = load_ssq_data(app.config.get('SSQ_DATA_PATH'))
    app.dlt_data = load_dlt_data(app.config.get('DLT_DATA_PATH'))
    
    # ========== 添加缺失的函数定义（在 inject_globals() 之前）==========
    def get_ssq_latest_red_balls():
        """获取双色球最新红球号码（已排序）"""
        if app.ssq_data is not None and len(app.ssq_data) > 0:
            red_balls = [
                int(app.ssq_data.iloc[-1]['red1']),
                int(app.ssq_data.iloc[-1]['red2']),
                int(app.ssq_data.iloc[-1]['red3']),
                int(app.ssq_data.iloc[-1]['red4']),
                int(app.ssq_data.iloc[-1]['red5']),
                int(app.ssq_data.iloc[-1]['red6'])
            ]
            return sorted(red_balls)
        return [1, 2, 3, 4, 5, 6]  # 默认值
    
    def get_ssq_latest_blue_ball():
        """获取双色球最新蓝球号码"""
        if app.ssq_data is not None and len(app.ssq_data) > 0:
            return int(app.ssq_data.iloc[-1]['blue'])
        return 1  # 默认值
    
    def get_dlt_latest_front_balls():
        """获取大乐透最新前区号码（已排序）"""
        if app.dlt_data is not None and len(app.dlt_data) > 0:
            front_balls = [
                int(app.dlt_data.iloc[-1]['front1']),
                int(app.dlt_data.iloc[-1]['front2']),
                int(app.dlt_data.iloc[-1]['front3']),
                int(app.dlt_data.iloc[-1]['front4']),
                int(app.dlt_data.iloc[-1]['front5'])
            ]
            return sorted(front_balls)
        return [1, 2, 3, 4, 5]  # 默认值
    
    def get_dlt_latest_back_balls():
        """获取大乐透最新后区号码（已排序）"""
        if app.dlt_data is not None and len(app.dlt_data) > 0:
            back_balls = [
                int(app.dlt_data.iloc[-1]['back1']),
                int(app.dlt_data.iloc[-1]['back2'])
            ]
            return sorted(back_balls)
        return [1, 2]  # 默认值
    
    def get_ssq_total_count():
        """获取双色球总期数"""
        if app.ssq_data is not None:
            return len(app.ssq_data)
        return 0
    
    def get_dlt_total_count():
        """获取大乐透总期数"""
        if app.dlt_data is not None:
            return len(app.dlt_data)
        return 0
    
    # 原有的其他函数定义
    def get_current_time():
        """获取当前时间"""
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def get_ssq_last_update():
        """获取双色球最后更新"""
        if app.ssq_data is not None and len(app.ssq_data) > 0:
            return datetime.now().strftime('%Y-%m-%d')
        return "---"
    
    def get_dlt_last_update():
        """获取大乐透最后更新"""
        if app.dlt_data is not None and len(app.dlt_data) > 0:
            return datetime.now().strftime('%Y-%m-%d')
        return "---"
    
    # 遗漏计算相关函数
    def calculate_ssq_missed_periods(ball_number, ball_type='red', current_index=0):
        """
        计算双色球号码的遗漏期数
        ball_number: 号码 (1-33 或 1-16)
        ball_type: 'red' 或 'blue'
        current_index: 当前期数索引（0表示最新一期）
        返回: 遗漏期数
        """
        if app.ssq_data is None or len(app.ssq_data) == 0:
            return 18  # 返回一个大数表示从未出现
        
        missed = 0
        for i in range(current_index, len(app.ssq_data)):
            row = app.ssq_data.iloc[i]
            
            if ball_type == 'red':
                # 检查红球
                red_balls = [
                    int(row['red1']), int(row['red2']), int(row['red3']),
                    int(row['red4']), int(row['red5']), int(row['red6'])
                ]
                if ball_number in red_balls:
                    return missed
            elif ball_type == 'blue':
                # 检查蓝球
                if int(row['blue']) == ball_number:
                    return missed
            
            missed += 1
        
        # 如果遍历完所有数据都没找到，返回总期数减去当前索引
        return len(app.ssq_data) - current_index
    
    def calculate_dlt_missed_periods(ball_number, ball_type='front', current_index=0):
        """
        计算大乐透号码的遗漏期数
        ball_number: 号码
        ball_type: 'front' 或 'back'
        current_index: 当前期数索引
        返回: 遗漏期数
        """
        if app.dlt_data is None or len(app.dlt_data) == 0:
            return 18
        
        missed = 0
        for i in range(current_index, len(app.dlt_data)):
            row = app.dlt_data.iloc[i]
            
            if ball_type == 'front':
                # 检查前区
                front_balls = [
                    int(row['front1']), int(row['front2']), int(row['front3']),
                    int(row['front4']), int(row['front5'])
                ]
                if ball_number in front_balls:
                    return missed
            elif ball_type == 'back':
                # 检查后区
                back_balls = [
                    int(row['back1']), int(row['back2'])
                ]
                if ball_number in back_balls:
                    return missed
            
            missed += 1
        
        return len(app.dlt_data) - current_index
    
    def get_ball_status_by_missed(missed_periods):
        """
        根据遗漏期数判断号码状态
        missed_periods: 遗漏期数
        返回: 'hot', 'warm', 'cold'
        """
        if missed_periods < 4:
            return 'hot'
        elif missed_periods <= 16:
            return 'warm'
        else:  # missed_periods >= 17
            return 'cold'
    
    def calculate_missed_periods(ball_number, ball_type='red', current_index=0):
        """
        通用遗漏计算函数（用于模板上下文处理器）
        注意：这个函数会根据请求上下文决定调用双色球还是大乐透的遗漏计算
        在实际使用中，应该通过具体的参数传递来判断
        """
        # 默认返回0，实际在模板中应该通过具体的路由参数来调用正确的函数
        return 0
    
    def get_ssq_cold_warm_hot(numbers, ball_type='red', current_index=0):
        """
        获取双色球冷温热状态字符串
        numbers: 号码列表
        ball_type: 'red' 或 'blue'
        current_index: 当前期数索引
        返回: "hot_count:warm_count:cold_count"
        """
        if not numbers or app.ssq_data is None or len(app.ssq_data) == 0:
            return "0:0:0"
        
        hot_count = 0
        warm_count = 0
        cold_count = 0
        
        for num in numbers:
            missed = calculate_ssq_missed_periods(num, ball_type, current_index)
            status = get_ball_status_by_missed(missed)
            
            if status == 'hot':
                hot_count += 1
            elif status == 'warm':
                warm_count += 1
            else:  # 'cold'
                cold_count += 1
        
        return f"{hot_count}:{warm_count}:{cold_count}"
    
    def get_dlt_cold_warm_hot(numbers, ball_type='front', current_index=0):
        """
        获取大乐透冷温热状态字符串
        numbers: 号码列表
        ball_type: 'front' 或 'back'
        current_index: 当前期数索引
        返回: "hot_count:warm_count:cold_count"
        """
        if not numbers or app.dlt_data is None or len(app.dlt_data) == 0:
            return "0:0:0"
        
        hot_count = 0
        warm_count = 0
        cold_count = 0
        
        for num in numbers:
            missed = calculate_dlt_missed_periods(num, ball_type, current_index)
            status = get_ball_status_by_missed(missed)
            
            if status == 'hot':
                hot_count += 1
            elif status == 'warm':
                warm_count += 1
            else:  # 'cold'
                cold_count += 1
        
        return f"{hot_count}:{warm_count}:{cold_count}"
    
    def get_cold_warm_hot(numbers, hot_numbers=None, cold_numbers=None):
        """简化版本的冷温热计算（用于模板上下文处理器）"""
        # 这里使用简化版本，返回占位符
        # 实际使用时应该在具体的蓝图函数中调用准确的函数
        return "0:0:0"
    
    # ========== 模板全局函数 ==========
    def get_zone_ratio(numbers, total_numbers=33, zones=3):
        """获取区间比"""
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
    
    def calculate_statistics(numbers):
        """计算统计指标"""
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
        
        # 质合比
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
    
    def find_consecutive_numbers(numbers):
        """查找连号"""
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
        """查找同尾号"""
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
    
    # ========== 注册模板上下文处理器 ==========
    @app.context_processor
    def inject_globals():
        return {
            'config': app.config,
            'get_zone_ratio': get_zone_ratio,
            'calculate_statistics': calculate_statistics,
            'find_consecutive_numbers': find_consecutive_numbers,
            'find_same_tail_numbers': find_same_tail_numbers,
            'get_cold_warm_hot': get_cold_warm_hot,
            'get_ball_status_by_missed': get_ball_status_by_missed,
            'calculate_missed_periods': calculate_missed_periods,
            'get_ssq_latest_red_balls': get_ssq_latest_red_balls,
            'get_ssq_latest_blue_ball': get_ssq_latest_blue_ball,
            'get_dlt_latest_front_balls': get_dlt_latest_front_balls,
            'get_dlt_latest_back_balls': get_dlt_latest_back_balls,
            'get_ssq_total_count': get_ssq_total_count,
            'get_dlt_total_count': get_dlt_total_count,
            'get_current_time': get_current_time,
            'get_ssq_last_update': get_ssq_last_update,
            'get_dlt_last_update': get_dlt_last_update
        }
    
    # ========== 注册蓝图 ==========
    app.register_blueprint(ssq_page_bp)
    app.register_blueprint(dlt_page_bp)
    app.register_blueprint(ssq_api_bp)
    app.register_blueprint(dlt_api_bp)
    
    # 在应用级别设置蓝图中的数据变量
    with app.app_context():
        # 导入蓝图中的数据变量
        import blueprints.ssq_bp
        import blueprints.dlt_bp
        
        # 将应用级数据赋给蓝图级变量
        blueprints.ssq_bp.ssq_data = app.ssq_data
        blueprints.dlt_bp.dlt_data = app.dlt_data
    
    # ========== 添加兼容性路由解决模板链接问题 ==========
    
    # 双色球兼容性路由
    @app.route('/ssq/red_basic_trend')
    def redirect_red_basic_trend():
        """兼容性路由：重定向到正确的页面路由"""
        return redirect(url_for('ssq_page.red_basic_trend_page'))
    
    @app.route('/ssq/blue_basic')
    def redirect_blue_basic():
        """兼容性路由：重定向到正确的页面路由"""
        return redirect(url_for('ssq_page.blue_basic_page'))
    
    @app.route('/ssq/red_dragonhead')
    def redirect_red_dragonhead():
        return redirect(url_for('ssq_page.red_dragonhead_page'))
    
    @app.route('/ssq/red_phoenixtail')
    def redirect_red_phoenixtail():
        return redirect(url_for('ssq_page.red_phoenixtail_page'))
    
    @app.route('/ssq/red_sum')
    def redirect_red_sum():
        return redirect(url_for('ssq_page.red_sum_page'))
    
    @app.route('/ssq/red_span')
    def redirect_red_span():
        return redirect(url_for('ssq_page.red_span_page'))
    
    @app.route('/ssq/red_acvalue')
    def redirect_red_acvalue():
        return redirect(url_for('ssq_page.red_acvalue_page'))
    
    @app.route('/ssq/red_sizeratio')
    def redirect_red_sizeratio():
        return redirect(url_for('ssq_page.red_sizeratio_page'))
    
    @app.route('/ssq/red_primeratio')
    def redirect_red_primeratio():
        return redirect(url_for('ssq_page.red_primeratio_page'))
    
    @app.route('/ssq/red_road012ratio')
    def redirect_red_road012ratio():
        return redirect(url_for('ssq_page.red_road012ratio_page'))
    
    @app.route('/ssq/red_zoneratio')
    def redirect_red_zoneratio():
        return redirect(url_for('ssq_page.red_zoneratio_page'))
    
    @app.route('/ssq/red_oddevenratio')
    def redirect_red_oddevenratio():
        return redirect(url_for('ssq_page.red_oddevenratio_page'))
    
    @app.route('/ssq/red_consecutive')
    def redirect_red_consecutive():
        return redirect(url_for('ssq_page.red_consecutive_page'))
    
    @app.route('/ssq/red_sametail')
    def redirect_red_sametail():
        return redirect(url_for('ssq_page.red_sametail_page'))
    
    @app.route('/ssq/red_coldwarmhotratio')
    def redirect_red_coldwarmhotratio():
        return redirect(url_for('ssq_page.red_coldwarmhotratio_page'))
    
    @app.route('/ssq/red_repeat')
    def redirect_red_repeat():
        return redirect(url_for('ssq_page.red_repeat_page'))
    
    @app.route('/ssq/red_adjacent')
    def redirect_red_adjacent():
        return redirect(url_for('ssq_page.red_adjacent_page'))
    
    # 蓝球兼容性路由
    @app.route('/ssq/blue_amplitude')
    def redirect_blue_amplitude():
        return redirect(url_for('ssq_page.blue_amplitude_page'))
    
    @app.route('/ssq/blue_size')
    def redirect_blue_size():
        return redirect(url_for('ssq_page.blue_size_page'))
    
    @app.route('/ssq/blue_prime')
    def redirect_blue_prime():
        return redirect(url_for('ssq_page.blue_prime_page'))
    
    @app.route('/ssq/blue_road012')
    def redirect_blue_road012():
        return redirect(url_for('ssq_page.blue_road012_page'))
    
    @app.route('/ssq/blue_zone')
    def redirect_blue_zone():
        return redirect(url_for('ssq_page.blue_zone_page'))
    
    @app.route('/ssq/blue_oddeven')
    def redirect_blue_oddeven():
        return redirect(url_for('ssq_page.blue_oddeven_page'))
    
    @app.route('/ssq/blue_coldwarmhot')
    def redirect_blue_coldwarmhot():
        return redirect(url_for('ssq_page.blue_coldwarmhot_page'))
    
    @app.route('/ssq/blue_repeat')
    def redirect_blue_repeat():
        return redirect(url_for('ssq_page.blue_repeat_page'))
    
    @app.route('/ssq/blue_adjacent')
    def redirect_blue_adjacent():
        return redirect(url_for('ssq_page.blue_adjacent_page'))
    
    # 大乐透兼容性路由
    @app.route('/dlt/front_basic_trend')
    def redirect_dlt_front_basic_trend():
        return redirect(url_for('dlt_page.front_basic_trend_page'))
    
    @app.route('/dlt/back_basic')
    def redirect_dlt_back_basic():
        return redirect(url_for('dlt_page.back_basic_page'))
    
    @app.route('/dlt/front_dragonhead')
    def redirect_front_dragonhead():
        return redirect(url_for('dlt_page.front_dragonhead_page'))
    
    @app.route('/dlt/front_phoenixtail')
    def redirect_front_phoenixtail():
        return redirect(url_for('dlt_page.front_phoenixtail_page'))
    
    @app.route('/dlt/front_sum')
    def redirect_front_sum():
        return redirect(url_for('dlt_page.front_sum_page'))
    
    @app.route('/dlt/front_span')
    def redirect_front_span():
        return redirect(url_for('dlt_page.front_span_page'))
    
    @app.route('/dlt/front_acvalue')
    def redirect_front_acvalue():
        return redirect(url_for('dlt_page.front_acvalue_page'))
    
    @app.route('/dlt/front_sizeratio')
    def redirect_front_sizeratio():
        return redirect(url_for('dlt_page.front_sizeratio_page'))
    
    @app.route('/dlt/front_primeratio')
    def redirect_front_primeratio():
        return redirect(url_for('dlt_page.front_primeratio_page'))
    
    @app.route('/dlt/front_road012ratio')
    def redirect_front_road012ratio():
        return redirect(url_for('dlt_page.front_road012ratio_page'))
    
    @app.route('/dlt/front_zoneratio')
    def redirect_front_zoneratio():
        return redirect(url_for('dlt_page.front_zoneratio_page'))
    
    @app.route('/dlt/front_oddevenratio')
    def redirect_front_oddevenratio():
        return redirect(url_for('dlt_page.front_oddevenratio_page'))
    
    @app.route('/dlt/front_consecutive')
    def redirect_front_consecutive():
        return redirect(url_for('dlt_page.front_consecutive_page'))
    
    @app.route('/dlt/front_sametail')
    def redirect_front_sametail():
        return redirect(url_for('dlt_page.front_sametail_page'))
    
    @app.route('/dlt/front_coldwarmhotratio')
    def redirect_front_coldwarmhotratio():
        return redirect(url_for('dlt_page.front_coldwarmhotratio_page'))
    
    @app.route('/dlt/front_repeat')
    def redirect_front_repeat():
        return redirect(url_for('dlt_page.front_repeat_page'))
    
    @app.route('/dlt/front_adjacent')
    def redirect_front_adjacent():
        return redirect(url_for('dlt_page.front_adjacent_page'))
    
    @app.route('/dlt/back_dragonhead')
    def redirect_back_dragonhead():
        return redirect(url_for('dlt_page.back_dragonhead_page'))
    
    @app.route('/dlt/back_phoenixtail')
    def redirect_back_phoenixtail():
        return redirect(url_for('dlt_page.back_phoenixtail_page'))
    
    @app.route('/dlt/back_sum')
    def redirect_back_sum():
        return redirect(url_for('dlt_page.back_sum_page'))
    
    @app.route('/dlt/back_span')
    def redirect_back_span():
        return redirect(url_for('dlt_page.back_span_page'))
    
    @app.route('/dlt/back_sizeratio')
    def redirect_back_sizeratio():
        return redirect(url_for('dlt_page.back_sizeratio_page'))
    
    @app.route('/dlt/back_primeratio')
    def redirect_back_primeratio():
        return redirect(url_for('dlt_page.back_primeratio_page'))
    
    @app.route('/dlt/backt_road012ratio')
    def redirect_back_road012ratio():
        return redirect(url_for('dlt_page.back_road012ratio_page'))
    
    @app.route('/dlt/back_zoneratio')
    def redirect_back_zoneratio():
        return redirect(url_for('dlt_page.back_zoneratio_page'))
    
    @app.route('/dlt/back_oddevenratio')
    def redirect_back_oddevenratio():
        return redirect(url_for('dlt_page.back_oddevenratio_page'))
    
    @app.route('/dlt/back_coldwarmhotratio')
    def redirect_back_coldwarmhotratio():
        return redirect(url_for('dlt_page.back_coldwarmhotratio_page'))
    
    @app.route('/dlt/back_repeat')
    def redirect_back_repeat():
        return redirect(url_for('dlt_page.back_repeat_page'))
    
    @app.route('/dlt/back_adjacent')
    def redirect_back_adjacent():
        return redirect(url_for('dlt_page.back_adjacent_page'))

    # ========== 基本路由 ==========
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/ssq')
    def ssq_home():
        return redirect(url_for('ssq_page.red_basic_trend_page'))
    
    @app.route('/dlt')
    def dlt_home():
        return redirect(url_for('dlt_page.front_basic_trend_page'))
    
    # API路由
    @app.route('/api/ssq/trend')
    def ssq_trend_api():
        data = get_ssq_trend_data(app.ssq_data) if app.ssq_data is not None else []
        return jsonify(data)
    
    @app.route('/api/dlt/trend')
    def dlt_trend_api():
        data = get_dlt_trend_data(app.dlt_data) if app.dlt_data is not None else []
        return jsonify(data)
    
    @app.route('/api/ssq/missed/<int:ball_number>')
    def ssq_missed_api(ball_number):
        """获取双色球号码遗漏数据"""
        ball_type = request.args.get('type', 'red')
        current_index = request.args.get('index', 0, type=int)
        
        if ball_type not in ['red', 'blue']:
            return jsonify({'error': '无效的球类型'}), 400
        
        missed = calculate_ssq_missed_periods(ball_number, ball_type, current_index)
        status = get_ball_status_by_missed(missed)
        
        return jsonify({
            'ball_number': ball_number,
            'ball_type': ball_type,
            'missed_periods': missed,
            'status': status,
            'status_zh': '热' if status == 'hot' else '温' if status == 'warm' else '冷'
        })
    
    @app.route('/api/dlt/missed/<int:ball_number>')
    def dlt_missed_api(ball_number):
        """获取大乐透号码遗漏数据"""
        ball_type = request.args.get('type', 'front')
        current_index = request.args.get('index', 0, type=int)
        
        if ball_type not in ['front', 'back']:
            return jsonify({'error': '无效的球类型'}), 400
        
        missed = calculate_dlt_missed_periods(ball_number, ball_type, current_index)
        status = get_ball_status_by_missed(missed)
        
        return jsonify({
            'ball_number': ball_number,
            'ball_type': ball_type,
            'missed_periods': missed,
            'status': status,
            'status_zh': '热' if status == 'hot' else '温' if status == 'warm' else '冷'
        })
    
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'data_loaded': {
                'ssq': app.ssq_data is not None,
                'dlt': app.dlt_data is not None
            }
        })
    
    @app.route('/debug/routes')
    def debug_routes():
        """显示所有注册的路由"""
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods),
                    'path': str(rule)
                })
        
        html = """
        <!DOCTYPE html>
        <html>
        <head><title>路由调试</title></head>
        <body>
            <h1>已注册的路由</h1>
            <table border="1" cellpadding="5">
                <tr><th>路径</th><th>端点</th><th>方法</th></tr>
        """
        
        for route in sorted(routes, key=lambda x: x['path']):
            html += f"""
                <tr>
                    <td>{route['path']}</td>
                    <td>{route['endpoint']}</td>
                    <td>{','.join(route['methods'])}</td>
                </tr>
            """
        
        html += """
            </table>
        </body>
        </html>
        """
        
        return html
    
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('error.html', error='页面未找到'), 404
    
    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('error.html', error='服务器内部错误'), 500
    
    return app

# ========== 数据加载函数 ==========
def load_ssq_data(csv_path):
    """加载双色球数据"""
    if not os.path.exists(csv_path):
        print(f"警告: 双色球数据文件不存在: {csv_path}")
        return None
    
    try:
        df = pd.read_csv(csv_path)
        if len(df.columns) >= 8:
            df.columns = ['issue', 'red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']
        else:
            print(f"警告: CSV文件列数不足，尝试使用前{len(df.columns)}列")
            columns = ['issue', 'red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']
            df.columns = columns[:len(df.columns)]
        
        for col in ['red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
        
        df = df.sort_values('issue', ascending=True).reset_index(drop=True)
        print(f"成功加载双色球数据: {len(df)} 期")
        return df
    except Exception as e:
        print(f"加载双色球数据失败: {e}")
        return None

def load_dlt_data(csv_path):
    """加载大乐透数据"""
    if not os.path.exists(csv_path):
        print(f"警告: 大乐透数据文件不存在: {csv_path}")
        return None
    
    try:
        df = pd.read_csv(csv_path)
        if len(df.columns) >= 8:
            df.columns = ['issue', 'front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']
        else:
            print(f"警告: CSV文件列数不足，尝试使用前{len(df.columns)}列")
            columns = ['issue', 'front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']
            df.columns = columns[:len(df.columns)]
        
        for col in ['front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
        
        df = df.sort_values('issue', ascending=True).reset_index(drop=True)
        print(f"成功加载大乐透数据: {len(df)} 期")
        return df
    except Exception as e:
        print(f"加载大乐透数据失败: {e}")
        return None

def get_ssq_trend_data(df):
    """获取双色球走势数据"""
    if df is None or len(df) == 0:
        return []
    
    data = []
    for i, row in df.iterrows():
        red_balls = [int(row['red1']), int(row['red2']), int(row['red3']), 
                     int(row['red4']), int(row['red5']), int(row['red6'])]
        
        numbers = {}
        for num in range(1, 34):
            numbers[str(num).zfill(2)] = num in red_balls
        
        data.append({
            'issue': str(row['issue']),
            'numbers': numbers,
            'blue': int(row['blue']),
            'red_balls': red_balls
        })
    
    return data

def get_dlt_trend_data(df):
    """获取大乐透走势数据"""
    if df is None or len(df) == 0:
        return []
    
    data = []
    for i, row in df.iterrows():
        front_balls = [int(row['front1']), int(row['front2']), int(row['front3']), 
                      int(row['front4']), int(row['front5'])]
        back_balls = [int(row['back1']), int(row['back2'])]
        
        data.append({
            'issue': str(row['issue']),
            'front_balls': front_balls,
            'back_balls': back_balls
        })
    
    return data

def get_available_port(start_port=5000, end_port=5050):
    """获取可用的端口"""
    for port in range(start_port, end_port + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                s.bind(('0.0.0.0', port))
                return port
        except OSError:
            continue
    
    return start_port

# ========== 创建应用实例（Vercel 需要这个）==========
app = create_app()

# ========== Vercel 服务器less函数入口 ==========
def handler(request, context):
    """Vercel Serverless函数入口"""
    return app(request.environ, request.start_response) if hasattr(request, 'environ') else app

# ========== 本地运行入口 ==========
if __name__ == '__main__':
    # 检查数据目录
    data_dir = app.config.get('DATA_DIR')
    if data_dir and not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)
        print(f"创建数据目录: {data_dir}")
    
    print("=" * 50)
    print("彩票分析系统启动中...")
    print(f"数据目录: {data_dir}")
    print(f"双色球数据: {app.config.get('SSQ_DATA_PATH')}")
    print(f"大乐透数据: {app.config.get('DLT_DATA_PATH')}")
    print("=" * 50)
    
    if app.ssq_data is None:
        print("警告: 双色球数据加载失败，相关功能可能不可用")
    else:
        print(f"双色球数据已加载: {len(app.ssq_data)} 期")
    
    if app.dlt_data is None:
        print("警告: 大乐透数据加载失败，相关功能可能不可用")
    else:
        print(f"大乐透数据已加载: {len(app.dlt_data)} 期")
    
    default_port = 5005
    try:
        env_port = os.getenv('PORT')
        if env_port and env_port.isdigit():
            port = int(env_port)
        elif len(sys.argv) > 1 and sys.argv[1].isdigit():
            port = int(sys.argv[1])
        else:
            port = get_available_port(default_port, default_port + 10)
    except (ValueError, IndexError):
        port = default_port
    
    print(f"\n启动服务...")
    print(f"访问地址: http://127.0.0.1:{port}")
    print(f"         http://localhost:{port}")
    print("按 Ctrl+C 停止应用")
    print("=" * 50)
    
    try:
        app.run(
            host='0.0.0.0',
            port=port,
            debug=app.config.get('DEBUG', True)
        )
    except OSError as e:
        if "Address already in use" in str(e):
            new_port = get_available_port(port + 1, port + 20)
            print(f"\n端口 {port} 被占用，尝试端口 {new_port}...")
            app.run(
                host='0.0.0.0',
                port=new_port,
                debug=app.config.get('DEBUG', True)
            )
        else:
            raise