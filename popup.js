// DM prompts by persona type
const DM_PROMPTS = {
  sales_leader_dm: `Write a LinkedIn DM (under 280 characters) for a sales leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: Teams at Stripe and Brex use v0
3. Value: Build custom landing pages, quote pages, and personalized demos for prospects without needing engineering
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  sales_leader_email: `Write a cold email (under 100 words) for a sales leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: Teams at Stripe and Brex use v0
4. Value: Build custom landing pages, quote pages, and personalized demos for prospects without needing engineering
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  marketing_leader_dm: `Write a LinkedIn DM (under 280 characters) for a marketing leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: Teams at Stripe and Pinterest use v0
3. Value: Ship landing pages without waiting on engineering, update and publish instantly
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  marketing_leader_email: `Write a cold email (under 100 words) for a marketing leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: Teams at Stripe and Pinterest use v0
4. Value: Ship landing pages without waiting on engineering, update and publish instantly, full git integration for dev review when needed
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  engineering_leader_dm: `Write a LinkedIn DM (under 280 characters) for an engineering leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: Teams at Stripe and Brex use v0
3. Value: Unblock marketing and product teams without breaking prod, everything still goes through PR review
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  engineering_leader_email: `Write a cold email (under 100 words) for an engineering leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: Teams at Stripe and Brex use v0
4. Value: Unblock marketing and product teams without breaking prod, full git integration, same CI/CD process, reduces one-off requests while keeping control
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  design_leader_dm: `Write a LinkedIn DM (under 280 characters) for a design leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: Teams at Vercel and Pinterest use v0
3. Value: Build in real React code instead of static mockups, ship through PR review
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  design_leader_email: `Write a cold email (under 100 words) for a design leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: Teams at Vercel and Pinterest use v0
4. Value: Build in real React code instead of static mockups, refine against production, ship through PR review
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  data_leader_dm: `Write a LinkedIn DM (under 280 characters) for a data/ops leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: Teams at Brex and Zapier use v0
3. Value: Build dashboards and internal tools without engineering dependency, secure Snowflake integration
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  data_leader_email: `Write a cold email (under 100 words) for a data/ops leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: Teams at Brex and Zapier use v0
4. Value: Build dashboards and internal tools without engineering dependency, secure Snowflake integration, enterprise controls
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  security_leader_dm: `Write a LinkedIn DM (under 280 characters) for a security leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Brief hook relevant to their role
2. Social proof: BitGo and Brex both passed security review
3. Value: Visibility into AI tools teams use, deployment protections, enterprise infrastructure
4. Soft CTA: Ask if worth exploring

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`,

  security_leader_email: `Write a cold email (under 100 words) for a security leader about v0.

v0 is Vercel's AI-powered tool that lets anyone build and ship web apps through conversation.

Structure:
1. Question hook relevant to their role
2. One sentence: What v0 is
3. Social proof: BitGo and Brex both passed security review
4. Value: Visibility into what apps teams build with AI tools, deployment protections that block unsafe changes, enterprise infrastructure
5. Soft CTA

Rules:
- Under 100 words
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics`
};

let profileData = {};

// Load saved API key
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['claudeApiKey']);
  if (stored.claudeApiKey) {
    document.getElementById('apiKey').value = stored.claudeApiKey;
    // Hide the input, show "saved" status
    document.getElementById('apiKeySection').classList.add('hidden');
    document.getElementById('apiKeySet').classList.remove('hidden');
  }

  // Get profile data from current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('linkedin.com')) {
    document.getElementById('profileInfo').innerHTML = '<p>Please navigate to a LinkedIn profile</p>';
    document.getElementById('generateBtn').disabled = true;
    return;
  }

  // Check if on list/search page
  const isListPage = tab.url.includes('/sales/search') ||
                     tab.url.includes('/sales/lists') ||
                     tab.url.includes('/sales/accounts');
  if (isListPage) {
    document.getElementById('profileInfo').innerHTML = `
      <p style="margin:0;"><strong>List View Detected</strong></p>
      <p style="margin:8px 0 0 0;font-size:12px;color:#666;">
        Use the floating "Generate All Visible" button on the page to batch generate DMs.<br><br>
        If you don't see it, refresh the LinkedIn page.
      </p>
    `;
    document.getElementById('generateBtn').disabled = true;
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProfileData' });
    profileData = response;

    document.getElementById('profileName').textContent = profileData.name || 'Not found';
    document.getElementById('profileTitle').textContent = profileData.title || 'Not found';
    document.getElementById('profileCompany').textContent = profileData.company || 'Not found';
  } catch (error) {
    document.getElementById('profileInfo').innerHTML = '<p>Could not read profile. Try refreshing the LinkedIn page.</p>';
    document.getElementById('generateBtn').disabled = true;
  }
});

// Save API key when changed
document.getElementById('apiKey').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ claudeApiKey: e.target.value });
  if (e.target.value) {
    document.getElementById('apiKeySection').classList.add('hidden');
    document.getElementById('apiKeySet').classList.remove('hidden');
  }
});

// Show API key input when "change" is clicked
document.getElementById('changeKeyBtn').addEventListener('click', () => {
  document.getElementById('apiKeySection').classList.remove('hidden');
  document.getElementById('apiKeySet').classList.add('hidden');
  document.getElementById('apiKey').focus();
});

// Sync settings with content script
async function syncSettings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url.includes('linkedin.com')) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        persona: document.getElementById('persona').value,
        addThis: document.getElementById('addThis').value
      });
    } catch (e) {
      // Content script not ready, ignore
    }
  }
}

document.getElementById('persona').addEventListener('change', syncSettings);
document.getElementById('addThis').addEventListener('change', syncSettings);
document.getElementById('addThis').addEventListener('input', syncSettings);

// Generate DM
document.getElementById('generateBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value;
  const persona = document.getElementById('persona').value;
  const format = document.getElementById('format').value;
  const promptKey = `${persona}_${format}`;
  const output = document.getElementById('output');
  const message = document.getElementById('message');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');

  if (!apiKey) {
    message.innerHTML = '<div class="error">Please enter your Claude API key</div>';
    return;
  }

  if (!profileData.name) {
    message.innerHTML = '<div class="error">Could not read profile data</div>';
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  output.value = 'Generating personalized DM...';
  output.classList.add('placeholder');
  message.innerHTML = '';

  const systemPrompt = DM_PROMPTS[promptKey];
  const addThis = document.getElementById('addThis').value.trim();
  const userPrompt = `Write a LinkedIn DM for this person:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
Headline: ${profileData.headline || 'Unknown'}
${addThis ? `\nAdditional context to incorporate: ${addThis}` : ''}

Start the message with "Hey ${profileData.name.split(' ')[0]}," and keep it to 3-4 sentences.`;

  try {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: systemPrompt + '\n\n' + userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const dm = data.content[0].text;

    output.value = dm;
    output.classList.remove('placeholder');
    copyBtn.classList.remove('hidden');
    message.innerHTML = '<div class="success">Generated! Edit below if needed.</div>';
    updateCharCount();

  } catch (error) {
    message.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    output.value = 'Failed to generate DM';
  }

  generateBtn.disabled = false;
  generateBtn.textContent = 'Generate';
});

// Update character count
function updateCharCount() {
  const output = document.getElementById('output');
  const charCount = document.getElementById('charCount');
  const format = document.getElementById('format').value;
  const text = output.value;

  if (!text || text === 'Your personalized DM will appear here...' || text === 'Generating personalized DM...') {
    charCount.textContent = '';
    return;
  }

  const chars = text.length;
  const words = text.trim().split(/\s+/).length;

  if (format === 'dm') {
    charCount.textContent = `${chars} / 280 characters`;
    charCount.classList.toggle('over', chars > 280);
  } else {
    charCount.textContent = `${words} words`;
    charCount.classList.toggle('over', words > 100);
  }
}

document.getElementById('output').addEventListener('input', updateCharCount);
document.getElementById('format').addEventListener('change', updateCharCount);

// Copy to clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  const output = document.getElementById('output');
  const message = document.getElementById('message');

  try {
    await navigator.clipboard.writeText(output.value);
    message.innerHTML = '<div class="success">Copied to clipboard!</div>';
  } catch (error) {
    message.innerHTML = '<div class="error">Failed to copy</div>';
  }
});
