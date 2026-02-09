# api/index.py - Vercel Serverless Functions 专用入口
import os
import sys
import json
import traceback
from io import BytesIO

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def handle(wsgi_app):
    """手动实现的 Vercel 适配器"""
    def handler(event, context):
        # 解析 Vercel 事件
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        headers = event.get('headers', {})
        body = event.get('body', '')
        query_params = event.get('queryStringParameters', {})
        
        # 构建 WSGI 环境
        environ = {
            'REQUEST_METHOD': method,
            'SCRIPT_NAME': '',
            'PATH_INFO': path,
            'QUERY_STRING': '&'.join([f'{k}={v}' for k, v in query_params.items()]),
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': '80',
            'HTTP_HOST': headers.get('host', 'localhost'),
            'wsgi.version': (1, 0),
            'wsgi.url_scheme': 'https' if headers.get('x-forwarded-proto') == 'https' else 'http',
            'wsgi.input': BytesIO(body.encode() if body else b''),
            'wsgi.errors': sys.stderr,
            'wsgi.multithread': False,
            'wsgi.multiprocess': True,
            'wsgi.run_once': False,
        }
        
        # 添加 HTTP 头
        for key, value in headers.items():
            environ[f'HTTP_{key.upper().replace("-", "_")}'] = value
        
        # 响应变量
        response_status = [None]
        response_headers = []
        
        def start_response(status, headers):
            response_status[0] = status
            response_headers[:] = headers
        
        # 执行 WSGI 应用
        result = wsgi_app(environ, start_response)
        body_chunks = []
        for chunk in result:
            if isinstance(chunk, bytes):
                body_chunks.append(chunk)
            else:
                body_chunks.append(chunk.encode('utf-8'))
        
        body = b''.join(body_chunks)
        
        # 构建 Vercel 响应
        return {
            'statusCode': int(response_status[0].split()[0]),
            'headers': dict(response_headers),
            'body': body.decode('utf-8')
        }
    
    return handler

# ========== 导入 Flask 应用 ==========
try:
    from app import app
    print("✅ 成功导入 Flask 应用")
    
    # 使用手动适配器
    handler = handle(app.wsgi_app)
    
except ImportError as e:
    print(f"❌ 导入错误: {str(e)}")
    print(traceback.format_exc())
    
    # 创建简单的回退应用
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def fallback():
        return "应用配置错误，请检查日志", 500
    
    handler = handle(app.wsgi_app)

# 备用导出
application = handler