const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
const { fastForward, currentTime } = require("./utils");

let SeasonsContract;
let SeasonsInstance;
let owner, buyer1, buyer2, buyer3;
let ownerAddress, buyer1Address, buyer2Address, buyer3Address;

describe("Artifact Registry Tests", function () {
  beforeEach(async () => {
    [owner, buyer1, buyer2, buyer3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    buyer1Address = await buyer1.getAddress();
    buyer2Address = await buyer2.getAddress();
    buyer3Address = await buyer3.getAddress();

    SeasonsContract = await ethers.getContractFactory("Seasons");
    SeasonsInstance = await upgrades.deployProxy(SeasonsContract, []);

    // set token price split percentages
    await SeasonsInstance.connect(owner).setTreasurySplitPercentage(10);
    await SeasonsInstance.connect(owner).setArtistFeePercentage(50);

    // set protocol and treasury wallet address
    await SeasonsInstance.connect(owner).setProtocolWalletAddress(ownerAddress);

    await SeasonsInstance.connect(owner).setTreasuryAddress(ownerAddress);

    // set token price

    await SeasonsInstance.connect(owner).setTokenPrice(
      ethers.utils.parseEther("100")
    );
    startTime = await currentTime();
    endTime = startTime + 2629800;
  });
  describe("Setter functions", function () {
    it("sets up protocol wallet address properly", async () => {
      await SeasonsInstance.connect(owner).setProtocolWalletAddress(
        ownerAddress
      );

      expect(await SeasonsInstance.getprotocolWalletAddress()).to.equal(
        ownerAddress
      );
    });
    it("emits event correctly", async () => {});
    it("sets token price properly", async () => {
      await SeasonsInstance.connect(owner).setTokenPrice(BigNumber.from("1"));

      expect(await SeasonsInstance.getTokenPrice()).to.equal(
        BigNumber.from("1")
      );
    });
    it("emits event correctly", async () => {});
    it("sets sets artist fee  and treasury fee split percentage properly", async () => {
      await SeasonsInstance.connect(owner).setTreasurySplitPercentage(
        BigNumber.from("5")
      );

      expect(await SeasonsInstance.getTreasurySplitPercentage()).to.equal(
        BigNumber.from("5")
      );
    });

    it("contract shuts down if shutdown is turned on", async () => {
      await SeasonsInstance.connect(owner).shutdown(true);

      await expect(
        SeasonsInstance.connect(owner).createSeason(startTime, endTime)
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');
      await expect(
        SeasonsInstance.connect(owner).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith("SeasonDoesntExist()");

      await expect(
        SeasonsInstance.connect(owner).mintArtifact(124, [5])
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');
    });
    it("only owner can call shutdown", async () => {
      await expect(
        SeasonsInstance.connect(buyer1).shutdown(true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("createSubmission function", function () {
    it("registers submission details properly ", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      const submission = await SeasonsInstance.getSubmission(
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
        SeasonsInstance.connect(buyer1).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("getSubmission reverts if submission doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await expect(SeasonsInstance.getSubmission(125)).to.be.revertedWith(
        "SubmissionDoesntExist()"
      );
    });
    it("revert's if season ended", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await fastForward(endTime + 100000);
      await expect(
        SeasonsInstance.connect(owner).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith("NoMoreSubmissionsToThisSeason(1)");
    });
    it("revert's if season is closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await SeasonsInstance.connect(owner).closeSeason(1);
      await expect(
        SeasonsInstance.connect(owner).createSubmission(1, "", buyer1Address)
      ).to.be.revertedWith("SeasonAlreadyClosed(1)");
    });
  });

  describe("createSeason function", function () {
    it("registers season details properly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      const season = await SeasonsInstance.getSeason(1);
      console.log(season.toString());
      console.log(season[5].toString());
      expect(await season[0].toString()).to.equal("124,125");
      expect(await season[1].toString()).to.equal("124,125");
      expect(await season[2].toString()).to.equal("");
      expect(await season[3]).to.equal(startTime);
      expect(await season[4]).to.equal(endTime);
      expect(await season[5]).to.equal(0);
      expect(await season[6]).to.equal(false);
    });
    it("reverts if incorrect times given", async () => {
      await expect(
        SeasonsInstance.connect(owner).createSeason(endTime, startTime)
      ).to.be.revertedWith('IncorrectTimesGiven("Incorrect times given")');
    });
    it("only owner can create season", async () => {
      await expect(
        SeasonsInstance.connect(buyer1).createSeason(startTime, endTime)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("getSeason reverts if season doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await expect(SeasonsInstance.getSeason(2)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
    });
  });
  describe("closeSeason function", function () {
    it("cannot close a season that's already been closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).closeSeason(1);
      await expect(
        SeasonsInstance.connect(owner).closeSeason(1)
      ).to.be.revertedWith("SeasonAlreadyClosed(1)");
    });

    it("only owner can close season submission", async () => {
      await expect(
        SeasonsInstance.connect(buyer1).closeSeason(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("transfers protocol fees to protocol wallet", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });
      const ownerBalBefore = await owner.getBalance();
      console.log(ownerBalBefore.toString());
      await SeasonsInstance.connect(owner).closeSeason(1);

      const ownerBalAfter = await owner.getBalance();
      console.log(ownerBalAfter.toString());
    });
  });
  describe("mintArtifact function", function () {
    it("msg.value has to be equal to token price", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("10"),
        })
      ).to.be.revertedWith('IncorrectAmount("")');
    });
    it("mints correct tokenID for submission", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(2);
    });

    it("mints the same amounts to 3 different addresses", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(2);
    });
    it("minting one token mints tokens correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact(124, [1], {
        value: ethers.utils.parseEther("100"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(1);
    });

    it("users cant mint if a season is closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).closeSeason(1);
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SeasonAlreadyClosed(1)");
    });
    it("sets correct tokenURI for each token", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "blabla",
        buyer1Address
      );
      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact(125, [2], {
        value: ethers.utils.parseEther("200"),
      });
      expect(await SeasonsInstance.uri(124)).to.be.equal("");
      expect(await SeasonsInstance.uri(125)).to.be.equal("blabla");
    });
    it("splits token price correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      const balanceBefore = await buyer1.getBalance();
      const ownerBalBefore = await owner.getBalance();

      console.log(balanceBefore.toString());
      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
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
    it.only("reverts if season ended already", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await fastForward(endTime + 1000000);

      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SeasonAlreadyClosed(1)");
    });
    it("reverts it wrong submission id is given", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact(125, [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SubmissionDoesntExist()");
    });
    it("buyer receives correct amount and tokenIDs of NFTs after purchase", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact(125, [3], {
        value: ethers.utils.parseEther("300"),
      });

      await SeasonsInstance.connect(buyer3).mintArtifact(126, [1], {
        value: ethers.utils.parseEther("100"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer3Address, 126)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(buyer1Address, 125)).to.equal(3);
    });
    it("saves top artifact buyer correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.getTopBuyerPerArtifact(124)).to.equal(
        buyer2Address
      );
    });
    it("getLatestTokenID returns correct tokenIDs", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      expect(await SeasonsInstance.getLatestTokenID(1)).to.equal(124);
    });
    it("getLatestTokenID reverts if season doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await expect(SeasonsInstance.getLatestTokenID(2)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
    });
  });
  describe("Events", function () {
    it("emits seasonCreated event correctly", async () => {
      expect(
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime)
      )
        .to.emit(SeasonsInstance, "seasonCreated")
        .withArgs(1);
    });
    it("emits submissionCreated event correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      expect(
        await SeasonsInstance.connect(owner).createSubmission(
          1,
          "",
          buyer2Address
        )
      )
        .to.emit(SeasonsInstance, "submissionCreated")
        .withArgs(124, buyer2Address);
    });
    it("emits protocolWalletAddressSet event correctly", async () => {
      expect(
        await SeasonsInstance.connect(owner).setProtocolWalletAddress(
          ownerAddress
        )
      )
        .to.emit(SeasonsInstance, "ProtocolWalletAddressSet")
        .withArgs(ownerAddress);
    });

    it("emits SeasonClosed event correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.connect(owner).closeSeason(1))
        .to.emit(SeasonsInstance, "SeasonClosed")
        .withArgs(1);
    });

    it("emits TokenPriceSet event correctly", async () => {
      expect(await SeasonsInstance.connect(owner).setTokenPrice(100))
        .to.emit(SeasonsInstance, "TokenPriceSet")
        .to.emit(100);
    });
    it("emits Shutdown event correctly", async () => {
      expect(await SeasonsInstance.connect(owner).shutdown(true))
        .to.emit(SeasonsInstance, "Shutdown")
        .withArgs(true);
    });
    it("emits TreasuryFeeSplitPercentageSet event correctly", async () => {
      expect(
        await SeasonsInstance.connect(owner).setTreasurySplitPercentage(10)
      )
        .to.emit(SeasonsInstance, "TreasuryFeeSplitPercentageSet")
        .withArgs(10);
    });
    it("emits ArtistFeePercentageSet event correctly", async () => {
      expect(await SeasonsInstance.connect(owner).setArtistFeePercentage(80))
        .to.emit(SeasonsInstance, "ArtistFeePercentageSet")
        .withArgs(80);
    });
    it("emits ArtifactMinted  event correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      expect(
        await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("200"),
        })
      )
        .to.emit(SeasonsInstance, "ArtifactMinted")
        .withArgs(buyer2Address, 124, 2);
    });

    it("emits FeesWithdrawn event correctly", async () => {
      await SeasonsInstance.connect(owner).setProtocolWalletAddress(
        buyer3Address
      );
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.connect(owner).withdrawProtocolFees())
        .to.emit(SeasonsInstance, "FeesWithdrawn")
        .withArgs("");
    });
  });
  describe("View functions", function () {
    it("getprotocolWalletAddress returns correct wallet address", async () => {
      await SeasonsInstance.connect(owner).setProtocolWalletAddress(
        ownerAddress
      );
      expect(await SeasonsInstance.getprotocolWalletAddress()).to.equal(
        ownerAddress
      );
    });
    it("getTotalTokenSales returns correct amount of tokens sold", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.getTotalTokenSales(124)).to.equal(4);
    });
    it("getTopBuyer returns top buyer per artifact correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer3).mintArtifact(124, [3], {
        value: ethers.utils.parseEther("300"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact(124, [5], {
        value: ethers.utils.parseEther("500"),
      });

      expect(await SeasonsInstance.getTopBuyerPerArtifact(124)).to.equal(
        buyer1Address
      );
    });
    it("getTopSubmissionOfSeason returns top submission for season correctly", async () => {
      // TODO - this test should be passing
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(127, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(128, [3], {
        value: ethers.utils.parseEther("300"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact(124, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(125, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(126, [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(owner).calculateTopSubmissionsOfSeason(1);

      await SeasonsInstance.connect(owner).calculateTopSubmissionsOfSeason(2);
      expect(
        await SeasonsInstance.connect(owner).getTopSubmissionsOfSeason(1)
      ).to.equal([BigNumber.from("124"), BigNumber.from("125")]);
      const seasonTwo = await SeasonsInstance.getSeason(2);
      console.log(seasonTwo.toString());
      expect(
        await SeasonsInstance.connect(owner).getTopSubmissionsOfSeason(2)
      ).to.equal([BigNumber.from("127")]);

      const winners = await SeasonsInstance.getSeason(1);
      console.log(winners.toString());
    });
    it("getTopSubmissionsOfSeason reverts if season doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await expect(
        SeasonsInstance.getTopSubmissionsOfSeason(2)
      ).to.be.revertedWith("SeasonDoesntExist()");
    });
    it("getTotalTokensPurchasedPerAddressInSeason returns the total amount of tokens purchased by an address in a season", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(127, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(128, [3], {
        value: ethers.utils.parseEther("300"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact(124, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(125, [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact(126, [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(
        await SeasonsInstance.getTotalTokensPurchasedPerAddressInSeason(
          buyer2Address,
          1
        )
      ).to.equal(10);
      expect(
        await SeasonsInstance.getTotalTokensPurchasedPerAddressInSeason(
          buyer2Address,
          2
        )
      ).to.equal(7);
    });
    it("getAmountToTokenIDsOfSeason returns an array of tokenIDs", async () => {
      // ** This is an internal function **
      // await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      // await SeasonsInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await SeasonsInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await SeasonsInstance.connect(buyer2).mintArtifact(124, [4], {
      //   value: ethers.utils.parseEther("400"),
      // });
      // await SeasonsInstance.connect(buyer2).mintArtifact(125, [4], {
      //   value: ethers.utils.parseEther("400"),
      // });
      // expect(await SeasonsInstance.getAmountToTokenIDsOfSeason(1, 4)).to.equal(
      //   [124, 125]
      // );
    });
    it("getLargestAmountOfTokensSoldInSeason returns larges amount of tokens sold in season", async () => {
      // ** This function is internal **
      // await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      // await SeasonsInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await SeasonsInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await SeasonsInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await SeasonsInstance.connect(buyer2).mintArtifact(124, [4], {
      //   value: ethers.utils.parseEther("1200"),
      // });
      // await SeasonsInstance.connect(buyer2).mintArtifact(125, [2], {
      //   value: ethers.utils.parseEther("600"),
      // });
      // await SeasonsInstance.connect(buyer2).mintArtifact(126, [2], {
      //   value: ethers.utils.parseEther("600"),
      // });
      // await SeasonsInstance.setTotalSalesOfTokenIDs(1);
      // expect(
      //   await SeasonsInstance.getLargestAmountOfTokensSoldInSeason(1)
      // ).to.equal(4);
    });
    it("withdrawing protocol fees works properly", async () => {
      await SeasonsInstance.connect(owner).setProtocolWalletAddress(
        buyer3Address
      );
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("200"),
      });

      const balanceBefore = await buyer3.getBalance();
      console.log(balanceBefore.toString());
      await SeasonsInstance.connect(owner).withdrawProtocolFees();

      const balanceAfter = await buyer3.getBalance();
      console.log(balanceAfter.toString());

      expect(await balanceAfter).to.equal(ethers.utils.parseEther("1000240"));
    });
  });
});
