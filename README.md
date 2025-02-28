# GameFriends

GameFriends is a web application that helps you track your game collection and see what your friends are playing. Connect with Discord to find friends who own the same games and discover new titles to play together.

![GameFriends Screenshot](https://placeholder-for-screenshot.com)

## Features

- **Game Collection Tracking**: Add games to your personal library
- **Discord Integration**: Connect with your Discord account to find friends
- **Friend Activity**: See which games your friends own
- **Game Search**: Search for games using the IGDB database
- **Dark/Light Mode**: Choose your preferred theme

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Authentication**: Supabase Auth with Discord OAuth
- **Database**: PostgreSQL (via Supabase)
- **UI Components**: shadcn/ui
- **API Integration**: IGDB API for game data, Discord API for social features

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- Supabase account
- Discord Developer account (for OAuth)
- IGDB API credentials

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_BOT_TOKEN=your_discord_bot_token
NEXT_PUBLIC_IGDN_CLIENT_ID=your_igdb_client_id
NEXT_PUBLIC_IGDN_CLIENT_SECRET=your_igdb_client_secret
```

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jjcxdev/gamefriends.git
   cd gamefriends
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Setup

The project uses Supabase for database and authentication. You'll need to set up the following tables:

- `users`: Stores user information
- `discord_connections`: Stores Discord OAuth tokens and user info
- `user_games`: Tracks which games users own
- `games`: Stores game information

The schema for these tables can be found in the `supabase/schema.sql` file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the React framework
- [Supabase](https://supabase.io/) for database and authentication
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [IGDB](https://www.igdb.com/) for game data
- [Discord](https://discord.com/) for social integration

## Contact

Project Link: [https://github.com/jjcxdev/gamefriends](https://github.com/jjcxdev/gamefriends)

---

Built with ❤️ by [jjcx](https://github.com/jjcxdev)
