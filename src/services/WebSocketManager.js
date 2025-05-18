const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../models/prismaClient');
const { MatchmakingSystem } = require('./MatchmakingSystem');
const { CodingProblemService } = require('./CodingProblemService');
const { Judge0Service } = require('./Judge0Service');
const { EloRatingSystem } = require('./EloRatingSystem');

class WebSocketManager {
  constructor(wss) {
    this.wss = wss;
    this.judgeService = new Judge0Service();
    this.eloSystem = new EloRatingSystem();
    this.matchmaking = new MatchmakingSystem(
      new CodingProblemService(prisma)
    );

    this.connected = new Map();     // userId -> ws
    this.activeMatches = new Map(); // matchId -> matchInfo
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => (ws.isAlive = true));

      ws.on('message', async (data) => {
        let msg;
        try { msg = JSON.parse(data); }
        catch { return ws.send(JSON.stringify({ event:'error', message:'Invalid JSON' })); }

        const { event, payload } = msg;
        switch (event) {
          case 'authenticate': 
            return this.handleAuth(ws, payload);
          case 'find_match': 
            return this.handleFindMatch(ws);
          case 'cancel_matchmaking':
            return this.handleCancel(ws);
          case 'cancel_match':
            return this.handleCancelMatch(ws,payload);
          case 'submit_code':
            return this.handleSubmit(ws, payload);
          default:
            return ws.send(JSON.stringify({ event:'error', message:'Unknown event' }));
        }
      });

      ws.on('close', () => {
        if (ws.userId) {
          this.matchmaking.removeFromQueue(ws.userId);
          this.connected.delete(ws.userId);
        }
      });
    });

    // Ping‐pong to detect dead clients
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  async handleAuth(ws, { token }) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where:{ id: decoded.id }});
      if (!user) throw new Error('User not found');
      ws.userId = user.id;
      ws.username = user.username;
      ws.eloRating = user.eloRating;
      this.connected.set(user.id, ws);
      ws.send(JSON.stringify({
        event: 'authenticated',
        user: { id: user.id, username: user.username, eloRating: user.eloRating }
      }));
    } catch (e) {
      ws.send(JSON.stringify({ event:'authentication_error', message: e.message }));
    }
  }

  handleFindMatch(ws) {
    if (!ws.userId) return ws.send(JSON.stringify({ event:'error', message:'Not authenticated' }));
    const player = { id: ws.userId, username: ws.username, eloRating: ws.eloRating };
    ws.send(JSON.stringify({ event:'matchmaking_status', status:'searching' }));
    const opponent = this.matchmaking.addToQueue(player);
    if (opponent) this._createMatch(player, opponent);
  }

  handleCancel(ws) {
    if (ws.userId) {
      this.matchmaking.removeFromQueue(ws.userId);
      ws.send(JSON.stringify({ event:'matchmaking_status', status:'cancelled' }));
    }
  }
  
  async handleCancelMatch(ws, { matchId }) {
    if (!ws.userId) {
      return ws.send(JSON.stringify({ event: 'error', message: 'Not authenticated' }));
    }
  
    const match = this.activeMatches.get(matchId);
    if (!match) {
      return ws.send(JSON.stringify({ event: 'error', message: 'Match not found or already canceled' }));
    }
  
    // Confirm user is in the match
    const isPlayerInMatch = [match.player1.id, match.player2.id].includes(ws.userId);
    if (!isPlayerInMatch) {
      return ws.send(JSON.stringify({ event: 'error', message: 'You are not part of this match' }));
    }
  
    // Notify both players
    const cancelPayload = {
      event: 'match_cancelled',
      matchId,
      cancelledBy: ws.userId
    };
  
    [match.player1.id, match.player2.id].forEach((uid) => {
      const client = this.connected.get(uid);
      if (client) client.send(JSON.stringify(cancelPayload));
    });

    const isP1=ws.userId===match.player1.id;

    const ratings = this.eloSystem.calculate(
      match.player1.eloRating,
      match.player2.eloRating,
      isP1
    );
    match.player1.newEloRating = ratings.player1NewRating;
    match.player2.newEloRating = ratings.player2NewRating;

    // Persist to DB
    await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId: isP1?match.player1.id:match.player2.id,
        endTime: new Date(),
      }
    });
    await prisma.user.update({ where:{ id: match.player1.id }, data:{ eloRating: ratings.player1NewRating }});
    await prisma.user.update({ where:{ id: match.player2.id }, data:{ eloRating: ratings.player2NewRating }});
  
    // Remove match from activeMatches
    this.activeMatches.delete(matchId);
  }
  

  async handleSubmit(ws, { matchId, code, language }) {
    if (!ws.userId) return ws.send(JSON.stringify({ event:'error', message:'Not authenticated' }));
    const match = this.activeMatches.get(matchId);
    if (!match) return ws.send(JSON.stringify({ event:'error', message:'Match not found' }));
    if (![match.player1.id, match.player2.id].includes(ws.userId)) {
      return ws.send(JSON.stringify({ event:'error', message:'Not in this match' }));
    }
    if (match.winner) {
      return ws.send(JSON.stringify({ event:'error', message:'Match already finished' }));
    }

    ws.send(JSON.stringify({ event:'submission_status', status:'processing' }));
    const testCases = await prisma.testCase.findMany({ where:{ problemId: match.problem.id }});
    console.log(testCases,'testCases')
    const tokens = await this.judgeService.submitCode(code, language, testCases);
    console.log(tokens,'tokens')
    const results = await this.judgeService.getSubmissionResults(tokens);
    console.log(results,'results')


    if (results.allTestsPassed) {
      const isP1 = match.player1.id === ws.userId;
      const winner = isP1 ? match.player1 : match.player2;
      match.winner = winner;

      const ratings = this.eloSystem.calculate(
        match.player1.eloRating,
        match.player2.eloRating,
        isP1
      );
      match.player1.newEloRating = ratings.player1NewRating;
      match.player2.newEloRating = ratings.player2NewRating;

      // Persist to DB
      await prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId: winner.id,
          endTime: new Date(),
          player1Language: isP1 ? language : match.player1Language,
          player2Language: isP1 ? match.player2Language : language,
          player1Solution: isP1 ? code : match.player1Solution,
          player2Solution: isP1 ? match.player2Solution : code
        }
      });
      await prisma.user.update({ where:{ id: match.player1.id }, data:{ eloRating: ratings.player1NewRating }});
      await prisma.user.update({ where:{ id: match.player2.id }, data:{ eloRating: ratings.player2NewRating }});

      this._notifyMatchResult(match, winner.id, ratings);
    } else {
      ws.send(JSON.stringify({
        event:'submission_status',
        status:'failed',
        message: `Passed ${results.passedTests}/${results.totalTests}`
      }));
    }
  }

  async _createMatch(p1, p2) {
    const { problem, startTime } = await this.matchmaking.createMatch(p1, p2);
    const dbMatch = await prisma.match.create({
      data: { player1Id: p1.id, player2Id: p2.id, problemId: problem.id, startTime }
    });

    const info = { id: dbMatch.id, player1: p1, player2: p2, problem, startTime, winner: null };
    this.activeMatches.set(dbMatch.id, info);
    this._notifyMatchFound(info);
  }

  _notifyMatchFound(match) {
    [match.player1, match.player2].forEach(player => {
      const ws = this.connected.get(player.id);
      if (!ws) return;
      ws.send(JSON.stringify({
        event: 'match_found',
        matchId: match.id,
        opponent: {
          id: player.id === match.player1.id ? match.player2.id : match.player1.id,
          username: player.id === match.player1.id
            ? match.player2.username
            : match.player1.username,
          eloRating: player.id === match.player1.id
            ? match.player2.eloRating
            : match.player1.eloRating
        },
        problem: match.problem,
        startTime: match.startTime
      }));
    });
  }

  _notifyMatchResult(match, winnerId, ratings) {
    const payload = {
      event: 'match_result',
      matchId: match.id,
      winner: {
        id: winnerId,
        username:
          winnerId === match.player1.id
            ? match.player1.username
            : match.player2.username
      },
      player1: {
        id: match.player1.id,
        oldRating: match.player1.eloRating,
        newRating: ratings.player1NewRating
      },
      player2: {
        id: match.player2.id,
        oldRating: match.player2.eloRating,
        newRating: ratings.player2NewRating
      }
    };

    [match.player1.id, match.player2.id].forEach(uid => {
      const ws = this.connected.get(uid);
      if (ws) ws.send(JSON.stringify({
        ...payload,
        isWinner: uid === winnerId
      }));
    });

    // cleanup
    setTimeout(() => this.activeMatches.delete(match.id), 5 * 60 * 1000);
  }
}

module.exports = { WebSocketManager };
