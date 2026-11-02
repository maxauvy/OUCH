// A small WebDAV server for tests and for trying the feature by hand: one
// folder tree in memory, Basic authentication, and CORS that can be switched
// off (to see what a server without it looks like from the page).
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface TestServer {
  url: string
  /** Paths (`/OUCH/name`) to the file contents. */
  files: Map<string, string>
  folders: Set<string>
  requests: string[]
  close(): Promise<void>
}

export async function startWebdavServer(opts: { user?: string; password?: string; origin?: string; cors?: boolean; port?: number } = {}): Promise<TestServer> {
  const user = opts.user ?? 'moi'
  const password = opts.password ?? 'secret'
  const cors = opts.cors ?? true
  const files = new Map<string, string>()
  const folders = new Set<string>(['/'])
  const requests: string[] = []
  const wanted = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`

  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0])
    requests.push(`${req.method} ${path}`)
    if (cors) {
      res.setHeader('Access-Control-Allow-Origin', opts.origin ?? '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth')
    }
    if (req.method === 'OPTIONS') return void res.writeHead(204).end()
    if (req.headers.authorization !== wanted) return void res.writeHead(401, { 'WWW-Authenticate': 'Basic' }).end()
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = Buffer.concat(chunks).toString('utf8')
    const folderPath = path.endsWith('/') ? path : `${path}/`

    switch (req.method) {
      case 'MKCOL':
        if (folders.has(folderPath)) return void res.writeHead(405).end()
        folders.add(folderPath)
        return void res.writeHead(201).end()
      case 'PUT': {
        const parent = path.slice(0, path.lastIndexOf('/') + 1)
        if (!folders.has(parent)) return void res.writeHead(409).end()
        const existed = files.has(path)
        files.set(path, body)
        return void res.writeHead(existed ? 204 : 201).end()
      }
      case 'GET':
        if (!files.has(path)) return void res.writeHead(404).end()
        return void res.writeHead(200).end(files.get(path))
      case 'DELETE':
        if (!files.delete(path)) return void res.writeHead(404).end()
        return void res.writeHead(204).end()
      case 'PROPFIND': {
        if (!folders.has(folderPath)) return void res.writeHead(404).end()
        const entries = [`<d:response><d:href>${folderPath}</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>`]
        if (req.headers.depth === '1') {
          for (const [p, text] of files) {
            if (!p.startsWith(folderPath) || p.slice(folderPath.length).includes('/')) continue
            const href = encodeURI(p)
            entries.push(
              `<d:response><d:href>${href}</d:href><d:propstat><d:prop><d:resourcetype/><d:getcontentlength>${Buffer.byteLength(text)}</d:getcontentlength><d:getlastmodified>Tue, 13 Oct 2026 08:00:00 GMT</d:getlastmodified></d:prop></d:propstat></d:response>`
            )
          }
        }
        return void res.writeHead(207, { 'Content-Type': 'application/xml' }).end(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">${entries.join('')}</d:multistatus>`)
      }
      default:
        return void res.writeHead(405).end()
    }
  })
  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/`,
    files,
    folders,
    requests,
    close: () => new Promise((resolve) => (server.closeAllConnections(), server.close(() => resolve()))),
  }
}
