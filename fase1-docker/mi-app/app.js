// app.js
const http = require('http');
http.createServer((req, res) => {
  res.end('Hola desde Docker');
}).listen(3000);
