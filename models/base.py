from abc import ABC, abstractmethod
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
import os

class BaseLotteryModel(ABC):
    """彩票模型基类"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.data = None
        self.load_data()
    
    def load_data(self):
        """加载CSV数据"""
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"数据文件不存在: {self.csv_path}")
        
        self.data = pd.read_csv(self.csv_path)
        self._preprocess_data()
    
    @abstractmethod
    def _preprocess_data(self):
        """数据预处理"""
        pass
    
    @abstractmethod
    def get_basic_trend(self, limit: int = 50) -> Dict[str, Any]:
        """获取基本走势数据"""
        pass
    
    def _calculate_statistics(self, numbers: List[int], total_balls: int) -> Dict[str, Any]:
        """计算统计指标"""
        if not numbers:
            return {}
        
        stats = {}
        
        # 大小比 (大数: 大于等于total_balls/2)
        big_count = sum(1 for n in numbers if n > total_balls / 2)
        small_count = len(numbers) - big_count
        stats['size_ratio'] = f"{big_count}:{small_count}"
        
        # 质合比
        prime_numbers = {1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31}
        prime_count = sum(1 for n in numbers if n in prime_numbers)
        composite_count = len(numbers) - prime_count
        stats['prime_ratio'] = f"{prime_count}:{composite_count}"
        
        # 012路比
        mod_counts = {0: 0, 1: 0, 2: 0}
        for n in numbers:
            mod_counts[n % 3] += 1
        stats['road012_ratio'] = f"{mod_counts[0]}:{mod_counts[1]}:{mod_counts[2]}"
        
        # 奇偶比
        odd_count = sum(1 for n in numbers if n % 2 == 1)
        even_count = len(numbers) - odd_count
        stats['odd_even_ratio'] = f"{odd_count}:{even_count}"
        
        # 和值
        stats['sum_value'] = sum(numbers)
        
        # 跨度
        stats['span'] = max(numbers) - min(numbers) if numbers else 0
        
        # AC值
        stats['ac_value'] = self._calculate_ac_value(numbers)
        
        return stats
    
    def _calculate_ac_value(self, numbers: List[int]) -> int:
        """计算AC值"""
        if len(numbers) < 2:
            return 0
        
        numbers_sorted = sorted(numbers)
        differences = set()
        
        for i in range(len(numbers_sorted)):
            for j in range(i + 1, len(numbers_sorted)):
                differences.add(abs(numbers_sorted[i] - numbers_sorted[j]))
        
        return len(differences) - (len(numbers) - 1)
    
    def _get_zone_ratio(self, numbers: List[int], zones: List[Tuple[int, int]]) -> str:
        """获取区间比"""
        zone_counts = []
        for zone_start, zone_end in zones:
            count = sum(1 for n in numbers if zone_start <= n <= zone_end)
            zone_counts.append(str(count))
        return ':'.join(zone_counts)