/**
 * glmClient.js — Catalyst GLM-4.7-Flash API Client
 *
 * Wraps the Catalyst Generative AI endpoint for GLM-4.7-Flash (30B MoE).
 * Handles authentication, tool calling loop, and error recovery.
 *
 * Endpoint: https://api.catalyst.zoho.in/quickml/v1/project/.../glm/chat
 * Auth: Zoho-oauthtoken <access-token>
 */

'use strict';

const https = require('https');

// ─── Config ──────────────────────────────────────────────────────────────────
const GLM_ENDPOINT = 'https://api.catalyst.zoho.in/quickml/v1/project/56064000000013049/glm/chat';
const GLM_MODEL    = 'crm-di-glm47b_30b_it';
const CATALYST_ORG = '60076926826';
const MAX_ROUNDS   = 6;    // max tool-call rounds per conversation turn
const TIMEOUT_MS   = 60000;

// ─── Auth Token Extraction ────────────────────────────────────────────────────
/**
 * Tries multiple strategies to get a valid Zoho OAuth access token
 * from inside a Catalyst Serverless Function.
 */
async function getAuthToken(app, req) {
  // Strategy 1: quickml-config.json explicit token (highest priority — user-set)
  try {
    // Use readFileSync to bypass Node's module cache (so token updates take effect without restart)
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(__dirname, 'quickml-config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const t = cfg.zoho_access_token;
    if (t && t !== 'PASTE_YOUR_TOKEN_HERE' && t.length > 10) {
      console.log('[GLM Auth] Using quickml-config.json token');
      return t;
    }
  } catch (_) {}

  // Strategy 2: Environment variable (set in Catalyst Function environment config)
  const envToken = process.env.ZOHO_ACCESS_TOKEN
    || process.env.ZOHO_CATALYST_AUTH_TOKEN
    || process.env.X_CATALYST_AUTH_TOKEN;
  if (envToken && envToken.length > 10) {
    console.log('[GLM Auth] Using env var token');
    return envToken;
  }

  // Strategy 3: x-zoho-auth-user-token header injected by Catalyst runtime
  const headers = req?.headers || {};
  const fromHeader = headers['x-zoho-auth-user-token'] || headers['x-catalyst-auth-token'];
  if (fromHeader && fromHeader !== 'undefined' && fromHeader.length > 10) {
    console.log('[GLM Auth] Using request header token');
    return fromHeader;
  }

  // Strategy 4: Authorization header from browser request
  const authHeader = headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t.length > 10) { console.log('[GLM Auth] Using Bearer header'); return t; }
  }

  throw new Error(
    'GLM: No valid OAuth token found. ' +
    'Open functions/crime_api/quickml-config.json and set "zoho_access_token" to your Zoho access token.'
  );
}


// ─── HTTP Call ────────────────────────────────────────────────────────────────
function callGLMHTTP(token, messages, tools, enableThinking) {
  return new Promise((resolve, reject) => {
    const payload = {
      model: GLM_MODEL,
      messages,
      max_tokens: 1500,
      temperature: 0.2,
      stream: false,
      chat_template_kwargs: { enable_thinking: !!enableThinking },
    };
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    console.log('[GLM] Sending payload:', JSON.stringify({ ...payload, messages: `[${payload.messages.length} msgs]` }));

    const body = JSON.stringify(payload);
    const url = new URL(GLM_ENDPOINT);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${token}`,
        'CATALYST-ORG': CATALYST_ORG,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Always log the raw response for debugging
          console.log(`[GLM] HTTP ${res.statusCode} — raw:`, JSON.stringify(parsed).slice(0, 600));

          if (res.statusCode >= 400) {
            const msg = parsed?.message || parsed?.error || JSON.stringify(parsed).slice(0, 200);
            reject(new Error(`GLM API ${res.statusCode}: ${msg}`));
            return;
          }

          // ── Normalize Catalyst GLM format → OpenAI-compatible format ──────
          // Catalyst GLM returns: { response, tool_calls, usage, model, created_time }
          // Standard OpenAI:     { choices: [{ message: { content, tool_calls }, finish_reason }] }
          if (!parsed.choices && (parsed.response !== undefined || parsed.tool_calls)) {
            const toolCalls = parsed.tool_calls || [];
            parsed.choices = [{
              index: 0,
              message: {
                role: 'assistant',
                content: parsed.response || '',
                tool_calls: toolCalls,
              },
              finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
            }];
            console.log(`[GLM] Normalized Catalyst format → ${parsed.choices[0].finish_reason}, tools: [${toolCalls.map(t => t.function?.name).join(', ')}]`);
          }

          resolve(parsed);
        } catch (e) {
          console.log(`[GLM] HTTP ${res.statusCode} — raw text:`, data.slice(0, 400));
          reject(new Error(`GLM parse error (status ${res.statusCode}): ${data.slice(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`GLM timeout after ${TIMEOUT_MS / 1000}s`));
    });
    req.write(body);
    req.end();
  });
}

// ─── Tool Calling Loop ────────────────────────────────────────────────────────
/**
 * Run a full GLM conversation with multi-turn tool calling.
 *
 * @param {object}   app          - Catalyst SDK app instance
 * @param {object}   httpReq      - Express request (for auth)
 * @param {Array}    messages     - [{role, content}, ...] including system + history + user
 * @param {Array}    tools        - GLM tool definitions
 * @param {Function} executeTool  - async (name, args) => { glmResult, uiData }
 * @returns {{ text, toolCalls, uiAccumulator }}
 */
async function runConversation(app, httpReq, messages, tools, executeTool) {
  const token = await getAuthToken(app, httpReq);

  const conversation = [...messages];
  const uiAccumulator = { results: [], chartData: [], sources: [], predictions: [] };
  const allToolCalls = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Send tools only on the FIRST round (when no data has been fetched yet).
    // After any tool call, send NO tools so GLM writes prose instead of calling more tools.
    const roundTools = allToolCalls.length === 0 ? tools : [];
    console.log(`[GLM] Round ${round + 1}/${MAX_ROUNDS} — ${conversation.length} messages, tools: ${roundTools.length > 0 ? roundTools.length : 'none'}`);

    const response = await callGLMHTTP(token, conversation, roundTools, false);
    const choice = response?.choices?.[0];
    if (!choice) throw new Error('GLM returned no choices');

    const { finish_reason, message } = choice;
    const assistantContent = message?.content || '';
    const assistantToolCalls = message?.tool_calls || [];

    // ── No tool calls → this is the final prose answer ────────────────────
    if (finish_reason !== 'tool_calls' || assistantToolCalls.length === 0) {
      console.log(`[GLM] Final answer in round ${round + 1}`);
      return { text: assistantContent, toolCalls: allToolCalls, uiAccumulator };
    }

    // ── Execute each tool call ─────────────────────────────────────────────
    const resultLines = [];
    for (const tc of assistantToolCalls) {
      const name = tc.function?.name || '';
      let args = {};
      try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}

      console.log(`[GLM] Calling tool: ${name}(${JSON.stringify(args)})`);
      allToolCalls.push({ name, args });

      let glmResult;
      try {
        const { glmResult: r, uiData } = await executeTool(name, args);
        glmResult = r;
        // Accumulate UI data for the frontend
        if (uiData?.results?.length)     uiAccumulator.results.push(...uiData.results);
        if (uiData?.chartData?.length)   uiAccumulator.chartData = uiData.chartData;
        if (uiData?.sources?.length)     uiAccumulator.sources.push(...uiData.sources);
        if (uiData?.predictions?.length) uiAccumulator.predictions.push(...uiData.predictions);
      } catch (err) {
        glmResult = { error: err.message || 'Tool failed', tool: name };
        console.error(`[GLM] Tool ${name} error:`, err.message);
      }

      resultLines.push(`### ${name} result\n\`\`\`json\n${JSON.stringify(glmResult, null, 2)}\n\`\`\``);
    }

    // ── Add assistant placeholder + tool results as a user message ─────────
    // Catalyst GLM rejects role:"tool" and tool_calls in history (EXTRA_KEY_FOUND_IN_JSON).
    // We use simple role:"assistant"/"user" pairs instead.
    const toolNameList = assistantToolCalls.map(t => t.function?.name).join(', ');
    conversation.push({
      role: 'assistant',
      content: assistantContent || `[Querying data: ${toolNameList}]`,
    });
    conversation.push({
      role: 'user',
      content: `Here are the data results from the crime database:\n\n${resultLines.join('\n\n')}\n\nBased on this data, please provide a concise, well-formatted intelligence analysis. Use markdown with **bold** numbers. Be specific and actionable.`,
    });
  }

  // Exhausted rounds — return best content so far
  const lastAssistant = [...conversation].reverse().find(m => m.role === 'assistant');
  return { text: lastAssistant?.content || 'Analysis complete.', toolCalls: allToolCalls, uiAccumulator };
}

module.exports = { runConversation, getAuthToken };
