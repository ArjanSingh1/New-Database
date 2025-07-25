<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Global Link Vault - Copilot Instructions

This is a Next.js TypeScript application with the following architecture and features:

## Project Structure
- Frontend: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- Backend: Express.js API with Socket.io for real-time features
- Database: MongoDB with Mongoose ODM
- APIs: Slack API, OpenAI API, web scraping with Cheerio/Puppeteer

## Key Features
1. **AI Links Tab**: Scrapes Slack channels for links with filtering capabilities
2. **B2B Vault Tab**: Scrapes B2B Vault website articles with social features
3. **Real-time**: Comments, votes, and updates using Socket.io
4. **Global Access**: Public website accessible by anyone

## Development Guidelines
- Use TypeScript for all code
- Environment variables stored in .env file (never in source code)
- Follow Next.js App Router patterns
- Use Tailwind CSS for styling
- Implement proper error handling and loading states
- Use React hooks and modern patterns
- Ensure responsive design for mobile and desktop

## Security
- All API keys and sensitive data in environment variables
- Validate user inputs
- Implement rate limiting for APIs
- Sanitize scraped content

## API Integrations
- Slack Web API for channel message scraping
- OpenAI API for content enhancement
- Web scraping with proper error handling and retry logic
