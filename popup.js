// Product presets
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

let profileData = {};
let customProducts = {};

// Load saved settings and custom products
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['claudeApiKey', 'customProducts', 'selectedProduct', 'selectedTone', 'selectedCta']);

  // API key
  if (stored.claudeApiKey) {
    document.getElementById('apiKey').value = stored.claudeApiKey;
    document.getElementById('apiKeySection').classList.add('hidden');
    document.getElementById('apiKeySet').classList.remove('hidden');
  }

  // Custom products
  if (stored.customProducts) {
    customProducts = stored.customProducts;
    renderCustomProducts();
  }

  // Restore selections
  if (stored.selectedProduct) {
    document.getElementById('product').value = stored.selectedProduct;
  }
  if (stored.selectedTone) {
    document.getElementById('tone').value = stored.selectedTone;
  }
  if (stored.selectedCta) {
    document.getElementById('cta').value = stored.selectedCta;
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

// Render custom products in dropdown
function renderCustomProducts() {
  const group = document.getElementById('customProductsGroup');
  group.innerHTML = '';

  Object.keys(customProducts).forEach(key => {
    const option = document.createElement('option');
    option.value = `custom_${key}`;
    option.textContent = customProducts[key].name;
    group.appendChild(option);
  });
}

// Handle product dropdown change
document.getElementById('product').addEventListener('change', async (e) => {
  const value = e.target.value;

  if (value === '__add_new__') {
    document.getElementById('customProductForm').classList.remove('hidden');
    // Reset to previous selection
    const stored = await chrome.storage.local.get(['selectedProduct']);
    if (stored.selectedProduct && stored.selectedProduct !== '__add_new__') {
      e.target.value = stored.selectedProduct;
    } else {
      e.target.value = 'v0';
    }
  } else {
    document.getElementById('customProductForm').classList.add('hidden');
    await chrome.storage.local.set({ selectedProduct: value });
    syncSettings();
  }
});

// Save custom product
document.getElementById('saveCustomProduct').addEventListener('click', async () => {
  const name = document.getElementById('customProductName').value.trim();
  const oneliner = document.getElementById('customProductOneliner').value.trim();
  const valueProps = document.getElementById('customProductValue').value.trim();
  const socialProof = document.getElementById('customProductProof').value.trim();

  if (!name || !oneliner || !valueProps) {
    alert('Please fill in product name, one-liner, and value props');
    return;
  }

  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  customProducts[key] = {
    name,
    oneliner,
    valueProps: { default: valueProps },
    socialProof: socialProof ? { default: socialProof } : null
  };

  await chrome.storage.local.set({ customProducts });
  renderCustomProducts();

  // Select the new product
  document.getElementById('product').value = `custom_${key}`;
  await chrome.storage.local.set({ selectedProduct: `custom_${key}` });

  // Clear and hide form
  document.getElementById('customProductName').value = '';
  document.getElementById('customProductOneliner').value = '';
  document.getElementById('customProductValue').value = '';
  document.getElementById('customProductProof').value = '';
  document.getElementById('customProductForm').classList.add('hidden');

  syncSettings();
});

// Cancel custom product
document.getElementById('cancelCustomProduct').addEventListener('click', () => {
  document.getElementById('customProductForm').classList.add('hidden');
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

// Save tone selection
document.getElementById('tone').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ selectedTone: e.target.value });
  syncSettings();
});

// Save CTA
document.getElementById('cta').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ selectedCta: e.target.value });
  syncSettings();
});

// Sync settings with content script
async function syncSettings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url.includes('linkedin.com')) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        product: document.getElementById('product').value,
        persona: document.getElementById('persona').value,
        tone: document.getElementById('tone').value,
        cta: document.getElementById('cta').value,
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

// Get product data (preset or custom)
function getProductData(productKey) {
  if (productKey.startsWith('custom_')) {
    const customKey = productKey.replace('custom_', '');
    return customProducts[customKey];
  }
  return PRODUCT_PRESETS[productKey];
}

// Build dynamic prompt
function buildPrompt(productKey, persona, tone, cta, format) {
  const product = getProductData(productKey);
  if (!product) return null;

  const valueProps = product.valueProps[persona] || product.valueProps.default || Object.values(product.valueProps)[0];
  const socialProof = product.socialProof ? (product.socialProof[persona] || product.socialProof.default) : '';
  const toneInstructions = TONE_INSTRUCTIONS[tone];

  const formatInstructions = format === 'dm'
    ? 'Write a LinkedIn DM (under 280 characters)'
    : 'Write a cold email (under 100 words)';

  const ctaInstruction = cta
    ? `CTA: ${cta}`
    : 'Soft CTA: Ask if worth exploring';

  return `${formatInstructions} for a ${persona.replace('_', ' ')} about ${product.name}.

${product.name} is ${product.oneliner}.

Structure:
1. Brief hook relevant to their role
${socialProof ? `2. Social proof: ${socialProof}` : ''}
${socialProof ? '3' : '2'}. Value: ${valueProps}
${socialProof ? '4' : '3'}. ${ctaInstruction}

Tone: ${toneInstructions}

Rules:
- ${format === 'dm' ? 'Under 280 characters total' : 'Under 100 words'}
- No dashes, no emojis
- Conversational, not salesy
- Do not make up metrics or claims`;
}

// Generate DM
document.getElementById('generateBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value;
  const productKey = document.getElementById('product').value;
  const persona = document.getElementById('persona').value;
  const tone = document.getElementById('tone').value;
  const cta = document.getElementById('cta').value;
  const format = document.getElementById('format').value;
  const output = document.getElementById('output');
  const message = document.getElementById('message');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');

  if (!apiKey) {
    message.innerHTML = '<div class="error">Please enter your Gateway key</div>';
    return;
  }

  if (!profileData.name) {
    message.innerHTML = '<div class="error">Could not read profile data</div>';
    return;
  }

  const systemPrompt = buildPrompt(productKey, persona, tone, cta, format);
  if (!systemPrompt) {
    message.innerHTML = '<div class="error">Invalid product selected</div>';
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  output.value = 'Generating personalized DM...';
  output.classList.add('placeholder');
  message.innerHTML = '';

  const addThis = document.getElementById('addThis').value.trim();
  const userPrompt = `Write a LinkedIn DM for this person:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
Headline: ${profileData.headline || 'Unknown'}
${addThis ? `\nAdditional context to incorporate: ${addThis}` : ''}

Start the message with "Hey ${profileData.name.split(' ')[0]}," and keep it to 2-3 sentences.`;

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
