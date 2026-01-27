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

let profileData = {};
let customProducts = {};

// Load saved settings and custom products
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['customProducts', 'selectedProduct', 'selectedTone', 'selectedCta']);

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
    valueProps,
    socialProof: socialProof || null
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
        tone: document.getElementById('tone').value,
        cta: document.getElementById('cta').value,
        addThis: document.getElementById('addThis').value
      });
    } catch (e) {
      // Content script not ready, ignore
    }
  }
}

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
function buildPrompt(productKey, title, tone, cta, format) {
  const product = getProductData(productKey);
  if (!product) return null;

  const detectedPersona = detectPersona(title);
  const toneInstructions = TONE_INSTRUCTIONS[tone];

  const formatInstructions = format === 'dm'
    ? 'Write a LinkedIn DM (under 280 characters)'
    : 'Write a cold email (under 100 words)';

  const ctaInstruction = cta
    ? `End with this CTA: "${cta}"`
    : 'End with a soft CTA like asking if worth exploring';

  return `${formatInstructions} to a ${detectedPersona} about ${product.name}.

About ${product.name}: ${product.oneliner}

Key value: ${product.valueProps}

${product.socialProof ? `Social proof: ${product.socialProof}` : ''}

${ctaInstruction}

Tone: ${toneInstructions}

Rules:
- ${format === 'dm' ? 'Under 280 characters total' : 'Under 100 words'}
- No dashes, no emojis, no exclamation marks
- Sound human, like texting a colleague you met at a conference
- Reference their specific role/company naturally
- Do not make up metrics or claims
- Do not be salesy or pushy`;
}

// Generate DM
document.getElementById('generateBtn').addEventListener('click', async () => {
  const productKey = document.getElementById('product').value;
  const tone = document.getElementById('tone').value;
  const cta = document.getElementById('cta').value;
  const format = document.getElementById('format').value;
  const output = document.getElementById('output');
  const message = document.getElementById('message');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');

  if (!profileData.name) {
    message.innerHTML = '<div class="error">Could not read profile data</div>';
    return;
  }

  const systemPrompt = buildPrompt(productKey, profileData.title, tone, cta, format);
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
  const userPrompt = `Write a DM for:

Name: ${profileData.name}
Title: ${profileData.title || 'Unknown'}
Company: ${profileData.company || 'Unknown'}
${profileData.about ? `About: ${profileData.about.substring(0, 200)}` : ''}
${addThis ? `\nContext to weave in: ${addThis}` : ''}

Start with "Hey ${profileData.name.split(' ')[0]}," - keep it natural and brief.`;

  try {
    const response = await fetch('https://dm-buddy-api.vercel.app/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
