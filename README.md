# DM Buddy

Chrome extension that generates personalized LinkedIn DMs for sales outreach using AI.

## Features

- **Batch generate DMs** for multiple profiles from Sales Navigator list view
- **Review queue** with Ready/Completed tabs
- **Editable DMs** before sending
- **Persistent storage** - queue survives page refreshes
- **Multiple personas** - Sales, Marketing, Engineering, Design, Data, Security leaders
- **Character count** - ensures DMs stay under LinkedIn limits

## Installation (Team Members)

1. Clone this repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/linkedin-dm-extension.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked**

5. Select the cloned `linkedin-dm-extension` folder

## Setup

1. Get your Vercel AI Gateway key from your Vercel dashboard (AI Gateway tab → API keys)
2. Click the extension icon while on LinkedIn
3. Paste your gateway key starting with `vck_` (saved locally, one-time setup)

## Usage

### On Sales Navigator List View

1. Navigate to a Sales Navigator search results page
2. You'll see a floating action bar in the bottom right
3. Click **Scan New** to detect profiles on screen
4. Click **Generate All Visible** to batch generate DMs
5. Click **Queue** to review, edit, and send DMs

### On Individual Profiles

1. Navigate to any LinkedIn profile
2. Click the extension icon
3. Select persona and format (DM or Email)
4. Click Generate
5. Edit if needed, then Copy

## Updating

When updates are pushed to the repo:

```bash
git pull origin main
```

Then go to `chrome://extensions/` and click the refresh icon on the extension.

## Development

Files:
- `manifest.json` - Extension configuration
- `popup.html/js` - Extension popup UI
- `content.js` - Injected into LinkedIn pages
- `content.css` - Styles for injected UI
- `background.js` - Service worker for API calls

## Customizing Prompts

Edit the `DM_PROMPTS` object in `popup.js` and `background.js` to customize messaging for each persona.
