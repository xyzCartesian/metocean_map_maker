import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// Serves the large tile assets from ./tiles during development without
// copying them into the build output. Production uses VITE_TILES_BASE (R2).
function serveTilesInDev(): Plugin {
  return {
    name: 'serve-tiles-in-dev',
    configureServer(server) {
      server.middlewares.use('/tiles', (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        const filePath = resolve(__dirname, 'tiles', url)

        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          return next()
        }

        const totalSize = statSync(filePath).size
        const range = req.headers.range

        // PMTiles requires HTTP range request support.
        if (range) {
          const match = /bytes=(\d+)-(\d*)/.exec(range)
          if (match) {
            const start = Number(match[1])
            const end = match[2] ? Number(match[2]) : totalSize - 1
            res.statusCode = 206
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`)
            res.setHeader('Accept-Ranges', 'bytes')
            res.setHeader('Content-Length', end - start + 1)
            createReadStream(filePath, { start, end }).pipe(res)
            return
          }
        }

        res.setHeader('Content-Length', totalSize)
        res.setHeader('Accept-Ranges', 'bytes')
        createReadStream(filePath).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveTilesInDev()],
})
