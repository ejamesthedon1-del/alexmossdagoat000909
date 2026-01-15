// Check if environment variables are loaded
// Useful for debugging Vercel dev environment variable issues

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const envVars = {
      TELEGRAM_BOT_TOKEN: {
        exists: !!process.env.TELEGRAM_BOT_TOKEN,
        preview: process.env.TELEGRAM_BOT_TOKEN ? `${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET',
        length: process.env.TELEGRAM_BOT_TOKEN?.length || 0
      },
      TELEGRAM_CHAT_ID: {
        exists: !!process.env.TELEGRAM_CHAT_ID,
        value: process.env.TELEGRAM_CHAT_ID || 'NOT SET'
      }
    };

    const allSet = envVars.TELEGRAM_BOT_TOKEN.exists && envVars.TELEGRAM_CHAT_ID.exists;

    return res.status(200).json({
      success: allSet,
      environment: process.env.NODE_ENV || 'development',
      environmentVariables: envVars,
      instructions: allSet ? 
        '✅ All environment variables are loaded! Telegram should work.' :
        [
          '❌ Environment variables are missing.',
          '',
          'For Next.js dev (npm run dev):',
          '  - Add variables to .env.local file',
          '  - Restart the dev server',
          '',
          'For Vercel dev (vercel dev):',
          '  - Option 1: Link project and pull env vars:',
          '    vercel link',
          '    vercel env pull .env.local',
          '  - Option 2: Set in Vercel Dashboard → Settings → Environment Variables',
          '  - Option 3: Use next dev instead: npm run dev',
          '',
          'After setting variables, restart your dev server!'
        ]
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
