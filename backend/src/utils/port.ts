import { createServer } from 'net'

/**
 * Checks if a port is available
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })
    
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    
    server.listen(port)
  })
}

/**
 * Finds the next available port starting from a given port
 * @param startPort - The port to start checking from (default: 3000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 */
export const findAvailablePort = async (
  startPort: number = 3000,
  maxAttempts: number = 100
): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const available = await isPortAvailable(port)
    
    if (available) {
      return port
    }
    
    console.log(`Port ${port} is already in use, trying next port...`)
  }
  
  throw new Error(`Could not find an available port after trying ${maxAttempts} ports starting from ${startPort}`)
}

