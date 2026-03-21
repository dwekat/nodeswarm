const workerpool = require("workerpool");
const {
  fibonacci,
  countPrimes,
  mixedWorkload,
} = require("../dist/workloads");

workerpool.worker({
  fibonacci,
  countPrimes,
  mixedWorkload,
});

