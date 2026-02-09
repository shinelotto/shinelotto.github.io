from .base import BaseLotteryModel
import pandas as pd
from typing import Dict, List, Any, Tuple
import numpy as np
from datetime import datetime

class SSQModel(BaseLotteryModel):
    """双色球数据模型"""
    
    def _preprocess_data(self):
        """预处理双色球数据"""
        # 重命名列
        self.data.columns = ['issue', 'red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']
        
        # 转换为整数
        for col in ['red1', 'red2', 'red3', 'red4', 'red5', 'red6', 'blue']:
            self.data[col] = pd.to_numeric(self.data[col], errors='coerce').fillna(0).astype(int)
        
        # 按期号排序
        self.data = self.data.sort_values('issue', ascending=True).reset_index(drop=True)
    
    def get_basic_trend(self) -> Dict[str, Any]:
        """获取双色球基本走势数据"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            red_balls = [row[f'red{i}'] for i in range(1, 7)]
            blue_ball = row['blue']
            
            stats = self._calculate_statistics(red_balls, 33)
            
            # 红球区间划分 (1-11, 12-22, 23-33)
            zones = [(1, 11), (12, 22), (23, 33)]
            zone_ratio = self._get_zone_ratio(red_balls, zones)
            
            result.append({
                'issue': row['issue'],
                'red_balls': red_balls,
                'blue_ball': blue_ball,
                'dragon_head': min(red_balls) if red_balls else 0,
                'phoenix_tail': max(red_balls) if red_balls else 0,
                'sum_value': stats.get('sum_value', 0),
                'span': stats.get('span', 0),
                'ac_value': stats.get('ac_value', 0),
                'size_ratio': stats.get('size_ratio', '0:0'),
                'prime_ratio': stats.get('prime_ratio', '0:0'),
                'road012_ratio': stats.get('road012_ratio', '0:0:0'),
                'zone_ratio': zone_ratio,
                'odd_even_ratio': stats.get('odd_even_ratio', '0:0')
                
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_red_basic_trend(self) -> Dict[str, Any]:
        """获取红球基本走势（对应截图3格式）"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            red_balls = [row[f'red{i}'] for i in range(1, 7)]
            result.append({
                'issue': row['issue'],
                'numbers': {str(i).zfill(2): (i in red_balls) for i in range(1, 34)},
                'blue': row['blue'],
                'red_balls': red_balls
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_blue_basic_trend(self) -> Dict[str, Any]:
        """获取蓝球基本走势（对应截图4格式）"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            blue_ball = row['blue']
            
            # 计算振幅
            amplitude = 0
            if len(result) > 0:
                prev_blue = result[-1]['blue']
                amplitude = abs(blue_ball - prev_blue)
            
            # 大小
            size = "大" if blue_ball > 8 else "小"
            
            # 质合
            prime_numbers = {1, 2, 3, 5, 7, 11, 13}
            prime_type = "质" if blue_ball in prime_numbers else "合"
            
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
            
            result.append({
                'issue': row['issue'],
                'blue': blue_ball,
                'amplitude': amplitude,
                'size': size,
                'prime_type': prime_type,
                'road012': road012,
                'zone': zone,
                'odd_even': odd_even,
                'cold_warm_hot': "热号"  # 简化处理，实际应根据历史出现频率计算
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_distribution_chart_data(self, chart_type: str) -> Dict[str, Any]:
        """获取分布图数据（对应截图2格式）"""
        # 这里返回模拟数据，实际应根据不同类型返回相应的分布数据
        if chart_type == "ac_value":
            return self._get_ac_distribution()
        elif chart_type == "sum":
            return self._get_sum_distribution()
        elif chart_type == "span":
            return self._get_span_distribution()
        else:
            return self._get_general_distribution(chart_type)
    
    def _get_ac_distribution(self) -> Dict[str, Any]:
        """获取AC值分布数据"""
        ac_values = []
        for _, row in self.data.head(100).iterrows():
            red_balls = [row[f'red{i}'] for i in range(1, 7)]
            ac_value = self._calculate_ac_value(red_balls)
            ac_values.append(ac_value)
        
        # 统计频率
        from collections import Counter
        freq = Counter(ac_values)
        
        nodes = []
        links = []
        
        for i, (ac_value, count) in enumerate(freq.most_common(10)):
            nodes.append({
                "id": f"node_{i}",
                "name": f"AC{ac_value}",
                "value": count,
                "category": 0
            })
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    def _get_sum_distribution(self) -> Dict[str, Any]:
        """获取和值分布数据"""
        sum_values = []
        for _, row in self.data.head(100).iterrows():
            red_balls = [row[f'red{i}'] for i in range(1, 7)]
            sum_values.append(sum(red_balls))
        
        from collections import Counter
        freq = Counter(sum_values)
        
        nodes = []
        
        for i, (sum_val, count) in enumerate(freq.most_common(15)):
            nodes.append({
                "id": f"node_{i}",
                "name": str(sum_val),
                "value": count,
                "category": 1
            })
        
        return {
            "nodes": nodes,
            "links": []
        }
    
    def _get_span_distribution(self) -> Dict[str, Any]:
        """获取跨度分布数据"""
        spans = []
        for _, row in self.data.head(100).iterrows():
            red_balls = [row[f'red{i}'] for i in range(1, 7)]
            if red_balls:
                spans.append(max(red_balls) - min(red_balls))
        
        from collections import Counter
        freq = Counter(spans)
        
        nodes = []
        
        for i, (span, count) in enumerate(freq.most_common(10)):
            nodes.append({
                "id": f"node_{i}",
                "name": str(span),
                "value": count,
                "category": 2
            })
        
        return {
            "nodes": nodes,
            "links": []
        }
    
    def _get_general_distribution(self, chart_type: str) -> Dict[str, Any]:
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