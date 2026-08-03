import https from 'https';
import fs from 'fs';

const options = {
  hostname: 'upload.wikimedia.org',
  path: '/wikipedia/id/8/87/Logo_SMAN_3_Mataram.png',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

https.get(options, (res) => {
  console.log('Status:', res.statusCode);
  if (res.statusCode === 200) {
    res.pipe(fs.createWriteStream('./public/logo-sman3.png'))
       .on('finish', () => console.log('Done'));
  } else {
    console.error('Failed with status:', res.statusCode);
  }
}).on('error', err => console.error(err));
