import { createServer } from 'http';

const requestListener = (req, res) => {
    res.writeHead(200);
    res.end('Hello, World!');
};

const server = createServer(requestListener);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});