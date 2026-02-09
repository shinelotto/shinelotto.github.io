import json
from typing import Dict, List, Any
import math

class ChartUtils:
    """图表工具类"""
    
    @staticmethod
    def create_basic_trend_chart_data(trend_data: List[Dict]) -> Dict[str, Any]:
        """创建基本走势图数据"""
        chart_data = {
            "issues": [],
            "numbers": [],
            "statistics": []
        }
        
        for item in trend_data:
            chart_data["issues"].append(item.get("issue", ""))
            
            # 处理红球/前区号码
            if "red_balls" in item:
                chart_data["numbers"].append({
                    "type": "red",
                    "values": item["red_balls"]
                })
            elif "front_balls" in item:
                chart_data["numbers"].append({
                    "type": "front",
                    "values": item["front_balls"]
                })
            
            # 处理蓝球号码
            if "blue_ball" in item:
                chart_data["numbers"].append({
                    "type": "blue",
                    "values": item["blue_ball"]
                })
            
            # 处理后区号码
            if "back_balls" in item:
                chart_data["numbers"].append({
                    "type": "back",
                    "values": item["back_balls"]
                })
            
            # 添加统计信息
            stats = {}
            for key in ['sum_value', 'span', 'ac_value', 'size_ratio', 'prime_ratio', 
                       'road012_ratio', 'zone_ratio', 'odd_even_ratio']:
                if key in item:
                    stats[key] = item[key]
            
            chart_data["statistics"].append(stats)
        
        return chart_data
    
    @staticmethod
    def create_line_chart_data(trends: List[Dict], x_key: str, y_key: str) -> Dict[str, Any]:
        """创建折线图数据"""
        x_data = []
        y_data = []
        
        for item in trends:
            if x_key in item and y_key in item:
                x_data.append(item[x_key])
                y_data.append(item[y_key])
        
        return {
            "x_data": x_data,
            "y_data": y_data
        }
    
    @staticmethod
    def format_number_display(number: int, total_digits: int = 2) -> str:
        """格式化数字显示"""
        return str(number).zfill(total_digits)
    
    @staticmethod
    def get_color_by_number(number: int, lottery_type: str = "ssq") -> str:
        """根据号码获取颜色"""
        if lottery_type == "ssq":
            if 1 <= number <= 33:
                return "#e74c3c"  # 红色
            elif 1 <= number <= 16:
                return "#3498db"  # 蓝色
        elif lottery_type == "dlt":
            if 1 <= number <= 35:
                return "#e74c3c"  # 红色
            elif 1 <= number <= 12:
                return "#3498db"  # 蓝色
        
        return "#95a5a6"  # 默认灰色
    
    @staticmethod
    def get_size_ratio_color(ratio: str) -> str:
        """获取大小比颜色"""
        try:
            big, small = map(int, ratio.split(':'))
            total = big + small
            if big / total > 0.6:
                return "#e74c3c"  # 红色，大数多
            elif small / total > 0.6:
                return "#3498db"  # 蓝色，小数多
            else:
                return "#2ecc71"  # 绿色，均衡
        except:
            return "#95a5a6"
    
    @staticmethod
    def get_prime_ratio_color(ratio: str) -> str:
        """获取质合比颜色"""
        try:
            prime, composite = map(int, ratio.split(':'))
            total = prime + composite
            if prime / total > 0.6:
                return "#e74c3c"  # 红色，质数多
            elif composite / total > 0.6:
                return "#3498db"  # 蓝色，合数多
            else:
                return "#2ecc71"  # 绿色，均衡
        except:
            return "#95a5a6"