const express = require('express')
const cors = require("cors");
const { Server } = require("socket.io");
const { spawn } = require('node-pty')
const { execSync } = require('child_process')
const app = express()
const port = 6001


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.get('/', (req, res) => {
    res.send('Hello World!')
})

let server = app.listen(port, () => {
    console.log(`Lab listening on port ${port}`)
})

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("a user connected");


    socket.on('start', (data) => {

        console.log('Client started:', socket.id);


        // 1) Spin up a brand-new Docker container (ephemeral)
        let containerId;
        try {
            containerId = execSync('docker run --rm -d -it ts4udocker/ubuntu-custom bash')
                .toString()
                .trim();
            console.log('Container ID:', containerId);
            // Execute a command inside the container without sudo
            // execSync(`docker exec ${containerId} apt update`);
            // execSync(`docker exec ${containerId} apt install -y sudo`); // If you still want sudo
        } catch (error) {
            console.error('Error starting Docker container:', error);
            socket.emit('error', 'Failed to start container');
            socket.disconnect();
            return;
        }

        // 2) Attach to container shell with node-pty
        const shell = spawn('docker', ['exec', '-it', containerId, 'bash'], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME,
            env: process.env,
        });

        // 3) Relay data from shell -> Socket.IO
        shell.onData((data) => {
            socket.emit('output', data);
        });

        // Relay data from Socket.IO -> shell
        socket.on('input', (data) => {
            shell.write(data);
        });

        // Handle shell exit
        shell.onExit(() => {
            socket.disconnect();
        });

        // 4) Cleanup on disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            try {
                execSync(`docker stop ${containerId}`);
                console.log(`Stopped container ${containerId}`);
            } catch (e) {
                console.warn(`Failed to stop container ${containerId}:`, e);
            }
            shell.kill();
        });

        // Handle shell errors
        shell.on('error', (err) => {
            console.error('Shell error:', err);
            socket.emit('error', 'Shell encountered an error');
            socket.disconnect();
        });

        // Handle Socket.IO errors
        socket.on('error', (err) => {
            console.error('Socket.IO error:', err);
            try {
                execSync(`docker stop ${containerId}`);
                console.log(`Stopped container ${containerId} due to Socket.IO error`);
            } catch (e) {
                console.warn(`Failed to stop container ${containerId}:`, e);
            }
            shell.kill();
        });





    });



    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    ;
});