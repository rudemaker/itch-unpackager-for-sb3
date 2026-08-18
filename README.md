# itch-unpackager-for-sb3

Extract HTML5 games from itch.io

## Features

- 🎮 Extract HTML games from itch.io URLs
- 📥 Download extracted HTML files
- 🔍 Automatic itch.zone link detection
- 📊 Detailed debug logging

## Setup (Local Development)

### Prerequisites

- Node.js 14+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rudemaker/itch-unpackager-for-sb3.git
cd itch-unpackager-for-sb3
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and go to:
```
http://localhost:3000
```

### Development (with auto-reload)

Install nodemon if you haven't:
```bash
npm install --save-dev nodemon
```

Then run:
```bash
npm run dev
```

## How to Use

1. Enter a game URL from itch.io (e.g., `https://talihi.itch.io/music-life`)
2. Click "Extract HTML"
3. Wait for the extraction to complete
4. Click "Download HTML" to save the file

**Alternative**: You can also directly paste an itch.zone URL (e.g., `https://html-classic.itch.zone/html/18739665/index.html?v=1786300222`)

## Project Structure

```
itch-unpackager-for-sb3/
├── server.js          # Express backend server
├── package.json       # Node.js dependencies
├── index.html         # Frontend HTML
├── script.js          # Frontend JavaScript
├── style.css          # Styling
└── README.md          # This file
```

## How It Works

1. **Frontend** sends the itch.io game URL to the backend
2. **Backend** fetches the itch.io page and extracts the itch.zone link
3. **Backend** fetches the HTML from the itch.zone link
4. **Frontend** receives the HTML and allows the user to download it

## Deployment

### Deploy to Heroku

1. Create a Heroku account and install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create your-app-name
```

4. Deploy:
```bash
git push heroku main
```

5. Open your app:
```bash
heroku open
```

### Deploy to Other Platforms

This app can be deployed to any Node.js hosting service like:
- Railway
- Render
- Vercel (serverless)
- AWS
- DigitalOcean
- etc.

## API Endpoints

### POST /api/extract-itch-zone-link
Extracts the itch.zone link from an itch.io game page.

**Request:**
```json
{
  "url": "https://talihi.itch.io/music-life"
}
```

**Response:**
```json
{
  "success": true,
  "itchZoneLink": "https://html-classic.itch.zone/html/18739665/index.html?v=1786300222"
}
```

### POST /api/fetch-html
Fetches the HTML content from an itch.zone URL.

**Request:**
```json
{
  "url": "https://html-classic.itch.zone/html/18739665/index.html?v=1786300222"
}
```

**Response:**
```json
{
  "success": true,
  "html": "<html>...</html>"
}
```

## Troubleshooting

### "Failed to fetch the game page"
- Make sure the URL is correct and the game page is publicly accessible
- The game must be an HTML5 game (not a downloadable game)

### "No itch.zone link found"
- The game might not be packaged as an HTML5 game
- The game might use a different hosting method

### Connection refused on localhost
- Make sure you ran `npm install` and `npm start`
- Check that port 3000 is not in use

## Disclaimer

This tool is for personal learning, research, and backup purposes only. Please respect copyright and the terms of service of itch.io. Don't distribute others' games without permission.

## License

MIT

## Support

If you encounter issues, please open an issue on GitHub.
