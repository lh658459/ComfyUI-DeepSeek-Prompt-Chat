import json
import os
import re
from pathlib import Path
import aiohttp
from aiohttp import web
from server import PromptServer

SYSTEM = '''You are a collaborative image-prompt editor for the local SDXL anime checkpoint rinFlanimeIllustrious_v30. Hold a continuous conversation in the user's language, retain previous requirements and apply requested revisions. Return a JSON object with exactly two string fields: "reply" (a brief conversational explanation or clarification in Chinese) and "positive_prompt" (the complete current English image prompt, concise comma-separated visual tags, approximately 60-120 words). Example: {"reply":"已把场景改为黄昏。","positive_prompt":"anime illustration, adult traveler, sunset, warm lighting"}. Keep the latest valid prompt when answering questions; return an empty prompt if the request is too underspecified. Do not put reasoning, Markdown or negative prompts into positive_prompt. Describe what can be drawn. Never claim an image was generated: image generation requires a separate user confirmation.'''

def resolve_key():
    key = os.environ.get('DEEPSEEK_API_KEY', '').strip()
    if key:
        return key
    for path in (Path(__file__).parent / '.env', Path(__file__).parent.parent / 'llm-toolkit' / '.env'):
        if path.exists():
            for line in path.read_text(encoding='utf-8-sig').splitlines():
                name, sep, value = line.strip().partition('=')
                if sep and name.strip() == 'DEEPSEEK_API_KEY':
                    return value.strip().strip('"').strip("'")
    return ''

SYSTEM += ''' Return exactly three fields: reply, positive_prompt, and translations. This overrides the earlier two-field format. translations must be an array of objects with string fields en and zh. Split positive_prompt on commas into nonempty tags; provide one translation entry per tag in the same order. en must exactly match that English tag (trim spaces); zh is its concise Chinese translation. positive_prompt must contain English only, never Chinese or bilingual explanations. For an empty prompt return translations: [].'''

def validate_result(parsed):
    if not isinstance(parsed, dict) or not isinstance(parsed.get('reply'), str) or not isinstance(parsed.get('positive_prompt'), str):
        raise ValueError('invalid response')
    prompt = parsed['positive_prompt']
    if re.search(r'[\u3400-\u9fff]', prompt):
        raise ValueError('English prompt required')
    rows = parsed.get('translations')
    tags = [tag.strip() for tag in prompt.split(',') if tag.strip()]
    if not isinstance(rows, list) or len(rows) != len(tags):
        raise ValueError('missing translations')
    for tag, row in zip(tags, rows):
        if not isinstance(row, dict) or row.get('en') != tag or not isinstance(row.get('zh'), str) or not row['zh'].strip():
            raise ValueError('invalid translation alignment')
    return parsed

def make_payload(body):
    model = body.get('model', 'deepseek-v4-flash')
    if model not in ('deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-flash'):
        raise ValueError('请选择 Flash 或 Pro。')
    history = body.get('messages', [])
    if not isinstance(history, list) or not history or len(history) > 160:
        raise ValueError('对话为空或超过 80 轮，请新建对话。')
    messages = [{'role': 'system', 'content': SYSTEM}]
    for item in history:
        if not isinstance(item, dict) or item.get('role') not in ('user','assistant') or not isinstance(item.get('content'), str):
            raise ValueError('对话格式无效。')
        if len(item['content']) > 24000:
            raise ValueError('单条消息过长。')
        messages.append({'role': item['role'], 'content': item['content']})
    if messages[-1]['role'] != 'user':
        raise ValueError('最后一条消息必须是用户消息。')
    return {'model': model, 'messages': messages, 'thinking': {'type':'disabled'}, 'response_format': {'type':'json_object'}, 'temperature':0.7, 'max_tokens':4096, 'stream':False}

class DeepSeekPromptChat:
    @classmethod
    def INPUT_TYPES(cls):
        return {'required': {'approved_prompt': ('STRING', {'default':'', 'multiline':True}), 'confirmed': ('BOOLEAN', {'default':False})}}
    RETURN_TYPES = ('STRING',)
    RETURN_NAMES = ('已确认提示词',)
    FUNCTION = 'emit'
    CATEGORY = 'DeepSeek/对话提示词'
    def emit(self, approved_prompt, confirmed):
        if not confirmed or not approved_prompt.strip():
            raise ValueError('请先打开 DeepSeek 对话，确认提示词后再生成图片。')
        if re.search(r'[\u3400-\u9fff]', approved_prompt):
            raise ValueError('出图提示词必须为纯英文，请移除英文输入框中的中文。')
        return (approved_prompt.strip(),)

NODE_CLASS_MAPPINGS = {'DeepSeekPromptChat': DeepSeekPromptChat}
NODE_DISPLAY_NAME_MAPPINGS = {'DeepSeekPromptChat': 'DeepSeek 连续对话 · 确认后出图'}
WEB_DIRECTORY = './web'

@PromptServer.instance.routes.get('/deepseek_prompt_chat/status')
async def status(request):
    return web.json_response({'configured': bool(resolve_key())})

@PromptServer.instance.routes.post('/deepseek_prompt_chat/chat')
async def chat(request):
    try:
        body = await request.json()
        payload = make_payload(body)
    except (ValueError, TypeError, AttributeError):
        return web.json_response({'error':'对话参数无效或对话过长，请新建对话后重试。'}, status=400)
    key = str(body.get('api_key') or resolve_key()).strip()
    if not key:
        return web.json_response({'error':'请在对话窗口输入 DeepSeek 官方 API Key。'}, status=401)
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=150)) as session:
            async with session.post('https://api.deepseek.com/chat/completions', headers={'Authorization':'Bearer '+key}, json=payload, allow_redirects=False) as response:
                if response.status != 200:
                    labels = {401:'API Key 无效，请使用 DeepSeek 官方 Key。',402:'DeepSeek 账户余额不足。',429:'请求过于频繁，请稍后重试。'}
                    return web.json_response({'error':labels.get(response.status, f'DeepSeek 返回 HTTP {response.status}，请稍后重试。')}, status=502)
                result = await response.json()
        choice = result['choices'][0]
        if choice.get('finish_reason') == 'length':
            raise ValueError('truncated')
        raw = choice['message']['content']
        parsed = validate_result(json.loads(raw))
        return web.json_response({'reply':parsed['reply'], 'positive_prompt':parsed['positive_prompt'], 'translations':parsed['translations'], 'assistant_content':raw, 'model':result.get('model',payload['model'])})
    except Exception:
        return web.json_response({'error':'请求超时、连接失败或回复格式不完整。对话已保留，可重试。'}, status=502)
