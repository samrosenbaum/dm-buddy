// Background script to handle API calls

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
- Do not make up metrics`
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateDM') {
    generateDM(request.profileData, request.persona, request.addThis)
      .then(result => sendResponse({ success: true, dm: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function generateDM(profileData, persona, addThis) {
  const stored = await chrome.storage.local.get(['claudeApiKey']);
  const apiKey = stored.claudeApiKey;

  if (!apiKey) {
    throw new Error('API key not set. Open the extension popup to set it.');
  }

  const promptKey = `${persona}_dm`;
  const systemPrompt = DM_PROMPTS[promptKey] || DM_PROMPTS.sales_leader_dm;

  const userPrompt = `Write a LinkedIn DM for this person:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
About: ${profileData.about || 'Unknown'}
${addThis ? `\nAdditional context to incorporate: ${addThis}` : ''}

Start the message with "Hey ${profileData.name.split(' ')[0]}," and keep it under 280 characters.`;

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
  return data.content[0].text;
}
