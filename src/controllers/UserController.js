class UserController {
    constructor(prisma) { this.prisma = prisma; }
  
    async getProfile(req, res) {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, username: true, email: true, eloRating: true, createdAt: true
        }
      });
      if (!user) return res.status(404).json({ error: 'Not found' });
  
      const total = await this.prisma.match.count({
        where: {
          OR: [
            { player1Id: user.id },
            { player2Id: user.id }
          ]
        }
      });
      const wins = await this.prisma.match.count({
        where: { winnerId: user.id }
      });
  
      res.json({
        user,
        stats: {
          total,
          wins,
          losses: total - wins,
          winRate: total ? ((wins / total) * 100).toFixed(2) + '%' : '0%'
        }
      });
    }
  
    async getMatchHistory(req, res) {
      const page = +req.query.page || 1, limit = +req.query.limit || 10;
      const skip = (page - 1) * limit;
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id }
          ]
        },
        include: {
          problem: { select: { id: true, title: true, difficulty: true } },
          player1: { select: { id: true, username: true, eloRating: true } },
          player2: { select: { id: true, username: true, eloRating: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit
      });
      const total = await this.prisma.match.count({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id }
          ]
        }
      });
      res.json({
        matches,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  
    async getLeaderboard(req, res) {
      const page = +req.query.page || 1, limit = +req.query.limit || 10;
      const skip = (page - 1) * limit;
      const users = await this.prisma.user.findMany({
        select: {
          id: true, username: true, eloRating: true,
          _count: { select: { wonMatches: true } }
        },
        orderBy: { eloRating: 'desc' },
        skip, take: limit
      });
      const total = await this.prisma.user.count();
      res.json({
        leaderboard: users.map(u => ({
          id: u.id,
          username: u.username,
          eloRating: u.eloRating,
          wins: u._count.wonMatches
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  }
  
  module.exports = { UserController };
  