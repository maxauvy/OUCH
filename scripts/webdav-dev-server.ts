// A WebDAV server on this machine to try OUCH's backup by hand:
//   node scripts/webdav-dev-server.ts            (CORS allowed for localhost:5173)
//   node scripts/webdav-dev-server.ts --no-cors  (what a server not set up for OUCH looks like)
// Address http://127.0.0.1:8080/, username moi, password secret. Nothing is kept on disk.
import { startWebdavServer } from '../tests/helpers/webdavServer.ts'

const cors = !process.argv.includes('--no-cors')
const server = await startWebdavServer({ port: 8080, origin: 'http://localhost:5173', cors })
console.log(`WebDAV on ${server.url} (user moi, password secret, CORS ${cors ? 'on' : 'off'}). Ctrl+C to stop.`)
