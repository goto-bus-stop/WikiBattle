const express = require('express')
const compression = require('compression')
const serveStatic = require('serve-static')
const path = require('path')
const http = require('http')
const debug = require('debug')('WikiBattle:app')

const wiki = require('./wiki')
const Player = require('./Player')
const WikiBattle = require('./WikiBattle')
const SocketEvents = require('./SocketEvents')
const WikiPages = require('./WikiPages')
const MatchMaker = require('./MatchMaker')

const PAGES_FILE = require.resolve('../pages.json')

const app = express()
const server = http.createServer(app)
const WebSocketServer = require('ws').Server
const ws = new WebSocketServer({ server })

app.use(compression())

const wikiPages = WikiPages(PAGES_FILE)
const matchMaker = MatchMaker({
  pages: wikiPages
})

ws.on('connection', (raw) => {
  let game
  const sock = SocketEvents(raw)
  const player = Player(sock)

  sock.on('gameType', (type, id) => {
    switch (type) {
      case 'pair':
        game = matchMaker.pair(player)
        break
      case 'new':
        game = matchMaker.new(player)
        break
      case 'join':
        try {
          game = matchMaker.join(player, id)
        } catch (e) {
          sock.emit('error', e.message)
          sock.close()
        }
        break
      default:
        sock.emit('error', 'invalid game type')
        sock.close()
        break
    }
  })

  sock.on('navigate', (to) => {
    game.navigate(player, decodeURIComponent(to))
  })

  sock.on('scroll', (top, areaWidth) => {
    if (typeof top === 'number') {
      game.notifyScroll(player, top, areaWidth)
    }
  })

  raw.on('close', () => {
    if (game) {
      game.disconnect(player)

      matchMaker.disconnected(game)
    }
  })
})

// index page + css + js
app.use(serveStatic(path.join(__dirname, '../public')))

// Wiki Article content
app.get('/wiki/:page', (req, res) => {
  wiki.get(req.params.page, (err, body) => {
    if (body) res.end(body.content)
    else throw err
  })
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.writeHead(err.status || 500, { 'content-type': 'text/html' })
    res.write(`<h1>${err.message}</h1>`)
    res.write(`<h2>${err.status}</h2>`)
    res.write(`<pre>${err.stack}</pre>`)
    res.end()
  })
}

// production error handler
app.use((err, req, res, next) => {
  res.writeHead(err.status || 500, { 'content-type': 'text/html' })
  res.write(`<h1>${err.message}</h1>`)
  res.write(`<h2>${err.status}</h2>`)
  res.end()
})

app.set('port', process.env.PORT || 3000)

server.listen(app.get('port'), () => {
  debug(`Express server listening on port ${server.address().port}`)
})
