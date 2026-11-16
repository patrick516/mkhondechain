const SHARES = [1, 0.5, 0.2];
const ROUND_TO = 50;
const MIN_OPTION = 100;

function buildBorrowOptions(eligible) {
  const max = Math.floor(eligible);
  const options = [];

  SHARES.forEach((share, index) => {
    const amount =
      index === 0 ? max : Math.floor((max * share) / ROUND_TO) * ROUND_TO;
    if (amount >= MIN_OPTION && !options.includes(amount)) {
      options.push(amount);
    }
  });

  return options;
}

module.exports = { buildBorrowOptions };
