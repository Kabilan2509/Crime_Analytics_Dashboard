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
const TOKEN_EXPIRY_SKEW_MS = 5 * 60 * 1000;

let oauthTokenCache = { accessToken: '', expiresAt: 0 };
let tokenRefreshPromise = null;

function getRefreshTokenConfig() {
  return {
    accountsUrl: (process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in').replace(/\/+$/, ''),
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
  };
}

function hasRefreshTokenConfig() {
  const config = getRefreshTokenConfig();
  return Boolean(config.clientId && config.clientSecret && config.refreshToken);
}

function requestRefreshedAccessToken() {
  const config = getRefreshTokenConfig();
  const missing = [];
  if (!config.clientId) missing.push('ZOHO_CLIENT_ID');
  if (!config.clientSecret) missing.push('ZOHO_CLIENT_SECRET');
  if (!config.refreshToken) missing.push('ZOHO_REFRESH_TOKEN');
  if (missing.length) {
    return Promise.reject(new Error(`GLM OAuth configuration is incomplete. Missing: ${missing.join(', ')}`));
  }

  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(`${config.accountsUrl}/oauth/v2/token`);
    } catch (_) {
      reject(new Error('GLM OAuth configuration has an invalid ZOHO_ACCOUNTS_URL.'));
      return;
    }

    const body = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }).toString();

    const request = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          reject(new Error(`GLM OAuth token refresh returned an invalid response (HTTP ${response.statusCode}).`));
          return;
        }

        if (response.statusCode >= 400 || !parsed.access_token) {
          const reason = parsed.error || parsed.error_description || 'token refresh failed';
          reject(new Error(`GLM OAuth token refresh failed (HTTP ${response.statusCode}): ${reason}`));
          return;
        }

        const expiresInSeconds = Number(parsed.expires_in) || 3600;
        oauthTokenCache = {
          accessToken: parsed.access_token,
          expiresAt: Date.now() + (expiresInSeconds * 1000),
        };
        console.log('[GLM Auth] OAuth access token refreshed successfully');
        resolve(oauthTokenCache.accessToken);
      });
    });

    request.on('error', (error) => reject(new Error(`GLM OAuth token refresh request failed: ${error.message}`)));
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy();
      reject(new Error(`GLM OAuth token refresh timed out after ${TIMEOUT_MS / 1000}s`));
    });
    request.write(body);
    request.end();
  });
}

async function getRefreshedAccessToken(forceRefresh = false) {
  if (!forceRefresh
      && oauthTokenCache.accessToken
      && Date.now() < oauthTokenCache.expiresAt - TOKEN_EXPIRY_SKEW_MS) {
    return oauthTokenCache.accessToken;
  }

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = requestRefreshedAccessToken()
      .finally(() => { tokenRefreshPromise = null; });
  }
  return tokenRefreshPromise;
}

// ─── Auth Token Extraction ────────────────────────────────────────────────────
/**
 * Tries multiple strategies to get a valid Zoho OAuth access token
 * from inside a Catalyst Serverless Function.
 */
async function getAuthToken(app, req, forceRefresh = false) {
  // Primary: obtain short-lived access tokens using the long-lived refresh token.
  if (hasRefreshTokenConfig()) {
    return getRefreshedAccessToken(forceRefresh);
  }

  const refreshConfig = getRefreshTokenConfig();
  if (refreshConfig.clientId || refreshConfig.clientSecret || refreshConfig.refreshToken) {
    return getRefreshedAccessToken(forceRefresh);
  }

  // Backward-compatible fallback for environments without refresh-token configuration.
  const envToken = process.env.ZOHO_ACCESS_TOKEN
    || process.env.ZOHO_CATALYST_AUTH_TOKEN
    || process.env.X_CATALYST_AUTH_TOKEN;
  if (envToken && !envToken.includes('ENVIRONMENT') && envToken !== 'PASTE_YOUR_TOKEN_HERE' && envToken.length > 10) {
    console.log('[GLM Auth] Using process.env.ZOHO_ACCESS_TOKEN');
    return envToken;
  }

  // x-zoho-auth-user-token header injected by Catalyst runtime
  const headers = req?.headers || {};
  const fromHeader = headers['x-zoho-auth-user-token'] || headers['x-catalyst-auth-token'];
  if (fromHeader && fromHeader !== 'undefined' && fromHeader.length > 10) {
    console.log('[GLM Auth] Using request header token');
    return fromHeader;
  }

  // Authorization Bearer header
  const authHeader = headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t.length > 10) { console.log('[GLM Auth] Using Bearer header'); return t; }
  }

  throw new Error(
    'GLM: No valid OAuth configuration found. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN in Catalyst Console.'
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
            const error = new Error(`GLM API ${res.statusCode}: ${msg}`);
            error.statusCode = res.statusCode;
            reject(error);
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
  let token = await getAuthToken(app, httpReq);

  const conversation = [...messages];
  const uiAccumulator = { results: [], chartData: [], sources: [], predictions: [] };
  const allToolCalls = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Send tools on any round where no tool has been called yet.
    // Once a tool executes, send NO tools so GLM writes prose instead of chaining more calls.
    const roundTools = allToolCalls.length === 0 ? tools : [];
    console.log(`[GLM] Round ${round + 1}/${MAX_ROUNDS} — ${conversation.length} messages, tools: ${roundTools.length > 0 ? roundTools.length : 'none (prose mode)'}`);

    let response;
    try {
      response = await callGLMHTTP(token, conversation, roundTools, false);
    } catch (error) {
      const canRefresh = hasRefreshTokenConfig();
      if (canRefresh && (error.statusCode === 401 || error.statusCode === 403)) {
        console.log(`[GLM Auth] HTTP ${error.statusCode}; refreshing the OAuth token and retrying once`);
        oauthTokenCache = { accessToken: '', expiresAt: 0 };
        token = await getAuthToken(app, httpReq, true);
        response = await callGLMHTTP(token, conversation, roundTools, false);
      } else {
        throw error;
      }
    }
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
      content: `Here are the operational facts from the Karnataka State Police crime database:

${resultLines.join('\n\n')}

STRICT RESPONSE INSTRUCTIONS — follow ALL of them:
1. Write ONLY for Senior Police Officers. Be direct, factual, and authoritative.
2. Use **bold** for: threat level, threat score, station names, case counts, and crime categories.
3. NEVER mention machine learning, algorithms, model names, GLM, QuickML, API, database, code, or technical internals.
4. If data shows "noDataFound: true", clearly state no FIRs were found for that district and suggest checking the spelling or using the daily briefing instead.
5. For threat assessments only, MANDATORY format:
   - First sentence: threat level (**HIGH/MODERATE/LOW RISK**) + score (**XX/100**) + total FIRs analyzed.
   - Then list each affected station with exact numbers: e.g. **Kalaburagi Rural PS — 12 cases, 3 heinous, 8 pending**.
   - Then list crime categories driving the risk with counts.
   - If nightCrimePercentage ≥ 30%, call for intensified night patrols (18:00–04:00).
   - End with 2-3 specific tactical directives citing actual station names and crime types.
6. For FIR list queries, present cases as a numbered list with FIR no, station, and category. Flag heinous cases with ★.
6a. For a pending-case query, report only FIRs explicitly marked pending by the tool. Do not add a risk score, risk label, or tactical directives to any FIR list query.
7. Keep the total response under 300 words. Never repeat the same point twice.`,
    });

  }

  // Exhausted rounds — return best content so far
  const lastAssistant = [...conversation].reverse().find(m => m.role === 'assistant');
  return { text: lastAssistant?.content || 'Analysis complete.', toolCalls: allToolCalls, uiAccumulator };
}

module.exports = { runConversation, getAuthToken };
