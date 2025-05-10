const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const env = require('./config/env');
const prisma = require('./models/prismaClient');

// REST Controllers & Routes
const { AuthController } = require('./controllers/AuthController');
const { UserController } = require('./controllers/UserController');
const { MatchController } = require('./controllers/MatchController');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');

// WSS Manager
const { WebSocketManager } = require('./services/WebSocketManager');

const app = express();
app.use(cors());
app.use(express.json());

// Mount REST routes
const authController = new AuthController(prisma);
const userController = new UserController(prisma);
const matchController = new MatchController(prisma);

app.get('/',(req,res)=>{
  res.send('1vs1 is working')
})

app.use('/api/auth', authRoutes(authController));
app.use('/api/user', userRoutes(userController));
app.use('/api/match', matchRoutes(matchController));

// Create HTTP server...
const server = http.createServer(app);

// ...and attach WSS on the same server under `/ws`
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize our WebSocketManager
new WebSocketManager(wss).initialize();

// Start listening
server.listen(env.PORT, () =>
  console.log(`HTTP + WSS server running on port ${env.PORT}`)
);
