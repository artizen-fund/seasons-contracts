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
    it("emits event correctly", async () => {});
    it("sets token price properly", async () => {
      await RegistryInstance.connect(owner).setTokenPrice(BigNumber.from("1"));

      expect(await RegistryInstance.getTokenPrice()).to.equal(
        BigNumber.from("1")
      );
    });
    it("emits event correctly", async () => {});
    it("sets sets artist fee  and treasury fee split percentage properly", async () => {
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

    it("emits event correctly", async () => {});
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
    it("emits event correctly", async () => {
      //TODO
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
    it("getSubmission reverts if submission doesn't exist", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await expect(RegistryInstance.getSubmission(125)).to.be.revertedWith(
        "SubmissionDoesntExist()"
      );
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
    it("getSeason reverts if season doesn't exist", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await expect(RegistryInstance.getSeason(2)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
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
    it("emits event correctly", async () => {
      //TODO
    });
    it("transfers protocol fees to artizen wallet", async () => {
      //TODO
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
    it("mints correct tokenID for submission", async () => {
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
    it.only("sets correct tokenURI for each token", async () => {
      //TODO
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "blabla",
        buyer1Address
      );
      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });
      await RegistryInstance.connect(buyer2).mintArtifact(125, [2], {
        value: ethers.utils.parseEther("600"),
      });
      expect(await RegistryInstance.uri(124)).to.be.equal("");
      expect(await RegistryInstance.uri(125)).to.be.equal("blabla");
    });
    it("splits token price correctly", async () => {
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
    it("buyer receives correct amount and tokenIDs of NFTs after purchase", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      await RegistryInstance.connect(buyer1).mintArtifact(125, [3], {
        value: ethers.utils.parseEther("900"),
      });

      await RegistryInstance.connect(buyer3).mintArtifact(126, [1], {
        value: ethers.utils.parseEther("300"),
      });

      expect(await RegistryInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await RegistryInstance.balanceOf(buyer3Address, 126)).to.equal(1);
      expect(await RegistryInstance.balanceOf(buyer1Address, 125)).to.equal(3);
    });
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
    it("getLatestTokenID reverts if season doesn't exist", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );
      await expect(RegistryInstance.getLatestTokenID(2)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
    });
    it("getTopBuyerOfSeason returns top buyer of season correctly", async () => {
      // TODO
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      await RegistryInstance.connect(buyer1).mintArtifact(125, [3], {
        value: ethers.utils.parseEther("900"),
      });

      await RegistryInstance.connect(buyer3).mintArtifact(126, [1], {
        value: ethers.utils.parseEther("300"),
      });

      expect(await RegistryInstance.getTopBuyersOfSeason(1)).to.equal(
        buyer1Address
      );
    });
  });
  describe("Events", function () {
    it("emits seasonCreated event correctly", async () => {
      expect(
        await RegistryInstance.connect(owner).createSeason(startTime, endTime)
      )
        .to.emit(RegistryInstance, "seasonCreated")
        .withArgs(1);
    });
    it("emits submissionCreated event correctly", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      expect(
        await RegistryInstance.connect(owner).createSubmission(
          1,
          "",
          buyer2Address
        )
      )
        .to.emit(RegistryInstance, "submissionCreated")
        .withArgs(124, buyer2Address);
    });
    it("emits protocolWalletAddressSet event correctly", async () => {
      expect(
        await RegistryInstance.connect(owner).setProtocolWalletAddress(
          ownerAddress
        )
      )
        .to.emit(RegistryInstance, "ProtocolWalletAddressSet")
        .withArgs(ownerAddress);
    });

    it("emits SeasonClosed event correctly", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );
      await RegistryInstance.connect(buyer1).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      expect(await RegistryInstance.connect(owner).closeSeason(1))
        .to.emit(RegistryInstance, "SeasonClosed")
        .withArgs(1);
    });

    it("emits TokenPriceSet event correctly", async () => {
      expect(await RegistryInstance.connect(owner).setTokenPrice(100))
        .to.emit(RegistryInstance, "TokenPriceSet")
        .to.emit(100);
    });
    it("emits Shutdown event correctly", async () => {
      expect(await RegistryInstance.connect(owner).shutdown(true))
        .to.emit(RegistryInstance, "Shutdown")
        .withArgs(true);
    });
    it("emits TreasuryFeeSplitPercentageSet event correctly", async () => {
      expect(
        await RegistryInstance.connect(owner).setTreasurySplitPercentage(10)
      )
        .to.emit(RegistryInstance, "TreasuryFeeSplitPercentageSet")
        .withArgs(10);
    });
    it("emits ArtistFeePercentageSet event correctly", async () => {
      expect(await RegistryInstance.connect(owner).setArtistFeePercentage(80))
        .to.emit(RegistryInstance, "ArtistFeePercentageSet")
        .withArgs(80);
    });
    it("emits ArtifactMinted  event correctly", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      expect(
        await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
          value: ethers.utils.parseEther("600"),
        })
      )
        .to.emit(RegistryInstance, "ArtifactMinted")
        .withArgs(buyer2Address, 124, 2);
    });

    it("emits FeesWithdrawn event correctly", async () => {
      await RegistryInstance.connect(owner).setProtocolWalletAddress(
        buyer3Address
      );
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      expect(await RegistryInstance.connect(owner).withdrawProtocolFees())
        .to.emit(RegistryInstance, "FeesWithdrawn")
        .withArgs("");
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
    it("getTotalTokenSales returns correct amount of tokens sold", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      expect(await RegistryInstance.getTotalTokenSales(124)).to.equal(4);
    });
    it("getTopBuyer returns top buyer per artifact correctly", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      await RegistryInstance.connect(buyer3).mintArtifact(124, [3], {
        value: ethers.utils.parseEther("900"),
      });

      await RegistryInstance.connect(buyer1).mintArtifact(124, [5], {
        value: ethers.utils.parseEther("1500"),
      });

      expect(await RegistryInstance.getTopBuyerPerArtifact(124)).to.equal(
        buyer1Address
      );
    });
    it.only("getTopSubmissionOfSeason returns top submission for season correctly", async () => {
      // TODO - this test should be passing
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await RegistryInstance.connect(buyer2).mintArtifact(127, [4], {
        value: ethers.utils.parseEther("1200"),
      });

      await RegistryInstance.connect(buyer2).mintArtifact(128, [3], {
        value: ethers.utils.parseEther("900"),
      });
      await RegistryInstance.connect(buyer2).mintArtifact(124, [4], {
        value: ethers.utils.parseEther("1200"),
      });

      await RegistryInstance.connect(buyer2).mintArtifact(125, [4], {
        value: ethers.utils.parseEther("1200"),
      });

      await RegistryInstance.connect(buyer2).mintArtifact(126, [2], {
        value: ethers.utils.parseEther("600"),
      });

      await RegistryInstance.connect(owner).calculateTopSubmissionsOfSeason(1);

      await RegistryInstance.connect(owner).calculateTopSubmissionsOfSeason(2);
      // expect(
      //   await RegistryInstance.connect(owner).getTopSubmissionsOfSeason(1)
      // ).to.equal([BigNumber.from("124"), BigNumber.from("125")]);
      const seasonTwo = await RegistryInstance.getSeason(2);
      console.log(seasonTwo.toString());
      expect(
        await RegistryInstance.connect(owner).getTopSubmissionsOfSeason(2)
      ).to.equal([BigNumber.from("127")]);

      const winners = await RegistryInstance.getSeason(1);
      console.log(winners.toString());
    });
    it("getTopSubmissionsOfSeason reverts if season doesn't exist", async () => {
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);

      await expect(
        RegistryInstance.getTopSubmissionsOfSeason(2)
      ).to.be.revertedWith("SeasonDoesntExist()");
    });
    it("getAmountToTokenIDsOfSeason returns an array of tokenIDs", async () => {
      // ** This is an internal function **
      // await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      // await RegistryInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await RegistryInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await RegistryInstance.connect(buyer2).mintArtifact(124, [4], {
      //   value: ethers.utils.parseEther("1200"),
      // });
      // await RegistryInstance.connect(buyer2).mintArtifact(125, [4], {
      //   value: ethers.utils.parseEther("1200"),
      // });
      // expect(await RegistryInstance.getAmountToTokenIDsOfSeason(1, 4)).to.equal(
      //   [124, 125]
      // );
    });
    it("getLargestAmountOfTokensSoldInSeason returns larges amount of tokens sold in season", async () => {
      // ** This function is internal **
      // await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      // await RegistryInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await RegistryInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await RegistryInstance.connect(owner).createSubmission(
      //   1,
      //   "",
      //   buyer2Address
      // );
      // await RegistryInstance.connect(buyer2).mintArtifact(124, [4], {
      //   value: ethers.utils.parseEther("1200"),
      // });
      // await RegistryInstance.connect(buyer2).mintArtifact(125, [2], {
      //   value: ethers.utils.parseEther("600"),
      // });
      // await RegistryInstance.connect(buyer2).mintArtifact(126, [2], {
      //   value: ethers.utils.parseEther("600"),
      // });
      // await RegistryInstance.setTotalSalesOfTokenIDs(1);
      // expect(
      //   await RegistryInstance.getLargestAmountOfTokensSoldInSeason(1)
      // ).to.equal(4);
    });
    it("withdrawing protocol fees works properly", async () => {
      await RegistryInstance.connect(owner).setProtocolWalletAddress(
        buyer3Address
      );
      await RegistryInstance.connect(owner).createSeason(startTime, endTime);
      await RegistryInstance.connect(owner).createSubmission(
        1,
        "",
        buyer1Address
      );

      await RegistryInstance.connect(buyer2).mintArtifact(124, [2], {
        value: ethers.utils.parseEther("600"),
      });

      const balanceBefore = await buyer3.getBalance();
      console.log(balanceBefore.toString());
      await RegistryInstance.connect(owner).withdrawProtocolFees();

      const balanceAfter = await buyer3.getBalance();
      console.log(balanceAfter.toString());

      expect(await balanceAfter).to.equal(ethers.utils.parseEther("1000240"));
    });
  });
});
