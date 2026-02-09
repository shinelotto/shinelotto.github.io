#!/usr/bin/env python3
"""
彩票分析系统主应用 - 优化版
"""

import time
from flask import Flask, jsonify, render_template
import pandas as pd
import os
from datetime import datetime

def create_app(config_name='default'):
    """创建Flask应用"""
    start_time = time.time()
    
    app = Flask(__name__)
    
    # ========== 数据加载优化 ==========
    def load_data():
        """加载彩票数据（延迟加载版）"""
        try:
            print("⏳ 开始加载数据...")
            ssq_data = pd.read_csv('data/ssq/ssqhistory.csv') if os.path.exists('data/ssq/ssqhistory.csv') else None
            dlt_data = pd.read_csv('data/dlt/dlthistory.csv') if os.path.exists('data/dlt/dlthistory.csv') else None
            
            if ssq_data is not None:
                ssq_data.dropna(inplace=True)
                print(f"✅ 双色球数据加载完成: {len(ssq_data)} 期")
            if dlt_data is not None:
                dlt_data.dropna(inplace=True)
                print(f"✅ 大乐透数据加载完成: {len(dlt_data)} 期")
                
            return ssq_data, dlt_data
        except Exception as e:
            print(f"❌ 数据加载失败: {str(e)}")
            return None, None

    # 初始化数据变量（延迟加载）
    app.ssq_data = None
    app.dlt_data = None
    
    def lazy_load_data():
        """按需加载数据"""
        if app.ssq_data is None or app.dlt_data is None:
            app.ssq_data, app.dlt_data = load_data()
    
    # ========== 路由定义 ==========
    @app.route('/')
    def index():
        """主页 - 触发数据加载"""
        lazy_load_data()
        return render_template('index.html',
                             ssq_count=len(app.ssq_data) if app.ssq_data is not None else 0,
                             dlt_count=len(app.dlt_data) if app.dlt_data is not None else 0)

    @app.route('/health')
    def health():
        """健康检查"""
        lazy_load_data()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'data_loaded': {
                'ssq': app.ssq_data is not None,
                'ssq_count': len(app.ssq_data) if app.ssq_data is not None else 0,
                'dlt': app.dlt_data is not None,
                'dlt_count': len(app.dlt_data) if app.dlt_data is not None else 0
            }
        })

    @app.route('/ssq')
    def ssq_home():
        """双色球主页"""
        lazy_load_data()
        return "双色球分析页面"

    @app.route('/dlt')
    def dlt_home():
        """大乐透主页"""
        lazy_load_data()
        return "大乐透分析页面"

    # ========== 启动耗时统计 ==========
    end_time = time.time()
    print(f"🎯 应用初始化耗时: {end_time - start_time:.2f} 秒 (未加载数据)")
    
    return app

# ========== 创建应用实例 ==========
app = create_app()

# ========== 本地运行入口 ==========
if __name__ == '__main__':
    print("启动本地开发服务器...")
    app.run(host='0.0.0.0', port=5000, debug=True)