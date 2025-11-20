const workerpool = require("workerpool");
const {
  fibonacci,
  countPrimes,
  mixedWorkload,
} = require("../workloads");

workerpool.worker({
  fibonacci,
  countPrimes,
  mixedWorkload,
});

