# api/index.py - Vercel Serverless Functions 专用入口
import sys
import os

# 将项目根目录添加到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 导入 Flask 应用
from app import app

# Vercel Serverless Functions 要求导出 app 对象
# 这个文件将被 Vercel 自动识别为 Serverless Function 入口
handler = app