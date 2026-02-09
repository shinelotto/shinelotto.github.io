# app.py - 最小化 Flask 应用
from flask import Flask, jsonify, render_template
import pandas as pd
import os

app = Flask(__name__)

# 加载数据
def load_data():
    try:
        ssq_data = pd.read_csv('data/ssq/ssqhistory.csv') if os.path.exists('data/ssq/ssqhistory.csv') else None
        dlt_data = pd.read_csv('data/dlt/dlthistory.csv') if os.path.exists('data/dlt/dlthistory.csv') else None
        return ssq_data, dlt_data
    except:
        return None, None

ssq_data, dlt_data = load_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'data_loaded': {
            'ssq': ssq_data is not None,
            'dlt': dlt_data is not None
        }
    })

@app.route('/ssq')
def ssq_home():
    return "双色球分析页面"

@app.route('/dlt')
def dlt_home():
    return "大乐透分析页面"

if __name__ == '__main__':
    app.run(debug=True)