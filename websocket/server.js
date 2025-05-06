const fs = require('fs');
const https = require('https');
const socketIo = require('socket.io');

const options = {
    key: fs.readFileSync('/Users/scottadrian/key.pem'),
    cert: fs.readFileSync('/Users/scottadrian/cert.pem')
};

// Create HTTPS server
const server = https.createServer(options);

// Attach WebSocket to HTTPS server with CORS configuration
const io = socketIo(server, {
    cors: {
        origin: "https://orbemorder.local",  // Replace with the origin of your WordPress site
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');
    // Listen for the 'updateElement' event from the client
    socket.on('updateElement', (data) => {
        console.log('Element data received:', data); // Debug: Check if server is receiving data
        // Broadcast the updated data to all connected clients
        io.emit('elementUpdated', data);
    });
});

// Listen on port 3030 (or any port you choose)
server.listen(3030, () => {
    console.log('WebSocket server running on https://localhost:3030');
});