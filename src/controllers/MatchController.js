class MatchController {
    constructor(prisma) { this.prisma = prisma; }
  
    async findMatch(req, res) {
      res.json({ message: 'Connect via WSS to find your opponent' });
    }
  
    async submitSolution(req, res) {
      const { matchId, code, language } = req.body;
      if (!matchId || !code || !language)
        return res.status(400).json({ error: 'Missing fields' });
  
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: { problem: true }
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (![match.player1Id, match.player2Id].includes(req.user.id))
        return res.status(403).json({ error: 'Not in this match' });
      if (match.winnerId)
        return res.status(400).json({ error: 'Match already completed' });
  
      res.status(202).json({
        message: 'Solution received; evaluation via WSS in progress',
        submissionId: `${matchId}-${req.user.id}`
      });
    }
  
    async getMatchDetails(req, res) {
      const match = await this.prisma.match.findUnique({
        where: { id: req.params.id },
        include: {
          problem: {
            select: {
              id: true, title: true, description: true,
              difficulty: true, exampleInput: true, exampleOutput: true
            }
          },
          player1: { select: { id: true, username: true, eloRating: true } },
          player2: { select: { id: true, username: true, eloRating: true } }
        }
      });
      if (!match) return res.status(404).json({ error: 'Not found' });
      if (![match.player1Id, match.player2Id].includes(req.user.id))
        return res.status(403).json({ error: 'Not in match' });
      res.json({ match });
    }
  }
  
  module.exports = { MatchController };
  