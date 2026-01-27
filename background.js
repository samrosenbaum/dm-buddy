// Background script to handle API calls

// Product presets - one strong value prop per product
const PRODUCT_PRESETS = {
  v0: {
    name: 'v0',
    oneliner: "Vercel's AI-powered tool that lets anyone build and ship web apps through conversation",
    valueProps: 'Build and ship production-ready web apps without writing code. Teams use it for landing pages, internal tools, and prototypes.',
    socialProof: 'Teams at Stripe, Notion, and Zapier use v0'
  },
  vercel: {
    name: 'Vercel',
    oneliner: 'The complete platform to build the web - stop configuring, start innovating',
    valueProps: 'Teams ship 6x faster with zero-config deployments, 99.99% uptime, and a global edge network.',
    socialProof: 'Used by Washington Post, Stripe, Under Armour, and Johnson & Johnson'
  },
  vercel_ai: {
    name: 'Vercel AI',
    oneliner: 'Deploy AI at the speed of frontend - unified gateway for multiple AI providers',
    valueProps: 'One endpoint for OpenAI, Anthropic, and others. Up to 95% lower cost with usage-based pricing.',
    socialProof: 'Leonardo.AI cut build times from 10 min to 2 min. Used by Suno, Pika, Scale AI'
  },
  vercel_sandbox: {
    name: 'Vercel Sandbox',
    oneliner: 'The safest way to run code you didn\'t write - secure execution for AI agents and customer scripts',
    valueProps: 'Run untrusted code safely in isolated microVMs. Blocks access to env vars, databases, and network.',
    socialProof: 'Used by Xata and Cua AI for secure AI workflows'
  },
  nextjs: {
    name: 'Next.js on Vercel',
    oneliner: 'The native Next.js platform, built by the creators of Next.js and React',
    valueProps: 'Zero-config deploys, instant preview URLs, and automatic optimization. Built by the team that makes Next.js.',
    socialProof: 'Used by Washington Post, Stripe, Wayfair, Under Armour, Unity'
  }
};

// Tone modifiers for prompts
const TONE_INSTRUCTIONS = {
  relaxed: 'Use a casual, laid-back tone. Write like you\'re texting a friend. Short sentences. No corporate speak.',
  friendly: 'Use a warm, approachable tone. Be personable but still professional. Show genuine interest.',
  professional: 'Use a polished, business-appropriate tone. Be direct and respect their time. No fluff.'
};

// Auto-detect persona from title
function detectPersona(title) {
  if (!title) return 'leader';
  const t = title.toLowerCase();

  if (t.includes('founder') || t.includes('ceo') || t.includes('owner')) return 'founder';
  if (t.includes('cto') || t.includes('chief technology') || t.includes('vp engineering') || t.includes('head of engineering')) return 'technical leader';
  if (t.includes('ciso') || t.includes('security') || t.includes('infosec')) return 'security leader';
  if (t.includes('cio') || t.includes('chief information')) return 'IT leader';
  if (t.includes('engineer') || t.includes('developer') || t.includes('architect')) return 'engineering leader';
  if (t.includes('devops') || t.includes('platform') || t.includes('infrastructure') || t.includes('sre')) return 'platform leader';
  if (t.includes('data') || t.includes('analytics') || t.includes('bi ')) return 'data leader';
  if (t.includes('design') || t.includes('ux') || t.includes('ui') || t.includes('creative')) return 'design leader';
  if (t.includes('product')) return 'product leader';
  if (t.includes('marketing') || t.includes('cmo') || t.includes('growth')) return 'marketing leader';
  if (t.includes('sales') || t.includes('revenue') || t.includes('account')) return 'sales leader';

  return 'leader';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateDM') {
    generateDM(request.profileData, request.product, request.tone, request.cta, request.addThis)
      .then(result => sendResponse({ success: true, dm: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Get product data (preset or custom)
async function getProductData(productKey) {
  if (productKey && productKey.startsWith('custom_')) {
    const stored = await chrome.storage.local.get(['customProducts']);
    if (stored.customProducts) {
      const customKey = productKey.replace('custom_', '');
      return stored.customProducts[customKey];
    }
  }
  return PRODUCT_PRESETS[productKey] || PRODUCT_PRESETS.v0;
}

// Build dynamic prompt
function buildPrompt(product, title, tone, cta) {
  const detectedPersona = detectPersona(title);
  const toneInstructions = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.relaxed;

  const ctaInstruction = cta
    ? `End with this CTA: "${cta}"`
    : 'End with a soft CTA like asking if worth exploring';

  return `Write a LinkedIn DM (under 280 characters) to a ${detectedPersona} about ${product.name}.

About ${product.name}: ${product.oneliner}

Key value: ${product.valueProps}

${product.socialProof ? `Social proof: ${product.socialProof}` : ''}

${ctaInstruction}

Tone: ${toneInstructions}

Rules:
- Under 280 characters total
- No dashes, no emojis, no exclamation marks
- Sound human, like texting a colleague you met at a conference
- Reference their specific role/company naturally
- Do not make up metrics or claims
- Do not be salesy or pushy`;
}

async function generateDM(profileData, productKey, tone, cta, addThis) {
  const stored = await chrome.storage.local.get(['claudeApiKey']);
  const apiKey = stored.claudeApiKey;

  if (!apiKey) {
    throw new Error('API key not set. Open the extension popup to set it.');
  }

  // Get product data
  const product = await getProductData(productKey || 'v0');
  const systemPrompt = buildPrompt(product, profileData.title, tone || 'relaxed', cta);

  // Build personalization hints
  const personalizationHints = [];
  if (profileData.isNewInRole) {
    personalizationHints.push(`They're NEW in this role (${profileData.timeInRole}) - consider a "congrats on the new role" opener`);
  }
  if (profileData.mutualConnections) {
    personalizationHints.push(`You have ${profileData.mutualConnections} mutual connection(s) - consider mentioning this`);
  }

  const userPrompt = `Write a DM for:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
${profileData.timeInRole ? `Time in role: ${profileData.timeInRole}` : ''}
${profileData.about ? `About: ${profileData.about.substring(0, 200)}` : ''}
${personalizationHints.length > 0 ? `\nPersonalization opportunities:\n- ${personalizationHints.join('\n- ')}` : ''}
${addThis ? `\nContext to weave in: ${addThis}` : ''}

Start with "Hey ${profileData.name.split(' ')[0]}," - keep it natural and brief.`;

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
