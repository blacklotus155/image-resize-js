const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config()

const BASE_URL = process.env.BASE_URL
const ACCESS_KEY = process.env.AWS_ACCESS_KEY
const SECRET_KEY = process.env.AWS_SECRET_KEY
const BUCKET_STAGING = process.env.BUCKET_STAGING_NAME
const BUCKET_PRODUCTION = process.env.BUCKET_PRODUCTION_NAME

const bucketList = {
  'staging': BUCKET_STAGING,
  'production': BUCKET_PRODUCTION
}

const outputFormat = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}

const client = new S3Client({
  endpoint: BASE_URL,
  credentials:{
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY
  }
});

const filePath = path.join(__dirname, './favicon.ico');
const favicon = fs.readFileSync(filePath)

const server = http.createServer(async (req, res) => {
  const {pathname, query: queryObject} = url.parse(req.url, true);
  if (pathname == '/favicon.ico') {
    res.writeHead(200, {'Content-Type': 'image/vnd.microsoft.icon'});
    return res.end(favicon);
  }
  const splitPathName = pathname.split('/')
  if (splitPathName.length == 0) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('Bucket and image key is required!');
    return;
  }
  const [ , bucket, ...restPath] = splitPathName

  const imageKey = restPath.join('/')
  const width = parseInt(queryObject.w) || undefined;
  const height = parseInt(queryObject.h) || undefined;
  const format = queryObject.format || 'png'; // Default to PNG if format is not provided or invalid
  let bucketName = bucketList[bucket]

  if (!imageKey) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('Image key is required!');
    return;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
    });
    const response = await client.send(command)
    const buffer = await response.Body.transformToByteArray()
    // Process the image using Sharp
    sharp(buffer)
      .resize(width, height)
      .toFormat(format)
      .toBuffer()
      .then(imageData => {
        const contentType = outputFormat[format] || response.ContentType || outputFormat['webp'];
        res.writeHead(200, {'Content-Type': contentType });
        res.end(imageData);
      })
      .catch(err => {
        console.error('Error processing image:', err);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Error processing image');
      });
  } catch (error) {
    console.log(error);
    res.end('Error processing image');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});