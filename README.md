# Multilingual Mandi Platform

AI-powered multilingual platform for Indian agricultural markets that enables seamless communication, fair price discovery, and intelligent negotiation support for local mandi ecosystems.

## Features

- **Multilingual Support**: Hindi, Telugu, Tamil, Kannada, Bengali, Marathi, and English
- **Voice-First Interface**: Speech-to-text and text-to-speech capabilities
- **AI-Based Price Discovery**: Real-time market price intelligence
- **Smart Negotiation Assistant**: Culturally appropriate negotiation phrases
- **Mobile-First Design**: Optimized for low-end smartphones and 2G networks
- **Progressive Web App**: Offline capability and native app-like experience

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** for persistent data storage
- **Redis** for caching and session management
- **Docker** for containerization

### Frontend
- **Progressive Web App (PWA)** with Service Workers
- **Vanilla JavaScript** with Web Components
- **CSS Grid/Flexbox** for responsive design
- **Web Speech API** for voice processing

### AI/ML Services
- **Hugging Face Transformers** for multilingual translation
- **Whisper/Vakyansh** for Indian language speech recognition
- **TensorFlow/PyTorch** for price prediction models

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multilingual-mandi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start services with Docker (recommended)**
   ```bash
   npm run docker:up
   ```

   Or manually:
   ```bash
   # Start PostgreSQL and Redis
   # Then run:
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

5. **Access the application**
   - Web app: http://localhost:3000
   - Health check: http://localhost:3000/health

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Code quality
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Database operations
npm run db:migrate
npm run db:seed

# Docker operations
npm run docker:build
npm run docker:up
npm run docker:down
```

## Project Structure

```
multilingual-mandi/
├── src/                    # Backend source code
│   ├── config/            # Database and Redis configuration
│   ├── middleware/        # Express middleware
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
├── public/               # Frontend static files
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   ├── icons/           # PWA icons
│   └── index.html       # Main HTML file
├── database/            # Database schema and migrations
├── scripts/             # Utility scripts
├── logs/               # Application logs
└── __tests__/          # Test files
```

## API Endpoints

### Core Services
- `GET /health` - Health check
- `POST /api/users/profile` - User management
- `POST /api/translation/translate` - Text translation
- `POST /api/voice/speech-to-text` - Voice processing
- `GET /api/commodities/search` - Commodity search
- `GET /api/prices/range` - Price intelligence
- `POST /api/negotiation/generate-phrase` - Negotiation assistance
- `POST /api/communication/session` - Real-time communication

## Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multilingual_mandi
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000

# AI Services (for production)
HUGGINGFACE_API_KEY=your-api-key
OPENAI_API_KEY=your-api-key
```

### Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User profiles and preferences
- `commodities` - Agricultural commodity data
- `price_data` - Market price information
- `translation_cache` - Cached translations
- `communication_sessions` - User communication sessions
- `messages` - Chat messages with translations

## Testing

The project uses Jest for unit testing and fast-check for property-based testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=server.test.js
```

## Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Considerations

1. **Environment Variables**: Set production values for all environment variables
2. **SSL/TLS**: Configure HTTPS with proper certificates
3. **Database**: Use managed PostgreSQL service with backups
4. **Caching**: Configure Redis with persistence and clustering
5. **Monitoring**: Set up logging, metrics, and error tracking
6. **CDN**: Use CDN for static assets and images

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Use Prettier for code formatting
- Write tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/docs` (when available)

## Roadmap

- [ ] Complete core infrastructure setup ✅
- [ ] Implement user management system
- [ ] Add translation service integration
- [ ] Build voice processing capabilities
- [ ] Develop price intelligence system
- [ ] Create negotiation assistant
- [ ] Add real-time communication
- [ ] Optimize for mobile and offline use
- [ ] Deploy to production

---

**Note**: This is an active development project. Features and APIs may change as development progresses.