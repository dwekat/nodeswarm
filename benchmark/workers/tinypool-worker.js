const {
  fibonacci,
  countPrimes,
  mixedWorkload,
} = require("../dist/workloads");

module.exports = async ({ type, args }) => {
  switch (type) {
    case "fibonacci":
      return fibonacci(...args);
    case "countPrimes":
      return countPrimes(...args);
    case "mixedWorkload":
      return mixedWorkload(...args);
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
};

