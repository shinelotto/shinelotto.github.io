"""
缓存工具模块
如果flask_caching不可用，使用简易缓存替代
"""

try:
    from flask_caching import Cache
    cache = Cache()
    
    def cached(timeout=300, key_prefix='view_'):
        """缓存装饰器 - 使用flask_caching"""
        from functools import wraps
        import hashlib
        import json
        
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                cache_key = key_prefix + hashlib.md5(
                    (f.__name__ + json.dumps(args, sort_keys=True) + 
                     json.dumps(kwargs, sort_keys=True)).encode('utf-8')
                ).hexdigest()
                
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                result = f(*args, **kwargs)
                cache.set(cache_key, result, timeout=timeout)
                return result
            return decorated_function
        return decorator
    
except ImportError:
    # 如果flask_caching不可用，使用简易内存缓存
    print("警告: flask_caching 未安装，使用简易内存缓存")
    
    class SimpleCache:
        def __init__(self):
            self._cache = {}
        
        def get(self, key):
            return self._cache.get(key)
        
        def set(self, key, value, timeout=None):
            self._cache[key] = value
        
        def delete(self, key):
            if key in self._cache:
                del self._cache[key]
        
        def clear(self):
            self._cache.clear()
        
        def delete_pattern(self, pattern):
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
    
    cache = SimpleCache()
    
    def cached(timeout=300, key_prefix='view_'):
        """简易缓存装饰器"""
        from functools import wraps
        import hashlib
        import json
        import time
        
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                cache_key = key_prefix + hashlib.md5(
                    (f.__name__ + json.dumps(args, sort_keys=True) + 
                     json.dumps(kwargs, sort_keys=True)).encode('utf-8')
                ).hexdigest()
                
                # 检查缓存
                cached_data = cache.get(cache_key)
                if cached_data and cached_data.get('expiry', 0) > time.time():
                    return cached_data['value']
                
                # 执行函数
                result = f(*args, **kwargs)
                
                # 缓存结果
                cache.set(cache_key, {
                    'value': result,
                    'expiry': time.time() + timeout
                })
                
                return result
            return decorated_function
        return decorator

def clear_cache(pattern=None):
    """清除缓存"""
    if pattern:
        cache.delete_pattern(pattern)
    else:
        cache.clear()