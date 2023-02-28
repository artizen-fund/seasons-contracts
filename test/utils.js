const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");

const currentTime = async () => {
  const { timestamp } = await ethers.provider.getBlock("latest");
  return timestamp;
};

const fastForward = async (seconds) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
};
module.exports = {
  fastForward,
  currentTime,
};
