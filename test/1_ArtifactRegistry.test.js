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

    // set token price split percentages
    await RegistryInstance.connect(owner).setTreasurySplitPercentage(10);
    await RegistryInstance.connect(owner).setArtistFeePercentage(50);

    // set protocol and treasury wallet address
    await RegistryInstance.connect(owner).setProtocolWalletAddress(
      ownerAddress
    );

    await RegistryInstance.connect(owner).setTreasuryAddress(ownerAddress);

    // set token price

    await RegistryInstance.connect(owner).setTokenPrice(
      ethers.utils.parseEther("100")
    );
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
    it("sets sets protocol fee  and treasury fee split percentage properly", async () => {
      await RegistryInstance.connect(owner).setTreasurySplitPercentage(
        BigNumber.from("5")
      );
      await RegistryInstance.connect(owner).setProtocolFeePercentage(
        BigNumber.from("10")
      );

      expect(await RegistryInstance.getProtocolFeeSplitPercentage()).to.equal(
        BigNumber.from("10")
      );
      expect(await RegistryInstance.getTreasurySplitPercentage()).to.equal(
        BigNumber.from("5")
      );
    });
    it("contract shuts down if shutdown is turned on", async () => {
      await RegistryInstance.connect(owner).shutdown(true);

      await expect(
        RegistryInstance.connect(owner).createSeason(startTime, endTime)
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');
      await expect(
        RegistryInstance.connect(owner).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');

      await expect(
        RegistryInstance.connect(owner).mintArtifact(124, [5])
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');
    });
  });
  describe("createSubmission function", function () {
    it("registers submission details properly ", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      const submission = await RegistryInstance.getSubmission(
        BigNumber.from(124)
      );
      console.log(submission.toString());

      expect(await submission[0].toString()).to.equal("124");
      expect(await submission[1]).to.equal(1);
      expect(await submission[2]).to.equal("");
      expect(await submission[3]).to.equal(buyer1Address);
    });
    it("only owner can create submission", async () => {
      await expect(
        RegistryInstance.connect(buyer1).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("submissonID and tokenID should be the same", async () => {
      //TODO
    });
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
    it("msg.value has to be equal to token price", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await expect(
        RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("10"),
        })
      ).to.be.revertedWith('IncorrectAmount("")');
    });
    it.only("mints correct tokenID for submission", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      expect(await RegistryInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await RegistryInstance.balanceOf(buyer2Address, 124)).to.equal(2);
      expect(await RegistryInstance.balanceOf(ownerAddress, 124)).to.equal(2);
    });
  });
  it("mints the same amounts to 3 different addresses", async () => {
    await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    await RegistryInstance.connect(owner).createSubmission(
      1,
      "",
      buyer2Address
    );
    await RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
      value: ethers.utils.parseEther("600"),
    });

    expect(await RegistryInstance.balanceOf(buyer1Address, 124)).to.equal(2);
    expect(await RegistryInstance.balanceOf(buyer2Address, 124)).to.equal(2);
    expect(await RegistryInstance.balanceOf(ownerAddress, 124)).to.equal(2);
  });

  it("users cant mint if a season is closed", async () => {
    await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    await RegistryInstance.connect(owner).createSubmission(
      1,
      "",
      buyer1Address
    );

    await RegistryInstance.connect(owner).closeSeason(1);
    await expect(
      RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      })
    ).to.be.revertedWith("SeasonAlreadyClosed(1)");
  });
  it("sets correct tokenURI for each token", async () => {
    //TODO
    // await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    // await RegistryInstance.connect(owner).createSubmission(
    //   1,
    //   "",
    //   buyer1Address
    // );
    // await RegistryInstance.connect(owner).createSubmission(
    //   1,
    //   "blabla",
    //   buyer1Address
    // );
    // await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
    //   value: ethers.utils.parseEther("100"),
    // });
    // await RegistryInstance.connect(buyer2).mintArtifact(125, [2], {
    //   value: ethers.utils.parseEther("100"),
    // });
    // expect(await RegistryInstance.uri(124)).to.be.equal("");
    // expect(await RegistryInstance.uri(125)).to.be.equal("blabla");
  });
  it.only("splits token price correctly", async () => {
    await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    await RegistryInstance.connect(owner).createSubmission(
      1,
      "",
      buyer1Address
    );

    const balanceBefore = await buyer1.getBalance();
    const ownerBalBefore = await owner.getBalance();

    console.log(balanceBefore.toString());
    await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
      value: ethers.utils.parseEther("600"),
    });

    const ownerBalAfter = await owner.getBalance();
    console.log(ownerBalAfter);
    const balanceAfter = await buyer1.getBalance();
    console.log(balanceAfter.toString());

    // TODO splits correct amount of money, need to figure out maths
    // expect(await owner.getBalance()).to.equal(
    //   ethers.utils.parseEther("1000059")
    // );
    // expect(await buyer1.getBalance()).to.equal(
    //   ethers.utils.parseEther("1000300")
    // );
  });
  it("sets correct tokenURI for each token", async () => {});
  it("buyer receives correct amount and tokenIDs of NFTs after purchase", async () => {});
  it("saves top artifact buyer correctly", async () => {
    await RegistryInstance.connect(owner).createSeason(startTime, endTime);
    await RegistryInstance.connect(owner).createSubmission(
      1,
      "",
      buyer1Address
    );

    await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
      value: ethers.utils.parseEther("600"),
    });

    expect(await RegistryInstance.getTopBuyerPerArtifact(124)).to.equal(
      buyer2Address
    );
  });
  it("getLatestTokenID returns correct tokenIDs", async () => {
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
  it("getprotocolWalletAddress returns correct wallet address", async () => {
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
  it("withdrawing protocol fees works properly", async () => {});
});
