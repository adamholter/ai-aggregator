# AI Dashboard Project Structure

## Overview
This is a comprehensive AI Model Analysis Dashboard that aggregates and compares AI models from multiple sources including Artificial Analysis, OpenRouter, Replicate, and fal.ai APIs.

## Core Application Files

### Frontend Files
- **`index.html`** - Main HTML structure for the dashboard interface
- **`static/index.html`** - Mirror of main HTML file in static directory
- **`script.js`** - Main JavaScript application logic and API interactions
- **`static/script.js`** - Mirror of main JavaScript file
- **`styles.css`** - Main CSS styling and theme definitions
- **`static/styles.css`** - Mirror of main CSS file
- **`static/gear-icon.png`** - Settings icon for the dashboard

### Backend Files
- **`server.py`** - Flask backend server with API endpoints and data aggregation
- **`requirements.txt`** - Python dependencies for the backend
- **`run_server.sh`** - Shell script to start the server

### Configuration Files
- **`config/model_config.json`** - Dashboard model configuration and settings
- **`config/prompt_config.json`** - AI agent prompt templates and configurations

## Documentation Files
- **`README.md`** - Project overview and setup instructions
- **`PROJECT_STRUCTURE.md`** - This file - detailed file structure and descriptions
- **`NEXT_STEPS.md`** - Current tasks, recent fixes, and development roadmap

## Data and Analysis
- **`analyses/`** - Directory containing generated AI model analysis reports
  - LLM analysis files (`.md` format with timestamps)
  - Media model analysis files
  - fal.ai and Replicate model analyses
- **`logs/`** - Application logs and runtime data
  - **`logs/ai-dashboard.out.log`** - Server output and error logs

## System Files
- **`~/Library/LaunchAgents/com.ai-dashboard.server.plist`** - macOS launch agent for auto-starting the server
- **`server_run.log`** - Server runtime log file

## File Purpose Summary

| File/Directory | Purpose |
|----------------|---------|
| `index.html` | Main dashboard interface |
| `script.js` | Frontend application logic |
| `styles.css` | Styling and themes |
| `server.py` | Backend API server |
| `requirements.txt` | Python dependencies |
| `config/` | Configuration files |
| `analyses/` | Generated analysis reports |
| `logs/` | Application logs |
| `static/` | Static web assets |

## Architecture Overview
- **Frontend**: Vanilla JavaScript single-page application
- **Backend**: Flask server with REST API endpoints
- **Data Sources**: Multiple AI model APIs (Artificial Analysis, OpenRouter, Replicate, fal.ai)
- **Features**: Model comparison, AI agent chat, streaming responses, theme switching