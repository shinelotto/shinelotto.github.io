# api/index.py - Vercel Serverless Functions 专用入口
import os
import sys
import traceback

# ========== 路径修复 ==========
# 确保正确解析到项目根目录
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

# ========== 安全导入 Flask 应用 ==========
try:
    from app import app
    print("✅ 成功导入 Flask 应用")
except ImportError as e:
    print(f"❌ 导入错误: {str(e)}")
    print(traceback.format_exc())
    # 创建空应用防止崩溃
    from flask import Flask
    app = Flask(__name__)
    @app.route('/')
    def fallback():
        return "应用配置错误，请检查日志", 500

# ========== Vercel 适配器 ==========
def handler(event, context):
    """
    Vercel Serverless Function 标准入口
    参数:
        event: 包含请求信息的字典
        context: 运行时上下文对象
    返回:
        Flask 响应对象
    """
    try:
        return app(event, context)
    except Exception as e:
        print(f"⚠️ Handler执行错误: {str(e)}")
        return {
            'statusCode': 500,
            'body': 'Internal Server Error'
        }

# ========== 备用导出方案 ==========
# 某些 Vercel 版本需要直接导出 app 对象
application = app