// Cloudflare Worker 入口文件
// 转发请求到 functions/api/parse.js

import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/api/parse.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 只处理 /api/parse 路径
    if (url.pathname === '/api/parse') {
      if (request.method === 'POST') {
        return onRequestPost({ request, env, ctx });
      } else if (request.method === 'GET') {
        return onRequestGet({ request, env, ctx });
      } else if (request.method === 'OPTIONS') {
        return onRequestOptions();
      }
    }
    
    // 其他路径返回 404
    return new Response(JSON.stringify({
      success: false,
      message: 'Not Found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
