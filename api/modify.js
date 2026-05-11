// Vercel serverless function — proxies user prompts to DeepSeek.
// Returns SAFE JSON parameters (not code) describing how to render the 3D art.
// Set DEEPSEEK_API_KEY in Vercel project env vars.

export const config = { runtime: 'edge' };

const SYSTEM = `你是 3D 视觉参数生成器。根据用户的简短描述（中文或英文，<= 80 字），返回一个 JSON 对象描述用 Three.js 渲染的形态参数。

严格只返回 JSON（不带 markdown 包装），字段约束：
{
  "geo": "icosahedron" | "torusKnot" | "octahedron" | "dodecahedron" | "tetrahedron",
  "subdivision": 0-3,
  "p": 2-7,           // torusKnot 参数 p
  "q": 2-7,           // torusKnot 参数 q
  "fx": 0.5-3.0,      // 噪声 x 频率
  "fy": 0.5-3.0,      // 噪声 y 频率
  "amp": 0.1-0.8,     // 噪声振幅
  "rotSpeed": 0-0.2,  // 旋转速度
  "edgeAngle": 0-30   // EdgesGeometry 角度阈值
}

例：
- 「失重」→ {"geo":"icosahedron","subdivision":3,"fx":0.8,"fy":0.6,"amp":0.6,"rotSpeed":0.05,"edgeAngle":12}
- 「锐利」→ {"geo":"octahedron","subdivision":0,"fx":1,"fy":1,"amp":0.1,"rotSpeed":0.12,"edgeAngle":1}
- 「水流」→ {"geo":"torusKnot","p":3,"q":5,"fx":1.5,"fy":1.5,"amp":0.4,"rotSpeed":0.08,"edgeAngle":20}`;

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'no key' }), { status: 500, headers: { 'content-type': 'application/json' } });
  let prompt = '';
  try {
    const body = await req.json();
    prompt = String(body.prompt || '').trim().slice(0, 120);
  } catch { return new Response('bad body', { status: 400 }); }
  if (!prompt) return new Response(JSON.stringify({ error: 'empty prompt' }), { status: 400 });

  try {
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'upstream', code: r.status }), { status: 502, headers: { 'content-type': 'application/json' } });
    const j = await r.json();
    let raw = (j.choices?.[0]?.message?.content || '').trim();
    // Strip any code fence just in case
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: 'parse', raw }), { status: 502, headers: { 'content-type': 'application/json' } }); }
    // Validate / clamp
    const ALLOWED = ['icosahedron','torusKnot','octahedron','dodecahedron','tetrahedron'];
    const clean = {
      geo: ALLOWED.includes(parsed.geo) ? parsed.geo : 'icosahedron',
      subdivision: Math.max(0, Math.min(3, Number(parsed.subdivision) || 2)),
      p: Math.max(2, Math.min(7, Number(parsed.p) || 3)),
      q: Math.max(2, Math.min(7, Number(parsed.q) || 5)),
      fx: Math.max(0.3, Math.min(4, Number(parsed.fx) || 1.5)),
      fy: Math.max(0.3, Math.min(4, Number(parsed.fy) || 1.2)),
      amp: Math.max(0.05, Math.min(1, Number(parsed.amp) || 0.4)),
      rotSpeed: Math.max(0, Math.min(0.3, Number(parsed.rotSpeed) || 0.06)),
      edgeAngle: Math.max(0, Math.min(45, Number(parsed.edgeAngle) || 18)),
    };
    return new Response(JSON.stringify(clean), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
