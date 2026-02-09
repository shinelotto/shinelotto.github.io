#!/usr/bin/env python3
"""
极简版 Flask 应用 - 测试 Vercel 基本功能
"""

from flask import Flask, jsonify
import time
import os

app = Flask(__name__)

@app.route('/')
def home():
    """主页 - 极简响应，避免任何复杂操作"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vercel 功能测试</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: green; }
            .status { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>✅ Vercel 功能测试</h1>
        <div class="status">
            <h3>应用状态：正常运行</h3>
            <p>这是一个极简测试页面，验证 Flask 应用在 Vercel 上的基本功能。</p>
            <p>当前时间：{}</p>
        </div>
        <p>
            <a href="/health">健康检查</a> | 
            <a href="/test">功能测试</a>
        </p>
    </body>
    </html>
    """.format(time.strftime('%Y-%m-%d %H:%M:%S'))

@app.route('/health')
def health():
    """健康检查 - 极简 JSON 响应"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'message': 'Vercel 基本功能测试 - 极简版',
        'environment': os.getenv('FLASK_ENV', 'production')
    })

@app.route('/test')
def test():
    """功能测试页面"""
    return """
    <h1>功能测试</h1>
    <p>如果能看到此页面，说明 Vercel 部署成功。</p>
    <p>测试项目：</p>
    <ul>
        <li>✅ Flask 应用启动</li>
        <li>✅ 路由正常工作</li>
        <li>✅ JSON API 响应</li>
        <li>✅ HTML 页面渲染</li>
    </ul>
    """

# Vercel 需要的导出
application = app

if __name__ == '__main__':
    app.run(debug=True)