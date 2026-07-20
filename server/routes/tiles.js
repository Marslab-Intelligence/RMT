import { Router } from 'express';
import https from 'https';

const router = Router();
const SUBDOMAINS = ['a', 'b', 'c'];

// GET /api/tiles/:z/:x/:yFile - Proxies OpenStreetMap tiles same-origin using native https.get
router.get('/:z/:x/:yFile', (req, res) => {
  const { z, x, yFile } = req.params;
  const sub = SUBDOMAINS[Math.floor(Math.random() * SUBDOMAINS.length)];
  const url = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${yFile}`;

  const requestOptions = {
    headers: {
      'User-Agent': 'MarsLab-RenewalSystem/1.0 (contact@marslab.work)'
    }
  };

  https.get(url, requestOptions, (upstreamRes) => {
    if (upstreamRes.statusCode !== 200) {
      res.status(upstreamRes.statusCode).end();
      return;
    }

    res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upstreamRes.pipe(res);
  }).on('error', (err) => {
    console.error('Tile proxy error:', err.message);
    res.status(502).end();
  });
});

export default router;
