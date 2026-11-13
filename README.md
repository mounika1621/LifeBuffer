# LifeBuffer

LifeBuffer is a mobile application built with React Native and Expo. It provides task management, analytics, and risk insights through a simple user interface.

## Features

- User authentication
- Task creation and management
- Task analytics
- Risk insights
- Premium features
- Supabase integration

## Tech Stack

- React Native
- Expo SDK 57
- JavaScript
- Expo Router
- Supabase
- RevenueCat

## Project Structure

```text
LifeBuffer/
â”œâ”€â”€ assets/
â”œâ”€â”€ scripts/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ constants/
â”‚   â”œâ”€â”€ context/
â”‚   â””â”€â”€ lib/
â”œâ”€â”€ .gitignore
â”œâ”€â”€ app.json
â”œâ”€â”€ package.json
â””â”€â”€ README.md
```

## Installation

1. Clone the repository:

```bash
git clone <your-github-repository-url>
```

2. Navigate to the project:

```bash
cd LifeBuffer
```

3. Install dependencies:

```bash
npm install
```

4. Configure the required environment variables in a `.env` file.

5. Start the development server:

```bash
npx expo start
```

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run on Web |
| `npm run lint` | Run linting |

## Backend

LifeBuffer uses Supabase for backend services.

## License

This project is licensed under the MIT License.
