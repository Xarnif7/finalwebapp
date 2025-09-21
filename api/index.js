// Vercel serverless function to serve the React app for all non-API routes
export default function handler(req, res) {
  // Set headers for HTML content
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Serve the built index.html file
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon-16.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blipp</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-SZDuPkBo.js"></script>
    <link rel="stylesheet" href="/assets/index-BrFsZg3C.css">
  </body>
</html>
  `);
}
