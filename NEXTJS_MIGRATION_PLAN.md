# Next.js Migration Plan

## Benefits
- ✅ Native Vercel support (no configuration needed)
- ✅ API routes for backend functions (`/api/*`)
- ✅ Keep all existing HTML/CSS/JS
- ✅ Easy deployment

## Migration Steps

1. **Install Next.js dependencies**
2. **Convert HTML to Next.js pages:**
   - `index.html` → `pages/index.js`
   - `link.html` → `pages/link.js`
   - `otp.html` → `pages/otp.js` (if exists)
   - `email.html` → `pages/email.js` (if exists)
   - `personal.html` → `pages/personal.js` (if exists)

3. **Create API routes:**
   - `pages/api/activity.js` - Log activity
   - `pages/api/poll.js` - Poll for activities
   - `pages/api/approve.js` - Approve activity
   - `pages/api/deny.js` - Deny activity
   - `pages/api/approval/[activityId].js` - Check approval
   - `pages/api/test.js` - Health check
   - `pages/api/routing/*.js` - Routing endpoints

4. **Move static assets:**
   - `logo.png` → `public/logo.png`

5. **Update configuration:**
   - `package.json` - Add Next.js dependencies
   - Remove `vercel.json` (Next.js handles it)

## Result
- Same layout and functionality
- Backend API routes working
- Deploys easily on Vercel

