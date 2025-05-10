class CodingProblemService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async getRandomProblem() {
      const count = await this.prisma.problem.count();
      const skip = Math.floor(Math.random() * count);
      const problem = await this.prisma.problem.findFirst({ skip, take: 1 });
      if (!problem) throw new Error('No problems available');
      return problem;
    }
  }
  
  module.exports = { CodingProblemService };
  