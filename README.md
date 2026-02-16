<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-l0yhXFHIH1gg9K9-myJsSgwawuIvEl4

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   - Copy the example environment file:
     ```bash
     cp .env.local.example .env.local
     ```
   - Get your Gemini API key from: https://makersuite.google.com/app/apikey
   - Edit `.env.local` and replace `your_api_key_here` with your actual API key:
     ```
     GEMINI_API_KEY=your_actual_key_here
     ```

3. **Run the app:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

### Troubleshooting

**Error: GEMINI_API_KEY is missing**
- Make sure you created the `.env.local` file in the project root
- Verify your API key is correctly set in the file
- Restart the dev server after adding the key
