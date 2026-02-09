# api/index.py - Vercel Serverless Functions 专用入口
import os
import sys
from vercel_wsgi import handle  

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    from app import app
    print("✅ 成功导入 Flask 应用")
    
    # 使用 Vercel 官方适配器
    handler = handle(app)
    
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    # 创建简单回退
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def fallback():
        return "应用配置错误", 500
    
    handler = handle(app)  # 仍然使用适配器

# 备用导出
application = handler