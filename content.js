// v0 LinkedIn DM Writer - Content Script (Agentic Version)
console.log('[DM Buddy] Content script loaded on:', window.location.href);

let reviewQueue = [];
let completedQueue = [];
let settings = {
  product: 'v0',
  tone: 'relaxed',
  cta: '',
  addThis: ''
};

// Load queues from storage
async function loadQueues() {
  const stored = await chrome.storage.local.get(['v0_reviewQueue', 'v0_completedQueue']);
  if (stored.v0_reviewQueue) {
    reviewQueue = stored.v0_reviewQueue;
  }
  if (stored.v0_completedQueue) {
    completedQueue = stored.v0_completedQueue;
  }
  updateQueueCount();
}

// Save queues to storage
async function saveQueues() {
  await chrome.storage.local.set({
    v0_reviewQueue: reviewQueue,
    v0_completedQueue: completedQueue
  });
}

// Move item to completed
function moveToCompleted(index) {
  console.log('[DM Buddy] Moving item', index, 'to completed. Queue length:', reviewQueue.length);
  if (index < 0 || index >= reviewQueue.length) {
    console.log('[DM Buddy] Invalid index');
    return;
  }
  const item = reviewQueue.splice(index, 1)[0];
  item.completedAt = new Date().toISOString();
  completedQueue.unshift(item);
  // Keep only last 50 completed
  if (completedQueue.length > 50) {
    completedQueue = completedQueue.slice(0, 50);
  }
  console.log('[DM Buddy] After move - Ready:', reviewQueue.length, 'Completed:', completedQueue.length);
  saveQueues();
  updateQueueCount();
}

// Initialize when page loads
function init() {
  // Load settings and queues
  chrome.storage.local.get(['selectedProduct', 'selectedTone', 'selectedCta', 'v0_addThis'], (result) => {
    if (result.selectedProduct) settings.product = result.selectedProduct;
    if (result.selectedTone) settings.tone = result.selectedTone;
    if (result.selectedCta) settings.cta = result.selectedCta;
    if (result.v0_addThis) settings.addThis = result.v0_addThis;
  });
  loadQueues();

  // Check if we're on Sales Navigator LIST view (not single profile)
  const url = window.location.href;
  const isListView = url.includes('/sales/search') ||
                     url.includes('/sales/lists') ||
                     url.includes('/sales/accounts') ||
                     (url.includes('/sales/') && url.includes('query='));

  // Remove existing UI if navigating away from list view
  if (!isListView) {
    const existingBar = document.querySelector('.v0-action-bar');
    if (existingBar) existingBar.remove();
    return;
  }

  // On list view, inject UI - try immediately and again after delay
  console.log('[DM Buddy] List view detected, injecting UI...');
  injectActionBar();

  setTimeout(() => {
    injectActionBar();
    injectButtonsIntoList();
    observeListChanges();
  }, 2000);

  setTimeout(() => {
    injectButtonsIntoList();
  }, 4000);
}

// Inject floating action bar
function injectActionBar() {
  if (document.querySelector('.v0-action-bar')) {
    console.log('[DM Buddy] Action bar already exists');
    return;
  }

  console.log('[DM Buddy] Injecting action bar...');

  const bar = document.createElement('div');
  bar.className = 'v0-action-bar';
  bar.innerHTML = `
    <img src="${chrome.runtime.getURL('icon48.png')}" class="v0-action-bar-icon" alt="v0">
    <div>
      <button id="v0-scan-new" style="background:#057642;margin-right:8px;">Scan New</button>
      <button id="v0-generate-all">Generate All Visible</button>
      <button id="v0-open-queue" style="background:#666;margin-left:8px;">Queue (<span id="v0-queue-count">0</span>)</button>
    </div>
  `;

  document.body.appendChild(bar);
  console.log('[DM Buddy] Action bar injected');

  document.getElementById('v0-scan-new').addEventListener('click', () => {
    injectButtonsIntoList();
    const newButtons = document.querySelectorAll('.v0-dm-btn:not(.done)').length;
    showToast(`Found ${newButtons} new profiles`);
  });
  document.getElementById('v0-generate-all').addEventListener('click', generateAllVisible);
  document.getElementById('v0-open-queue').addEventListener('click', openReviewPanel);
}

// Inject buttons into each profile card in list view
function injectButtonsIntoList() {
  // Sales Navigator uses a specific structure - find the main results list
  // Each result has a link to /sales/lead/ or /sales/people/
  const allLinks = document.querySelectorAll('a[href*="/sales/lead/"], a[href*="/sales/people/"]');

  console.log(`[DM Buddy] Found ${allLinks.length} profile links`);

  let injectedCount = 0;
  const processedCards = new Set();

  allLinks.forEach(link => {
    // Find the parent card container (go up until we find a reasonable container)
    let card = link.closest('li') || link.closest('[data-scroll-into-view]') || link.closest('div[class*="result"]');

    // Skip if no card found or already processed
    if (!card || processedCards.has(card) || card.querySelector('.v0-dm-btn')) return;
    processedCards.add(card);

    // Verify this looks like a profile card (has enough content)
    if (card.textContent.length < 50) return;

    // Find a good place to put the button - near the name link
    const actionArea = link.parentElement;

    if (actionArea) {
      const btn = document.createElement('button');
      btn.className = 'v0-dm-btn';
      btn.textContent = 'DM';
      btn.style.marginLeft = '8px';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        generateForCard(card, btn);
      });
      actionArea.appendChild(btn);
      injectedCount++;
    }
  });

  console.log(`[DM Buddy] Injected ${injectedCount} new buttons`);
}

// Watch for new cards loaded via infinite scroll
function observeListChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldInject = true;
      }
    });
    if (shouldInject) {
      setTimeout(injectButtonsIntoList, 500);
    }
  });

  const listContainer = document.querySelector('[data-view-name="search-results"]') ||
                        document.querySelector('.artdeco-list') ||
                        document.querySelector('main');
  if (listContainer) {
    observer.observe(listContainer, { childList: true, subtree: true });
  }
}

// Extract profile data from a list card
function extractFromCard(card) {
  const data = {
    name: '',
    title: '',
    company: '',
    headline: '',
    about: '',
    timeInRole: '',
    mutualConnections: '',
    isNewInRole: false
  };

  // Debug: log the card's HTML structure
  console.log('[DM Buddy] Extracting from card:', card);

  // Name - try multiple approaches
  // Look for the main name link first
  const nameLink = card.querySelector('a[href*="/lead/"]') ||
                   card.querySelector('a[href*="/people/"]') ||
                   card.querySelector('a[href*="/in/"]');

  if (nameLink) {
    // Get text from the link, excluding any nested elements like badges
    const nameSpan = nameLink.querySelector('span') || nameLink;
    data.name = nameSpan.textContent.trim().split('\n')[0].trim();
  }

  // Fallback name selectors
  if (!data.name) {
    const nameEl = card.querySelector('[data-anonymize="person-name"]') ||
                   card.querySelector('.artdeco-entity-lockup__title') ||
                   card.querySelector('span.entity-result__title-text');
    if (nameEl) {
      data.name = nameEl.textContent.trim().split('\n')[0].trim();
    }
  }

  // Title and Company - look for the line below the name
  // Usually formatted as "Title · Company" or on separate lines
  const allText = card.textContent;

  // Try to find company link first (most reliable)
  const companyLink = card.querySelector('a[href*="/company/"]');
  if (companyLink) {
    data.company = companyLink.textContent.trim();
  }

  // Look for subtitle/title text
  const subtitleEl = card.querySelector('.artdeco-entity-lockup__subtitle') ||
                     card.querySelector('[data-anonymize="title"]') ||
                     card.querySelector('.entity-result__primary-subtitle');

  if (subtitleEl) {
    const text = subtitleEl.textContent.trim();
    const parts = text.split(/\s+·\s+/);
    if (parts.length >= 1) data.title = parts[0].trim();
    if (parts.length >= 2 && !data.company) data.company = parts[1].trim();
  }

  // Fallback: look for text patterns in the card
  if (!data.title || !data.company) {
    // Find all text nodes and look for title · company pattern
    const textNodes = card.querySelectorAll('span, div');
    for (const node of textNodes) {
      const text = node.textContent.trim();
      if (text.includes(' · ') && text.length < 200) {
        const parts = text.split(' · ');
        if (!data.title && parts[0]) data.title = parts[0].trim();
        if (!data.company && parts[1]) data.company = parts[1].trim();
        break;
      }
    }
  }

  // About snippet
  const aboutEl = card.querySelector('[data-anonymize="about"]');
  if (aboutEl) {
    data.about = aboutEl.textContent.replace('About:', '').trim().substring(0, 300);
  } else {
    // Look for "About:" text
    const aboutMatch = allText.match(/About:\s*([^]*?)(?:Show more|$)/);
    if (aboutMatch) {
      data.about = aboutMatch[1].trim().substring(0, 300);
    }
  }

  // Time in role - look for patterns like "7 years 1 month in role" or "11 months in role"
  const timeInRoleMatch = allText.match(/(\d+\s*(?:year|month|week|day)s?\s*(?:\d+\s*(?:year|month|week|day)s?)?\s*in role)/i);
  if (timeInRoleMatch) {
    data.timeInRole = timeInRoleMatch[1].trim();
    // Check if they're new (less than 6 months)
    const months = allText.match(/(\d+)\s*month/i);
    const years = allText.match(/(\d+)\s*year/i);
    const totalMonths = (years ? parseInt(years[1]) * 12 : 0) + (months ? parseInt(months[1]) : 0);
    if (totalMonths <= 6 && !years) {
      data.isNewInRole = true;
    }
  }

  // Mutual connections - look for "1 mutual connection" or "4 mutual connections"
  const mutualMatch = allText.match(/(\d+)\s*mutual\s*connections?/i);
  if (mutualMatch) {
    data.mutualConnections = mutualMatch[1];
  }

  console.log('[DM Buddy] Extracted data:', JSON.stringify(data));
  return data;
}

// Generate DM for a single card
async function generateForCard(card, btn) {
  const profileData = extractFromCard(card);

  if (!profileData.name) {
    showToast('Could not extract profile data');
    return;
  }

  btn.textContent = '...';
  btn.classList.add('loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateDM',
      profileData,
      product: settings.product,
      tone: settings.tone,
      cta: settings.cta,
      addThis: settings.addThis
    });

    if (response.success) {
      btn.textContent = '✓';
      btn.classList.remove('loading');
      btn.classList.add('done');

      // Add to review queue
      addToQueue({
        profileData,
        dm: response.dm,
        status: 'ready',
        card
      });

      updateQueueCount();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    btn.textContent = '✗';
    btn.classList.remove('loading');
    showToast('Error: ' + error.message);
    setTimeout(() => {
      btn.textContent = 'DM';
      btn.classList.remove('done');
    }, 2000);
  }
}

// Generate DMs for all visible profiles
async function generateAllVisible() {
  const btn = document.getElementById('v0-generate-all');
  const buttons = document.querySelectorAll('.v0-dm-btn:not(.done)');

  if (buttons.length === 0) {
    showToast('No profiles to generate');
    return;
  }

  btn.disabled = true;
  btn.textContent = `Generating 0/${buttons.length}...`;

  let completed = 0;
  for (const cardBtn of buttons) {
    const card = cardBtn.closest('li') || cardBtn.closest('.artdeco-list__item');
    if (card) {
      await generateForCard(card, cardBtn);
      completed++;
      btn.textContent = `Generating ${completed}/${buttons.length}...`;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  btn.disabled = false;
  btn.textContent = 'Generate All Visible';
  showToast(`Generated ${completed} DMs. Click Queue to review.`);
}

// Add item to review queue
function addToQueue(item) {
  // Don't store card reference (can't be serialized)
  const queueItem = {
    profileData: item.profileData,
    dm: item.dm,
    status: item.status,
    createdAt: new Date().toISOString()
  };
  reviewQueue.push(queueItem);
  saveQueues();
}

// Update queue count badge
function updateQueueCount() {
  const countEl = document.getElementById('v0-queue-count');
  if (countEl) {
    countEl.textContent = reviewQueue.length;
  }
}

// Open review panel
function openReviewPanel() {
  let panel = document.querySelector('.v0-review-panel');

  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'v0-review-panel';
    panel.innerHTML = `
      <div class="v0-review-header">
        <h2>DM Queue</h2>
        <button class="v0-review-close">×</button>
      </div>
      <div class="v0-review-tabs">
        <button class="v0-tab active" data-tab="ready">Ready (<span id="v0-ready-count">0</span>)</button>
        <button class="v0-tab" data-tab="completed">Completed (<span id="v0-completed-count">0</span>)</button>
      </div>
      <div class="v0-review-list" id="v0-review-list"></div>
      <div class="v0-review-footer">
        <button class="secondary" id="v0-copy-all">Copy All Ready</button>
        <button class="primary" id="v0-clear-queue">Clear All</button>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.v0-review-close').addEventListener('click', () => {
      panel.classList.add('hidden');
    });

    // Tab switching
    panel.querySelectorAll('.v0-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        panel.querySelectorAll('.v0-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        renderReviewList();
      });
    });

    document.getElementById('v0-copy-all').addEventListener('click', copyAllDMs);
    document.getElementById('v0-clear-queue').addEventListener('click', clearQueue);
  }

  renderReviewList();
  panel.classList.remove('hidden');
}

// Render review list
function renderReviewList() {
  const list = document.getElementById('v0-review-list');
  if (!list) return;

  // Update counts
  const readyCount = document.getElementById('v0-ready-count');
  const completedCount = document.getElementById('v0-completed-count');
  if (readyCount) readyCount.textContent = reviewQueue.length;
  if (completedCount) completedCount.textContent = completedQueue.length;

  // Check which tab is active
  const activeTab = document.querySelector('.v0-tab.active')?.dataset.tab || 'ready';
  const isCompleted = activeTab === 'completed';
  const items = isCompleted ? completedQueue : reviewQueue;

  if (items.length === 0) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#666;">
      ${isCompleted ? 'No completed DMs yet' : 'No DMs in queue. Generate some first!'}
    </div>`;
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <div class="v0-review-item" data-index="${index}">
      <div class="v0-review-item-header">
        <div>
          <div class="v0-review-item-name">${item.profileData.name}</div>
          <div class="v0-review-item-title">${item.profileData.title || ''} ${item.profileData.company ? '· ' + item.profileData.company : ''}</div>
        </div>
        <div class="v0-review-item-actions">
          <span class="v0-review-item-status ${item.status}">${item.status}</span>
        </div>
      </div>
      <div class="v0-review-item-dm" ${isCompleted ? '' : 'contenteditable="true"'} data-index="${index}">${item.dm}</div>
      ${isCompleted ? `
        <div class="v0-review-item-actions" style="margin-top:8px;justify-content:flex-end;display:flex;gap:4px;">
          <button class="v0-delete-btn" data-index="${index}" style="color:#d93025;">Delete</button>
          <button class="v0-recopy-btn" data-index="${index}">Copy Again</button>
        </div>
      ` : `
        <div class="v0-review-item-actions" style="margin-top:8px;justify-content:flex-end;display:flex;gap:4px;">
          <button class="v0-done-btn" data-index="${index}" style="background:#666;color:white;">Done</button>
          <button class="v0-copy-btn" data-index="${index}">Copy</button>
          <button class="primary v0-insert-btn" data-index="${index}">Insert & Open</button>
        </div>
      `}
    </div>
  `).join('');

  if (!isCompleted) {
    // Track edits
    list.querySelectorAll('.v0-review-item-dm').forEach(el => {
      el.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        reviewQueue[idx].dm = e.target.textContent;
        saveQueues();
      });
    });

    // Add click handlers for copy buttons
    list.querySelectorAll('.v0-copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        await copyDM(index);
      });
    });

    // Add click handlers for insert buttons
    list.querySelectorAll('.v0-insert-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        await insertAndOpenDM(index);
      });
    });

    // Add click handlers for done buttons (manual move to completed)
    list.querySelectorAll('.v0-done-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        reviewQueue[index].status = 'done';
        moveToCompleted(index);
        renderReviewList();
        showToast('Moved to completed');
      });
    });
  } else {
    // Copy again for completed items
    list.querySelectorAll('.v0-recopy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const item = completedQueue[index];
        await navigator.clipboard.writeText(item.dm);
        showToast('Copied to clipboard!');
      });
    });

    // Delete completed items
    list.querySelectorAll('.v0-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        completedQueue.splice(index, 1);
        saveQueues();
        renderReviewList();
        showToast('Deleted');
      });
    });
  }
}

// Copy single DM
async function copyDM(index) {
  const item = reviewQueue[index];
  try {
    await navigator.clipboard.writeText(item.dm);
    item.status = 'copied';
    moveToCompleted(index);
    renderReviewList();
    showToast('Copied to clipboard! Moved to completed.');
  } catch (err) {
    showToast('Failed to copy: ' + err.message);
  }
}

// Open LinkedIn message and insert DM
async function insertAndOpenDM(index) {
  const item = reviewQueue[index];

  // Copy to clipboard first
  try {
    await navigator.clipboard.writeText(item.dm);
  } catch (err) {
    showToast('Failed to copy: ' + err.message);
    return;
  }

  item.status = 'sent';
  moveToCompleted(index);
  renderReviewList();
  showToast('DM copied. Paste with Cmd+V. Moved to completed.');
}

// Copy all DMs to clipboard
async function copyAllDMs() {
  const allDMs = reviewQueue.map(item =>
    `To: ${item.profileData.name}\n${item.dm}\n`
  ).join('\n---\n\n');

  await navigator.clipboard.writeText(allDMs);
  showToast('All DMs copied to clipboard!');
}

// Clear queue
function clearQueue() {
  const activeTab = document.querySelector('.v0-tab.active')?.dataset.tab || 'ready';

  if (activeTab === 'completed') {
    completedQueue = [];
    showToast('Completed queue cleared');
  } else {
    reviewQueue = [];
    // Reset all buttons
    document.querySelectorAll('.v0-dm-btn.done').forEach(btn => {
      btn.textContent = 'DM';
      btn.classList.remove('done');
    });
    showToast('Ready queue cleared');
  }

  saveQueues();
  updateQueueCount();
  renderReviewList();
}

// Show toast notification
function showToast(message) {
  const existing = document.querySelector('.v0-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'v0-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// Extract profile data (for popup compatibility)
function extractProfileData() {
  const data = {
    name: '',
    title: '',
    company: '',
    headline: '',
    location: '',
    about: ''
  };

  const isSalesNav = window.location.href.includes('/sales/');

  if (isSalesNav) {
    // Sales Navigator profile page
    const nameEl = document.querySelector('[data-x--lead--name]') ||
                   document.querySelector('.profile-topcard-person-entity__name') ||
                   document.querySelector('h1 span[data-anonymize="person-name"]') ||
                   document.querySelector('.artdeco-entity-lockup__title span');

    if (nameEl) {
      let name = nameEl.textContent.trim().split('\n')[0].trim();
      if (!name.includes('Sales Navigator') && !name.includes('Lead Page')) {
        data.name = name;
      }
    }

    // Fallback: page title
    if (!data.name) {
      const titleTag = document.title;
      if (titleTag && titleTag.includes('|')) {
        data.name = titleTag.split('|')[0].trim();
      }
    }

    // Headline
    const headlineEl = document.querySelector('.profile-topcard__summary-headline') ||
                       document.querySelector('[data-anonymize="headline"]');
    if (headlineEl) {
      data.headline = headlineEl.textContent.trim();
    }

    // Current role
    const currentRoleEl = document.querySelector('.profile-topcard__current-positions');
    if (currentRoleEl) {
      const roleTitle = currentRoleEl.querySelector('.profile-topcard__summary-position-title');
      const roleCompany = currentRoleEl.querySelector('a[href*="/company/"]');
      if (roleTitle) data.title = roleTitle.textContent.trim();
      if (roleCompany) data.company = roleCompany.textContent.trim();
    }

    // Fallback from headline
    if ((!data.title || !data.company) && data.headline) {
      const parts = data.headline.split(/\s+at\s+|\s+·\s+|\s+\|\s+/);
      if (parts.length >= 2) {
        if (!data.title) data.title = parts[0].trim();
        if (!data.company) data.company = parts[parts.length - 1].trim();
      }
    }

    // Location
    const locationEl = document.querySelector('.profile-topcard__location-data');
    if (locationEl) data.location = locationEl.textContent.trim();

    // About
    const aboutEl = document.querySelector('.profile-topcard__summary-content');
    if (aboutEl) data.about = aboutEl.textContent.trim().substring(0, 500);

  } else {
    // Regular LinkedIn - try multiple selector patterns (LinkedIn changes these often)

    // Name - try multiple patterns
    const nameEl = document.querySelector('h1.text-heading-xlarge') ||
                   document.querySelector('h1.inline.t-24') ||
                   document.querySelector('h1');
    if (nameEl) data.name = nameEl.textContent.trim().split('\n')[0].trim();

    // Headline - the line under the name (usually "Title at Company")
    const headlineEl = document.querySelector('.text-body-medium.break-words') ||
                       document.querySelector('div.text-body-medium') ||
                       document.querySelector('[data-generated-suggestion-target]');
    if (headlineEl) {
      data.headline = headlineEl.textContent.trim();
    }

    // Try to get title/company from experience section first
    const experienceSection = document.querySelector('#experience') ||
                              document.querySelector('[id^="profilePagedListComponent"]');
    if (experienceSection) {
      // Look for the first experience item
      const firstExp = experienceSection.querySelector('li') ||
                       experienceSection.closest('section')?.querySelector('li');
      if (firstExp) {
        const expTitle = firstExp.querySelector('span[aria-hidden="true"]');
        const expCompany = firstExp.querySelector('a[href*="/company/"]');
        if (expTitle && !data.title) data.title = expTitle.textContent.trim().split('\n')[0];
        if (expCompany && !data.company) data.company = expCompany.textContent.trim();
      }
    }

    // Fallback: parse headline "Title at Company" or "Title | Company"
    if ((!data.title || !data.company) && data.headline) {
      const atMatch = data.headline.match(/^(.+?)\s+at\s+(.+?)(?:\s*·|$)/i);
      const pipeMatch = data.headline.match(/^(.+?)\s*\|\s*(.+?)(?:\s*·|$)/i);

      if (atMatch) {
        if (!data.title) data.title = atMatch[1].trim();
        if (!data.company) data.company = atMatch[2].trim();
      } else if (pipeMatch) {
        if (!data.title) data.title = pipeMatch[1].trim();
        if (!data.company) data.company = pipeMatch[2].trim();
      } else if (!data.title) {
        // Just use headline as title if we can't parse it
        data.title = data.headline.split('·')[0].trim();
      }
    }

    // Location
    const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
                       document.querySelector('span.text-body-small[class*="t-black--light"]');
    if (locationEl) data.location = locationEl.textContent.trim();

    // About section
    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
      const aboutText = aboutSection.closest('section')?.querySelector('.inline-show-more-text') ||
                        aboutSection.closest('section')?.querySelector('span[aria-hidden="true"]');
      if (aboutText) data.about = aboutText.textContent.trim().substring(0, 500);
    }
  }

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProfileData') {
    sendResponse(extractProfileData());
  } else if (request.action === 'updateSettings') {
    settings.product = request.product || settings.product;
    settings.tone = request.tone || settings.tone;
    settings.cta = request.cta || '';
    settings.addThis = request.addThis || '';
    chrome.storage.local.set({
      selectedProduct: settings.product,
      selectedTone: settings.tone,
      selectedCta: settings.cta,
      v0_addThis: settings.addThis
    });
    sendResponse({ success: true });
  }
  return true;
});

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-init on navigation (SPA)
let lastUrl = location.href;
const startObserver = () => {
  if (document.body) {
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(init, 1000);
      }
    }).observe(document.body, { subtree: true, childList: true });
  } else {
    setTimeout(startObserver, 100);
  }
};
startObserver();
