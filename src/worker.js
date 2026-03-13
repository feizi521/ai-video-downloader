import { parseHandler } from '../functions/api/parse.js';
import { downloadHandler } from '../functions/api/download.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        try {
            if (path === '/api/parse') {
                if (request.method === 'POST') {
                    return await parseHandler({ request, env, ctx });
                }
                return jsonResponse({ success: false, message: '请使用 POST 方法' }, 405, corsHeaders);
            }

            if (path === '/api/download') {
                if (request.method === 'GET') {
                    return await downloadHandler({ request, env, ctx });
                }
                return jsonResponse({ success: false, message: '请使用 GET 方法' }, 405, corsHeaders);
            }

            if (path === '/api/health') {
                return jsonResponse({ status: 'ok', message: '服务正常运行' }, 200, corsHeaders);
            }

            return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ success: false, message: '服务器错误: ' + error.message }, 500, corsHeaders);
        }
    }
};

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
}
