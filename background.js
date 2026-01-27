// Background script to handle API calls

// Product presets (same as popup.js)
const PRODUCT_PRESETS = {
  v0: {
    name: 'v0',
    oneliner: "Vercel's AI-powered tool that lets anyone build and ship web apps through conversation",
    valueProps: {
      sales_leader: 'Build custom landing pages, quote pages, and personalized demos for prospects without needing engineering',
      marketing_leader: 'Ship landing pages without waiting on engineering, update and publish instantly',
      engineering_leader: 'Unblock marketing and product teams without breaking prod, everything still goes through PR review',
      design_leader: 'Build in real React code instead of static mockups, ship through PR review',
      data_leader: 'Build dashboards and internal tools without engineering dependency',
      security_leader: 'Visibility into AI tools teams use, deployment protections, enterprise infrastructure'
    },
    socialProof: {
      sales_leader: 'Teams at Stripe and Notion use v0',
      marketing_leader: 'Teams at Stripe and Pinterest use v0',
      engineering_leader: 'Teams at Stripe and Notion use v0',
      design_leader: 'Teams at Vercel and Pinterest use v0',
      data_leader: 'Teams at Notion and Zapier use v0',
      security_leader: 'Notion and Stripe both passed security review'
    }
  },
  vercel: {
    name: 'Vercel',
    oneliner: 'The complete platform to build the web - stop configuring, start innovating',
    valueProps: {
      sales_leader: '90% time saved on infrastructure, 6x faster shipping, zero-config deployments',
      marketing_leader: 'Ship landing pages instantly, A/B testing built-in, global edge network for speed',
      engineering_leader: '90% time saved managing infrastructure, zero-downtime deployments, Git-integrated workflow',
      design_leader: 'See changes instantly with preview deployments, collaborate with real URLs',
      data_leader: 'Real-time analytics, global edge network, 99.99% uptime SLA',
      security_leader: 'SOC 2 Type 2 certified, GDPR compliant, DDoS protection, WAF included'
    },
    socialProof: {
      default: 'Used by Washington Post, Stripe, Under Armour, and Johnson & Johnson'
    }
  },
  vercel_ai: {
    name: 'Vercel AI',
    oneliner: 'Deploy AI at the speed of frontend - unified gateway for multiple AI providers',
    valueProps: {
      sales_leader: 'Build AI-powered demos and tools in hours, not weeks',
      marketing_leader: 'Launch AI features without engineering bottlenecks',
      engineering_leader: 'AI Gateway unifies OpenAI, Anthropic, Cohere - one endpoint, any model. Up to 95% lower cost with active CPU pricing',
      design_leader: 'Prototype AI experiences rapidly, ship to production same day',
      data_leader: 'Unified AI endpoint, usage analytics, cost optimization across providers',
      security_leader: 'Single point of control for AI access, audit logs, enterprise compliance'
    },
    socialProof: {
      default: 'Leonardo.AI cut build times from 10 min to 2 min. Used by Suno, Pika, Scale AI'
    }
  },
  vercel_sandbox: {
    name: 'Vercel Sandbox',
    oneliner: 'The safest way to run code you didn\'t write - secure execution for AI agents and customer scripts',
    valueProps: {
      sales_leader: 'Let customers run custom scripts safely, unlock new use cases',
      marketing_leader: 'Enable interactive demos with real code execution',
      engineering_leader: 'Firecracker microVMs isolate untrusted code, blocks access to env vars and databases. Up to 95% lower cost',
      design_leader: 'Build interactive prototypes with real code execution',
      data_leader: 'Run customer data transformations safely, Node.js and Python support',
      security_leader: 'Isolated execution environment, blocks network access, prevents privilege escalation'
    },
    socialProof: {
      default: 'Used by Xata for AI workflows, Cua AI for computer-use agents'
    }
  },
  nextjs: {
    name: 'Next.js on Vercel',
    oneliner: 'The native Next.js platform, built by the creators of Next.js and React',
    valueProps: {
      sales_leader: '6x faster shipping means faster time to market for your sales tools',
      marketing_leader: 'Zero-config deploy - push to Git, live globally in seconds. Edge Middleware for A/B tests',
      engineering_leader: '6x faster shipping, zero-downtime deploys, SSG/SSR/ISR all optimized out of the box',
      design_leader: 'Instant preview deployments for every PR, collaborate with real URLs',
      data_leader: 'Built-in analytics, ISR for always-fresh data, global edge caching',
      security_leader: 'Automatic HTTPS, DDoS mitigation, WAF, created by the Next.js team'
    },
    socialProof: {
      default: 'Used by Washington Post, Stripe, Wayfair, Under Armour, Unity'
    }
  }
};

// Tone modifiers for prompts
const TONE_INSTRUCTIONS = {
  relaxed: 'Use a casual, laid-back tone. Write like you\'re texting a friend. Short sentences. No corporate speak.',
  friendly: 'Use a warm, approachable tone. Be personable but still professional. Show genuine interest.',
  professional: 'Use a polished, business-appropriate tone. Be direct and respect their time. No fluff.'
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateDM') {
    generateDM(request.profileData, request.product, request.persona, request.tone, request.cta, request.addThis)
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
function buildPrompt(product, persona, tone, cta) {
  const valueProps = product.valueProps[persona] || product.valueProps.default || Object.values(product.valueProps)[0];
  const socialProof = product.socialProof ? (product.socialProof[persona] || product.socialProof.default) : '';
  const toneInstructions = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.relaxed;

  const ctaInstruction = cta
    ? `CTA: ${cta}`
    : 'Soft CTA: Ask if worth exploring';

  return `Write a LinkedIn DM (under 280 characters) for a ${persona.replace('_', ' ')} about ${product.name}.

${product.name} is ${product.oneliner}.

Structure:
1. Brief hook relevant to their role
${socialProof ? `2. Social proof: ${socialProof}` : ''}
${socialProof ? '3' : '2'}. Value: ${valueProps}
${socialProof ? '4' : '3'}. ${ctaInstruction}

Tone: ${toneInstructions}

Rules:
- Under 280 characters total
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics or claims`;
}

async function generateDM(profileData, productKey, persona, tone, cta, addThis) {
  const stored = await chrome.storage.local.get(['claudeApiKey']);
  const apiKey = stored.claudeApiKey;

  if (!apiKey) {
    throw new Error('API key not set. Open the extension popup to set it.');
  }

  // Get product data
  const product = await getProductData(productKey || 'v0');
  const systemPrompt = buildPrompt(product, persona || 'sales_leader', tone || 'relaxed', cta);

  // Build personalization hints
  const personalizationHints = [];
  if (profileData.isNewInRole) {
    personalizationHints.push(`They're NEW in this role (${profileData.timeInRole}) - consider a "congrats on the new role" opener`);
  }
  if (profileData.mutualConnections) {
    personalizationHints.push(`You have ${profileData.mutualConnections} mutual connection(s) - consider mentioning this`);
  }

  const userPrompt = `Write a LinkedIn DM for this person:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
Time in role: ${profileData.timeInRole || 'Unknown'}
About: ${profileData.about || 'Unknown'}
${personalizationHints.length > 0 ? `\nPersonalization opportunities:\n- ${personalizationHints.join('\n- ')}` : ''}
${addThis ? `\nAdditional context to incorporate: ${addThis}` : ''}

Start with "Hey ${profileData.name.split(' ')[0]}," - keep it to 2 sentences max, under 280 characters. Sound human, like texting a colleague.`;

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
