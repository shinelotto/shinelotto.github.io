import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import json
from datetime import datetime
from collections import defaultdict, Counter

class DataProcessor:
    """数据处理工具类"""
    
    @staticmethod
    def calculate_frequency(data: pd.DataFrame, ball_columns: List[str]) -> Dict[int, int]:
        """计算号码出现频率"""
        frequency = defaultdict(int)
        
        for col in ball_columns:
            if col in data.columns:
                for num in data[col]:
                    if pd.notna(num):
                        frequency[int(num)] += 1
        
        return dict(frequency)
    
    @staticmethod
    def calculate_missed_values(data: pd.DataFrame, ball_columns: List[str], max_number: int) -> List[Dict[int, int]]:
        """
        计算每期的遗漏值矩阵
        按照从当前期往前查找的逻辑
        
        Args:
            data: 包含开奖数据的DataFrame，按时间顺序排列（旧期在前，新期在后）
            ball_columns: 号码列名列表
            max_number: 最大号码数
            
        Returns:
            每期的遗漏值矩阵，格式为[{号码: 遗漏值}, ...]
            其中索引0表示第一期，索引-1表示最新一期
        """
        if data.empty:
            return []
        
        # 获取开奖号码列表
        winning_numbers = []
        for _, row in data.iterrows():
            issue_numbers = []
            for col in ball_columns:
                if col in data.columns and pd.notna(row[col]):
                    try:
                        issue_numbers.append(int(row[col]))
                    except (ValueError, TypeError):
                        continue
            winning_numbers.append(issue_numbers)
        
        data_count = len(winning_numbers)
        missed_values_matrix = []
        
        # 对于每一期，计算每个号码的遗漏值
        for current_index in range(data_count):
            row_missed = {}
            
            # 计算每个号码的遗漏值
            for num in range(1, max_number + 1):
                found = False
                last_seen_index = -1  # 从未出现过
                
                # 从当前期往前查找（向更早期查找）
                for search_index in range(current_index, -1, -1):
                    if num in winning_numbers[search_index]:
                        # 找到最近一次出现
                        last_seen_index = search_index
                        found = True
                        break
                
                if found:
                    # 计算遗漏值 = 当前期索引 - 找到期索引
                    row_missed[num] = current_index - last_seen_index
                else:
                    # 从未出现过，设为18
                    row_missed[num] = 18
            
            missed_values_matrix.append(row_missed)
        
        return missed_values_matrix
    
    @staticmethod
    def get_cold_warm_hot_status(missed_periods: int) -> str:
        """
        根据遗漏期数计算冷温热状态
        
        Args:
            missed_periods: 遗漏期数
            
        Returns:
            状态字符串: "热号"、"温号" 或 "冷号"
        """
        if missed_periods < 4:
            return "热号"
        elif missed_periods <= 16:
            return "温号"
        else:
            return "冷号"
    
    @staticmethod
    def calculate_cold_warm_hot(data: pd.DataFrame, ball_columns: List[str], max_number: int) -> Dict[int, str]:
        """
        计算冷温热号 - 兼容旧接口
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            max_number: 最大号码数
            
        Returns:
            冷温热状态字典
        """
        if data.empty:
            return {}
        
        # 计算最新一期的遗漏值矩阵
        missed_values_matrix = DataProcessor.calculate_missed_values(data, ball_columns, max_number)
        if not missed_values_matrix:
            return {}
        
        # 获取最新一期的遗漏值
        latest_missed = missed_values_matrix[-1]
        
        # 计算冷温热状态
        status_map = {}
        for num, missed in latest_missed.items():
            status_map[num] = DataProcessor.get_cold_warm_hot_status(missed)
        
        return status_map
    
    @staticmethod
    def calculate_cold_warm_hot_matrix(data: pd.DataFrame, ball_columns: List[str], max_number: int) -> List[Dict[int, str]]:
        """
        计算每期的冷温热状态矩阵
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            max_number: 最大号码数
            
        Returns:
            每期的冷温热状态矩阵
        """
        if data.empty:
            return []
        
        # 计算遗漏值矩阵
        missed_values_matrix = DataProcessor.calculate_missed_values(data, ball_columns, max_number)
        
        # 转换为冷温热状态矩阵
        status_matrix = []
        for missed_row in missed_values_matrix:
            status_row = {}
            for num, missed in missed_row.items():
                status_row[num] = DataProcessor.get_cold_warm_hot_status(missed)
            status_matrix.append(status_row)
        
        return status_matrix
    
    @staticmethod
    def calculate_omission(data: pd.DataFrame, ball_columns: List[str], max_number: int) -> Dict[int, int]:
        """
        计算遗漏值 - 兼容旧接口
        返回最新一期的遗漏值
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            max_number: 最大号码数
            
        Returns:
            最新一期的遗漏值字典
        """
        if data.empty:
            return {}
        
        # 计算遗漏值矩阵
        missed_values_matrix = DataProcessor.calculate_missed_values(data, ball_columns, max_number)
        if not missed_values_matrix:
            return {}
        
        # 返回最新一期的遗漏值
        return missed_values_matrix[-1]
    
    @staticmethod
    def get_missed_periods_for_number(data: pd.DataFrame, ball_columns: List[str], number: int) -> int:
        """
        计算单个号码在当前数据集中最新一期的遗漏期数
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            number: 要查询的号码
            
        Returns:
            遗漏期数，如果从未出现过返回18
        """
        if data.empty:
            return 18
        
        # 获取开奖号码列表
        winning_numbers = []
        for _, row in data.iterrows():
            issue_numbers = []
            for col in ball_columns:
                if col in data.columns and pd.notna(row[col]):
                    try:
                        issue_numbers.append(int(row[col]))
                    except (ValueError, TypeError):
                        continue
            winning_numbers.append(issue_numbers)
        
        data_count = len(winning_numbers)
        
        # 从最新一期开始往前查找
        for search_index in range(data_count - 1, -1, -1):
            if number in winning_numbers[search_index]:
                # 找到最近一次出现的期数
                return (data_count - 1) - search_index
        
        # 从未出现过
        return 18
    
    @staticmethod
    def analyze_consecutive_numbers(data: pd.DataFrame, ball_columns: List[str]) -> List[List[int]]:
        """分析连号"""
        consecutive_groups = []
        
        for _, row in data.iterrows():
            numbers = []
            for col in ball_columns:
                if col in data.columns and pd.notna(row[col]):
                    numbers.append(int(row[col]))
            
            numbers.sort()
            
            consecutive = []
            current_group = []
            
            for i in range(len(numbers)):
                if not current_group:
                    current_group.append(numbers[i])
                elif numbers[i] == current_group[-1] + 1:
                    current_group.append(numbers[i])
                else:
                    if len(current_group) >= 2:
                        consecutive.append(current_group.copy())
                    current_group = [numbers[i]]
            
            if len(current_group) >= 2:
                consecutive.append(current_group)
            
            consecutive_groups.extend(consecutive)
        
        return consecutive_groups
    
    @staticmethod
    def analyze_repeat_numbers(current_numbers: List[int], prev_numbers: List[int]) -> List[int]:
        """分析重号"""
        return list(set(current_numbers) & set(prev_numbers))
    
    @staticmethod
    def analyze_adjacent_numbers(current_numbers: List[int], prev_numbers: List[int]) -> List[int]:
        """分析邻号"""
        adjacent = []
        for num in prev_numbers:
            if num - 1 in current_numbers or num + 1 in current_numbers:
                adjacent.append(num)
        return adjacent
    
    @staticmethod
    def calculate_distribution_graph_data(numbers_data: Dict[int, List[int]]) -> Dict[str, Any]:
        """生成分布图数据"""
        nodes = []
        links = []
        
        # 创建节点
        node_index = {}
        for idx, (number, occurrences) in enumerate(numbers_data.items()):
            node_id = f"node_{idx}"
            nodes.append({
                "id": node_id,
                "name": str(number),
                "value": len(occurrences),
                "category": number % 3  # 按012路分组
            })
            node_index[number] = node_id
        
        # 创建连接（基于共同出现的次数）
        connections = defaultdict(int)
        numbers_list = list(numbers_data.keys())
        
        for i in range(len(numbers_list)):
            for j in range(i + 1, len(numbers_list)):
                num1 = numbers_list[i]
                num2 = numbers_list[j]
                
                # 计算共同出现的次数
                common_count = len(set(numbers_data[num1]) & set(numbers_data[num2]))
                
                if common_count > 0:
                    connections[(num1, num2)] = common_count
        
        # 添加最强的连接
        sorted_connections = sorted(connections.items(), key=lambda x: x[1], reverse=True)[:20]
        
        for (num1, num2), weight in sorted_connections:
            if num1 in node_index and num2 in node_index:
                links.append({
                    "source": node_index[num1],
                    "target": node_index[num2],
                    "value": weight
                })
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    @staticmethod
    def calculate_basic_trend_data(data: pd.DataFrame, ball_columns: List[str], max_number: int, 
                                 include_params: bool = True) -> Dict[str, Any]:
        """
        计算基本走势图数据
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            max_number: 最大号码数
            include_params: 是否包含参数计算
            
        Returns:
            走势图数据字典
        """
        if data.empty:
            return {
                "issues": [],
                "winning_numbers": [],
                "missed_values": [],
                "status_matrix": [],
                "parameters": []
            }
        
        # 期号列表
        issues = data['issue'].tolist() if 'issue' in data.columns else [f"{i+1:03d}" for i in range(len(data))]
        
        # 获取开奖号码列表
        winning_numbers = []
        for _, row in data.iterrows():
            issue_numbers = []
            for col in ball_columns:
                if col in data.columns and pd.notna(row[col]):
                    try:
                        issue_numbers.append(int(row[col]))
                    except (ValueError, TypeError):
                        continue
            winning_numbers.append(issue_numbers)
        
        # 计算遗漏值矩阵
        missed_values_matrix = DataProcessor.calculate_missed_values(data, ball_columns, max_number)
        
        # 计算冷温热状态矩阵
        status_matrix = DataProcessor.calculate_cold_warm_hot_matrix(data, ball_columns, max_number)
        
        # 计算参数
        parameters = []
        if include_params:
            for i, (row, winning_nums) in enumerate(zip(data.itertuples(), winning_numbers)):
                params = {}
                
                # 龙头（最小值）
                if winning_nums:
                    params['龙头'] = min(winning_nums)
                
                # 凤尾（最大值）
                if winning_nums:
                    params['凤尾'] = max(winning_nums)
                
                # 和值
                params['和值'] = sum(winning_nums) if winning_nums else 0
                
                # 跨度
                if winning_nums:
                    params['跨度'] = max(winning_nums) - min(winning_nums)
                else:
                    params['跨度'] = 0
                
                # 冷温热比
                if status_matrix and i < len(status_matrix):
                    status_row = status_matrix[i]
                    cold_count = sum(1 for s in status_row.values() if s == "冷号")
                    warm_count = sum(1 for s in status_row.values() if s == "温号")
                    hot_count = sum(1 for s in status_row.values() if s == "热号")
                    params['冷温热比'] = f"{cold_count}:{warm_count}:{hot_count}"
                
                parameters.append(params)
        
        return {
            "issues": issues,
            "winning_numbers": winning_numbers,
            "missed_values": missed_values_matrix,
            "status_matrix": status_matrix,
            "parameters": parameters
        }
    
    @staticmethod
    def get_missed_periods_for_selection(data: pd.DataFrame, ball_columns: List[str], 
                                       selected_numbers: List[int]) -> Dict[int, int]:
        """
        计算选中号码的最新遗漏期数
        
        Args:
            data: 包含开奖数据的DataFrame
            ball_columns: 号码列名列表
            selected_numbers: 选中的号码列表
            
        Returns:
            每个选中号码的遗漏期数字典
        """
        result = {}
        for num in selected_numbers:
            result[num] = DataProcessor.get_missed_periods_for_number(data, ball_columns, num)
        return result