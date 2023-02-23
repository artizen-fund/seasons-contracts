const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
// const { constants } = require("./utils/TestConstants");
// const {
//   createGrantObject,
//   createDonationObject,
//   fastForward,
//   currentTime,
// } = require("./utils/TestUtils");

describe("Artifact Registry Tests", function () {
  beforeEach(async () => {});
  describe("Setter functions", function () {
    it("sets up dao wallet address properly", async () => {});
    it("sets token price properly", async () => {});
    it("sets  sets fee split percentage properly", async () => {});
    it("shutdown works properly", async () => {});
    it("contract shuts down if shutdown is turned on", async () => {});
  });
  describe("createSubmission function", function () {
    it("registers submission details properly ", async () => {});
  });
  describe("closeSeason function", function () {
    it("cannot close a season that's already been closed", async () => {});
    it("users cant mint if a season is closed", async () => {});
    it("emits seasonClosed event properly", async () => {});
  });
  describe("mintArtifact function", function () {
    it("msg.value has to be equal to token price", async () => {});
    it("mints correct tokenID for submission", async () => {});
    it("mints 3 times the amount given", async () => {});
    it("mints the same amounts to 3 different addresses", async () => {});
    it("sets correct tokenURI for each token", async () => {});
    it("splits token price correctly", async () => {});
    it("sets correct tokenURI for each token", async () => {});
  });

  describe("View functions", function () {
    it("getArtizenWalletAddress returns correct wallet address", async () => {});
    it("getLatestTokenID returns correct tokenIDs", async () => {});
    it("getTopBuyerOfSeason returns top buyer of season correctly", async () => {});
    it("getTotalTokenSales returns correct amount of tokens sold", async () => {});
    it("getTopBuyer returns top buyer per submission correctly", async () => {});
  });
});
