import express from 'express';
import fetch from 'node-fetch';
import * as nsfw from 'nsfwjs';
import * as tf from '@tensorflow/tfjs-node';
import { createCanvas, loadImage } from 'canvas';

const app = express();
app.use(express.json());

let model;

(async () => {
  model = await nsfw.load('https://s3.amazonaws.com/nsfwdetector/nsfwjs.zip');
  console.log('✅ NSFWJS model loaded from CloudFront');
})();

app.post('/moderate', async (req, res) => {
  try {
    const { image_url } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Missing image_url' });

    const response = await fetch(image_url);
    const buffer = await response.arrayBuffer();
    const img = await loadImage(Buffer.from(buffer));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const predictions = await model.classify(canvas);

    const nsfwScore = predictions.find(p => p.className === 'Porn')?.probability || 0;
    const unsafe = nsfwScore > 0.3;

    res.json({
      safe: !unsafe,
      nsfwScore,
      predictions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.get('/', (req, res) => res.json({ message: '✅ NSFWJS API online!' }));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server running on port ${port}`));
