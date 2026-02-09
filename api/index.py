# api/index.py - Vercel Serverless Functions 专用入口
import os
import sys
import traceback

# ========== 路径修复 ==========
# 确保正确解析到项目根目录
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'blueprints'))
sys.path.insert(0, os.path.join(current_dir, 'utils'))

# ========== 安全导入 Flask 应用 ==========
try:
    from app import app
    print("✅ 成功导入 Flask 应用")
    
    # 创建符合 Vercel 规范的 WSGI 应用
    from vercel_wsgi import handle
    handler = handle(app)
    
except ImportError as e:
    print(f"❌ 导入错误: {str(e)}")
    print(traceback.format_exc())
    
    # 创建简单的回退应用
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def fallback():
        return "应用配置错误，请检查日志", 500
    
    # 简单 handler
    def handler(event, context):
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'text/plain'},
            'body': 'Fallback handler'
        }

# 备用导出
application = handler if 'handler' in locals() else None