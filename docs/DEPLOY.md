# Deployment Guide

## Vercel (Recommended)
Free tier: unlimited bandwidth, global CDN, automatic HTTPS
Handles: millions of requests/month without configuration

### Steps
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. From app/ directory
cd app

# 3. First deploy
vercel

# 4. Production deploy
vercel --prod

# Output: https://your-project.vercel.app
```

### Custom Domain (Optional)
```bash
vercel domains add hungary2026.example.com
```

## Alternative: Cloudflare Pages
```bash
npm run build
npm run export  # if using static export
# Upload dist/ to Cloudflare Pages dashboard
```

## Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s  
- Lighthouse score: > 90
- CDN regions: Europe + US (fra1 + iad1 on Vercel)
- Cache-Control: 1 hour for HTML, 1 year for assets
