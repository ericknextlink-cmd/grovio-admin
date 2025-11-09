"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAvailablePort = exports.isPortAvailable = void 0;
const net_1 = require("net");
/**
 * Checks if a port is available
 */
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = (0, net_1.createServer)();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            }
            else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};
exports.isPortAvailable = isPortAvailable;
/**
 * Finds the next available port starting from a given port
 * @param startPort - The port to start checking from (default: 3000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 */
const findAvailablePort = async (startPort = 3000, maxAttempts = 100) => {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        const available = await (0, exports.isPortAvailable)(port);
        if (available) {
            return port;
        }
        console.log(`Port ${port} is already in use, trying next port...`);
    }
    throw new Error(`Could not find an available port after trying ${maxAttempts} ports starting from ${startPort}`);
};
exports.findAvailablePort = findAvailablePort;
