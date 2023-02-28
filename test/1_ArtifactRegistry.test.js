const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
const { fastForward, currentTime } = require("./utils");

let RegistryContract;
let RegistryInstance;
let owner, buyer1, buyer2, buyer3;
let ownerAddress, buyer1Address, buyer2Address, buyer3Address;

describe("Artifact Registry Tests", function () {
  beforeEach(async () => {
    [owner, buyer1, buyer2, buyer3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    buyer1Address = await buyer1.getAddress();
    buyer2Address = await buyer2.getAddress();
    buyer3Address = await buyer3.getAddress();

    RegistryContract = await ethers.getContractFactory("ArtifactRegistry");
    RegistryInstance = await upgrades.deployProxy(RegistryContract, []);

    startTime = await currentTime();
    endTime = startTime + 2629800;
  });
  describe("Setter functions", function () {
    it("sets up protocol wallet address properly", async () => {
      await RegistryInstance.connect(owner).setProtocolWalletAddress(
        ownerAddress
      );

      expect(await RegistryInstance.getprotocolWalletAddress()).to.equal(
        ownerAddress
      );
    });
    it("sets token price properly", async () => {
      await RegistryInstance.connect(owner).setTokenPrice(BigNumber.from("1"));

      expect(await RegistryInstance.getTokenPrice()).to.equal(
        BigNumber.from("1")
      );
    });
    it("sets sets fee split percentage properly", async () => {
      await RegistryInstance.connect(owner).setArtizenFeeSplitPercentage(
        BigNumber.from("10")
      );

      expect(await RegistryInstance.getSplitPercentage()).to.equal(
        BigNumber.from("10")
      );
    });
    it("contract shuts down if shutdown is turned on", async () => {
      await RegistryInstance.connect(owner).shutdown(true);

      //TODO
      // await expect(RegistryInstance.connect(owner).createSubmission());
    });
  });
  describe("createSubmission function", function () {
    it("registers submission details properly ", async () => {});
    it("only owner can create submission", async () => {});
    it("submissonID and tokenID should be the same", async () => {});
  });
  describe("createSeason function", function () {
    it("registers submission details properly", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      const season = await RegistryInstance.getSeason(1);
      console.log(season.toString());
      console.log(season[5].toString());
      expect(await season[0].toString()).to.equal("124,125");
      expect(await season[1].toString()).to.equal("124,125");
      expect(await season[2].toString()).to.equal("");
      expect(await season[3].toString()).to.equal("");
      expect(await season[4]).to.equal(startTime);
      expect(await season[5]).to.equal(endTime);
      expect(await season[6]).to.equal(0);
      expect(await season[7]).to.equal(false);
    });
    it("reverts if incorrect times given", async () => {
      await expect(
        RegistryInstance.connect(owner).createSeason(endTime, startTime)
      ).to.be.revertedWith('IncorrectTimesGiven("Incorrect times given")');
    });
    it("only owner can create season", async () => {
      await expect(
        RegistryInstance.connect(buyer1).createSeason(startTime, endTime)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("closeSeason function", function () {
    it("cannot close a season that's already been closed", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await RegistryInstance.connect(owner).closeSeason(1);
      await expect(
        RegistryInstance.connect(owner).closeSeason(1)
      ).to.be.revertedWith("SeasonAlreadyClosed(1)");
    });

    it("only owner can close season submission", async () => {
      await expect(
        RegistryInstance.connect(buyer1).closeSeason(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("mintArtifact function", function () {
    it("msg.value has to be equal to token price", async () => {});
    it("mints correct tokenID for submission", async () => {});
    it("mints 3 times the amount given", async () => {});
    it("mints the same amounts to 3 different addresses", async () => {});
    it("users cant mint if a season is closed", async () => {});
    it("sets correct tokenURI for each token", async () => {});
    it("splits token price correctly", async () => {});
    it("sets correct tokenURI for each token", async () => {});
  });
  it.only("getLatestTokenID returns correct tokenIDs", async () => {
    await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    await RegistryInstance.connect(owner).createSubmission(
      1,
      "",
      buyer1Address
    );
    expect(await RegistryInstance.getLatestTokenID(1)).to.equal(124);
  });
});

describe("View functions", function () {
  it.only("getprotocolWalletAddress returns correct wallet address", async () => {
    await RegistryInstance.connect(owner).setProtocolWalletAddress(
      ownerAddress
    );
    expect(await RegistryInstance.getprotocolWalletAddress()).to.equal(
      ownerAddress
    );
  });

  it("getTopBuyerOfSeason returns top buyer of season correctly", async () => {});
  it("getTotalTokenSales returns correct amount of tokens sold", async () => {});
  it("getTopBuyer returns top buyer per submission correctly", async () => {});
  it("getTopSubmissionOfSeason returns top submission for season correctly", async () => {});
});
