# AI Aggregator

A comprehensive web-based dashboard for analyzing and comparing AI models from multiple sources including Artificial Analysis, OpenRouter, Replicate, and fal.ai APIs.

## Features

- **Multi-Source Model Aggregation**: Compare models from different AI platforms
- **Interactive Model Cards**: Double-click for detailed AI-powered analysis
- **AI Agent Chat**: Conversational interface for model recommendations and comparisons
- **Advanced Filtering**: Sort and filter models by performance metrics, cost, speed
- **Theme Support**: Light, dark, and source-themed color-coded interfaces
- **Real-time Analysis**: Streaming AI responses with reasoning traces
- **Responsive Design**: Works on desktop and mobile devices

## Recent Improvements

- Agent prompts now hydrate with cached datasets first, only invoking web search when explicitly needed.
- Model analyses stream into the modal view with preserved markdown formatting and are cached to disk for instant re-open.
- Fal.ai, Replicate, and OpenRouter loaders share reusable helpers for consistent pricing/metadata formatting.
- Added backend tooling for cross-dataset model matching to power richer comparisons between Artificial Analysis and OpenRouter catalogues (in progress).

## Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser
- Internet connection (for API calls)

### Installation

1. **Clone or download the project files**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python3 server.py
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:8091
   ```

### Alternative: Using the run script
```bash
chmod +x run_server.sh
./run_server.sh
```

## Project Structure

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for detailed information about the codebase organization and file purposes.

## Key Components

### Frontend
- **Dashboard Interface**: Model browsing and comparison
- **AI Agent**: Conversational assistant for model recommendations
- **Modal Analysis**: Detailed model breakdowns with streaming AI analysis
- **Theme System**: Light/dark/source modes with color-coded model sources

### Backend
- **Flask Server**: REST API with intelligent caching
- **Multi-API Integration**: Artificial Analysis, OpenRouter, Replicate, fal.ai
- **Streaming Support**: Real-time AI responses and model data
- **Error Handling**: Robust fallback systems and graceful degradation

### Data Sources
- **Artificial Analysis API**: LLM and media model benchmarks
- **OpenRouter**: Model hosting and inference platform
- **Replicate**: Open-source model community
- **fal.ai**: Creative AI model marketplace

## Usage

### Browsing Models
1. Use the navigation tabs to switch between model categories (LLMs, Text-to-Image, etc.)
2. Apply filters and sorting options to find specific models
3. Double-click any model card for detailed AI analysis

### AI Agent
1. Click the "AI Agent" tab to access the conversational interface
2. Ask questions about model performance, comparisons, or recommendations
3. Use the settings panel to configure available models and preferences

### Themes
- Click the theme toggle button (top-right) to cycle through:
  - **Light Mode**: Clean, bright interface
  - **Dark Mode**: Easy on the eyes
  - **Source Mode**: Color-coded borders showing model sources

## Configuration

### Model Settings
Access the settings panel (gear icon) to:
- Configure which models are available in the AI agent
- Set default models for analysis and speed mode
- Manage fallback model preferences

### API Configuration
API keys and endpoints are configured in `server.py`:
- `ARTIFICIAL_ANALYSIS_API_KEY`: For benchmark data
- `OPENROUTER_API_KEY`: For AI model access
- `REPLICATE_API_KEY`: For open-source models

## Development

### Adding New Features
1. Frontend changes: Modify `script.js` and `styles.css`
2. Backend changes: Update `server.py`
3. Configuration: Edit `config/model_config.json`

### Testing
- The application includes comprehensive error handling
- All API calls have fallback mechanisms
- Loading states provide user feedback during data fetching

## Troubleshooting

### Server Issues
- Check that port 8091 is available
- Verify API keys are configured correctly
- Check the logs in `logs/ai-dashboard.out.log`

### Frontend Issues
- Clear browser cache if experiencing display problems
- Ensure JavaScript is enabled
- Check browser console for error messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Copy `.env.example` to `.env` and configure your API keys
3. Make your changes
4. Submit a pull request

For issues or questions, please open a GitHub issue.
