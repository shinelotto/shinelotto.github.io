from .base import BaseLotteryModel
import pandas as pd
from typing import Dict, List, Any, Tuple
import numpy as np

class DLTModel(BaseLotteryModel):
    """大乐透数据模型"""
    
    def _preprocess_data(self):
        """预处理大乐透数据"""
        # 重命名列
        self.data.columns = ['issue', 'front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']
        
        # 转换为整数
        for col in ['front1', 'front2', 'front3', 'front4', 'front5', 'back1', 'back2']:
            self.data[col] = pd.to_numeric(self.data[col], errors='coerce').fillna(0).astype(int)
        
        # 按期号排序
        self.data = self.data.sort_values('issue', ascending=True).reset_index(drop=True)
    
    def get_basic_trend(self) -> Dict[str, Any]:
        """获取大乐透基本走势数据"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            front_balls = [row[f'front{i}'] for i in range(1, 6)]
            back_balls = [row['back1'], row['back2']]
            
            # 前区统计
            front_stats = self._calculate_statistics(front_balls, 35)
            
            # 前区区间划分 (1-12, 13-24, 25-35)
            front_zones = [(1, 12), (13, 24), (25, 35)]
            front_zone_ratio = self._get_zone_ratio(front_balls, front_zones)
            
            # 后区统计
            back_stats = self._calculate_statistics(back_balls, 12)
            
            result.append({
                'issue': row['issue'],
                'front_balls': front_balls,
                'back_balls': back_balls,
                'dragon_head': min(front_balls) if front_balls else 0,
                'phoenix_tail': max(front_balls) if front_balls else 0,
                'sum_value': front_stats.get('sum_value', 0),
                'span': front_stats.get('span', 0),
                'size_ratio': front_stats.get('size_ratio', '0:0'),
                'prime_ratio': front_stats.get('prime_ratio', '0:0'),
                'road012_ratio': front_stats.get('road012_ratio', '0:0:0'),
                'zone_ratio': front_zone_ratio,
                'odd_even_ratio': front_stats.get('odd_even_ratio', '0:0'),
                'back_size_ratio': back_stats.get('size_ratio', '0:0'),
                'back_prime_ratio': back_stats.get('prime_ratio', '0:0'),
                'back_road012_ratio': back_stats.get('road012_ratio', '0:0:0'),
                'back_zone_ratio': '0:0',  # 简化处理
                'back_odd_even_ratio': back_stats.get('odd_even_ratio', '0:0')
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_front_basic_trend(self) -> Dict[str, Any]:
        """获取前区基本走势（对应截图3格式）"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            front_balls = [row[f'front{i}'] for i in range(1, 6)]
            back_balls = [row['back1'], row['back2']]
            
            result.append({
                'issue': row['issue'],
                'numbers': {str(i).zfill(2): (i in front_balls) for i in range(1, 36)},
                'front_balls': front_balls,
                'back_balls': back_balls
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_back_basic_trend(self) -> Dict[str, Any]:
        """获取后区基本走势（对应截图5格式）"""
        data = self.data.copy()
        
        result = []
        for _, row in data.iterrows():
            back_balls = [row['back1'], row['back2']]
            
            # 振幅
            amplitude1 = 0
            amplitude2 = 0
            if len(result) > 0:
                prev_back = result[-1]['back_balls']
                amplitude1 = abs(back_balls[0] - prev_back[0]) if len(prev_back) > 0 else 0
                amplitude2 = abs(back_balls[1] - prev_back[1]) if len(prev_back) > 1 else 0
            
            # 大小
            size1 = "大" if back_balls[0] > 6 else "小"
            size2 = "大" if back_balls[1] > 6 else "小"
            
            # 质合
            prime_numbers = {1, 2, 3, 5, 7, 11}
            prime_type1 = "质" if back_balls[0] in prime_numbers else "合"
            prime_type2 = "质" if back_balls[1] in prime_numbers else "合"
            
            # 012路
            road012_1 = back_balls[0] % 3
            road012_2 = back_balls[1] % 3
            
            # 区间 (1-4:一区, 5-8:二区, 9-12:三区)
            zone_map = {1: "一区", 2: "二区", 3: "三区"}
            zone1 = zone_map.get((back_balls[0] - 1) // 4 + 1, "一区")
            zone2 = zone_map.get((back_balls[1] - 1) // 4 + 1, "一区")
            
            # 奇偶
            odd_even1 = "奇" if back_balls[0] % 2 == 1 else "偶"
            odd_even2 = "奇" if back_balls[1] % 2 == 1 else "偶"
            
            result.append({
                'issue': row['issue'],
                'back_balls': back_balls,
                'amplitude': [amplitude1, amplitude2],
                'size': [size1, size2],
                'prime_type': [prime_type1, prime_type2],
                'road012': [road012_1, road012_2],
                'zone': [zone1, zone2],
                'odd_even': [odd_even1, odd_even2],
                'cold_warm_hot': ["热号", "热号"],  # 简化处理
                'repeat': 0,
                'adjacent': 0,
                'param_repeat': 0
            })
        
        return {
            'data': result,
            'total': len(result)
        }
    
    def get_distribution_chart_data(self, chart_type: str) -> Dict[str, Any]:
        """获取分布图数据"""
        if chart_type == "ac_value":
            return self._get_ac_distribution()
        elif chart_type == "sum":
            return self._get_sum_distribution()
        elif chart_type == "span":
            return self._get_span_distribution()
        else:
            return self._get_general_distribution(chart_type)
    
    def _get_ac_distribution(self) -> Dict[str, Any]:
        """获取AC值分布"""
        ac_values = []
        for _, row in self.data.head(100).iterrows():
            front_balls = [row[f'front{i}'] for i in range(1, 6)]
            ac_value = self._calculate_ac_value(front_balls)
            ac_values.append(ac_value)
        
        from collections import Counter
        freq = Counter(ac_values)
        
        nodes = []
        
        for i, (ac_value, count) in enumerate(freq.most_common(10)):
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
    
    def _get_sum_distribution(self) -> Dict[str, Any]:
        """获取和值分布"""
        sum_values = []
        for _, row in self.data.head(100).iterrows():
            front_balls = [row[f'front{i}'] for i in range(1, 6)]
            sum_values.append(sum(front_balls))
        
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
        """获取跨度分布"""
        spans = []
        for _, row in self.data.head(100).iterrows():
            front_balls = [row[f'front{i}'] for i in range(1, 6)]
            if front_balls:
                spans.append(max(front_balls) - min(front_balls))
        
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