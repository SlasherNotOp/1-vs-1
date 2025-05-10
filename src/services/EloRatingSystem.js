const { calculateNewRatings } = require('../utils/eloCalculator');

class EloRatingSystem {
  constructor(k = 32) {
    this.k = k;
  }

  calculate(p1Rating, p2Rating, p1Won) {
    const { nr1, nr2 } = calculateNewRatings(p1Rating, p2Rating, p1Won, this.k);
    return {
      player1NewRating: nr1,
      player2NewRating: nr2,
      player1Change: nr1 - p1Rating,
      player2Change: nr2 - p2Rating
    };
  }
}

module.exports = { EloRatingSystem };
