class MatchmakingSystem {
    constructor(problemService) {
      this.problemService = problemService;
      this.queue = [];
    }
  
    addToQueue(user) {
      if (this.queue.find(u => u.id === user.id)) return null;
      this.queue.push(user);
      return this.findMatch(user);
    }
  
    removeFromQueue(userId) {
      this.queue = this.queue.filter(u => u.id !== userId);
    }
  
    findMatch(user) {
      const range = 100;
      const opponent = this.queue.find(
        u => u.id !== user.id && Math.abs(u.eloRating - user.eloRating) <= range
      );
      if (!opponent) return null;
      this.removeFromQueue(user.id);
      this.removeFromQueue(opponent.id);
      return opponent;
    }
  
    async createMatch(player1, player2) {
      const problem = await this.problemService.getRandomProblem();
      return { player1, player2, problem, startTime: new Date() };
    }
  }
  
  module.exports = { MatchmakingSystem };
  