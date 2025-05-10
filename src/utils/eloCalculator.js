function getExpectedScore(rating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  }
  
  function calculateNewRatings(r1, r2, r1Won, k = 32) {
    const e1 = getExpectedScore(r1, r2);
    const e2 = getExpectedScore(r2, r1);
    const s1 = r1Won ? 1 : 0;
    const s2 = r1Won ? 0 : 1;
    const nr1 = Math.round(r1 + k * (s1 - e1));
    const nr2 = Math.round(r2 + k * (s2 - e2));
    return { nr1, nr2 };
  }
  
  module.exports = { calculateNewRatings };
  