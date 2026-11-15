const SHARES = [1, 0.5, 0.2];

// Smaller options are rounded down to the nearest MK50 so they look tidy.
const ROUND_TO = 50;

// Never offer a loan smaller than this.
const MIN_OPTION = 100;

function buildBorrowOptions(eligible) {
  // The most this member may borrow, as a whole number.
  const max = Math.floor(eligible);
  const options = [];

  SHARES.forEach((share, index) => {
    // The first option is the full maximum, exactly.
    // The others are a share of it, rounded down to a multiple of MK50.
    const amount =
      index === 0 ? max : Math.floor((max * share) / ROUND_TO) * ROUND_TO;

    // Keep the amount only if it is big enough and not already listed.
    if (amount >= MIN_OPTION && !options.includes(amount)) {
      options.push(amount);
    }
  });

  return options;
}

module.exports = { buildBorrowOptions };
