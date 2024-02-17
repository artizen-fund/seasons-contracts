const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber, providers } = require("ethers");
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

    // TODO - remove this
    // await SeasonsInstance.connect(owner).setArtistFeePercentage(50);

    // set protocol and treasury wallet address
    await SeasonsInstance.connect(owner).setProtocolWalletAddress(ownerAddress);

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

    it("sets token price properly", async () => {
      await SeasonsInstance.connect(owner).setTokenPrice(BigNumber.from("1"));

      expect(await SeasonsInstance.getTokenPrice()).to.equal(
        BigNumber.from("1")
      );
    });

    it("contract shuts down if shutdown is turned on", async () => {
      await SeasonsInstance.connect(owner).shutdown(true);

      await expect(
        SeasonsInstance.connect(owner).createSeason(startTime, endTime)
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');

      await expect(
        SeasonsInstance.connect(owner).createSubmission(2, "", buyer1Address)
      ).to.be.revertedWith("SeasonDoesntExist()");

      await expect(
        SeasonsInstance.connect(owner).mintArtifact([124], [5])
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
        2,
        "",
        buyer1Address
      );

      const submission = await SeasonsInstance.getSubmission(
        BigNumber.from(124)
      );
      console.log(submission.toString());

      expect(await submission[0].toString()).to.equal("124");
      expect(await submission[1]).to.equal(2);
      expect(await submission[2]).to.equal("");
      expect(await submission[3]).to.equal(buyer1Address);
    });
    it("only owner can create submission", async () => {
      await expect(
        SeasonsInstance.connect(buyer1).createSubmission(2, "", buyer1Address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("getSubmission reverts if submission doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
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
        2,
        "",
        buyer1Address
      );

      await fastForward(endTime + 100000);
      await expect(
        SeasonsInstance.connect(owner).createSubmission(2, "", buyer1Address)
      ).to.be.revertedWith("NoMoreSubmissionsToThisSeason(2)");
    });
    it("revert's if season is closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await fastForward(endTime + 1000000);
      await SeasonsInstance.connect(owner).closeSeason(2);
      await expect(
        SeasonsInstance.connect(owner).createSubmission(2, "", buyer1Address)
      ).to.be.revertedWith("NoMoreSubmissionsToThisSeason(2)");
    });
  });

  describe("createSeason function", function () {
    it("registers season details properly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      const season = await SeasonsInstance.getSeason(2);
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
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await expect(SeasonsInstance.getSeason(4)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
    });
  });
  describe("closeSeason function", function () {
    it("cannot close a season that's already been closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await fastForward(endTime + 1000000);
      await SeasonsInstance.connect(owner).closeSeason(2);
      await expect(
        SeasonsInstance.connect(owner).closeSeason(2)
      ).to.be.revertedWith("SeasonAlreadyClosed(2)");
    });
    it("cannot close a season that's not ended yet", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await expect(
        SeasonsInstance.connect(owner).closeSeason(2)
      ).to.be.revertedWith("SeasonStillRunning(2)");
    });

    it("only owner can close season", async () => {
      await expect(
        SeasonsInstance.connect(buyer1).closeSeason(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("mints correct amount of NFTS into protocol wallet", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [5], {
        value: ethers.utils.parseEther("500"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact([125], [6], {
        value: ethers.utils.parseEther("600"),
      });

      let totalSales124 = await SeasonsInstance.connect(
        owner
      ).getTotalTokenSales(124);

      let totalSales125 = await SeasonsInstance.connect(
        owner
      ).getTotalTokenSales(125);
      console.log("sales", totalSales124, totalSales125);

      await fastForward(endTime + 1000000);
      await SeasonsInstance.connect(owner).closeSeason(2);

      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(5);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 125)).to.equal(6);
    });
  });

  // TODO - remove this
  //   it("transfers protocol fees to protocol wallet", async () => {
  //     await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
  //     await SeasonsInstance.connect(owner).createSubmission(
  //       2,
  //       "",
  //       buyer1Address
  //     );

  //     await SeasonsInstance.connect(owner).createSubmission(
  //       2,
  //       "",
  //       buyer1Address
  //     );

  //     await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
  //       value: ethers.utils.parseEther("200"),
  //     });

  //     await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
  //       value: ethers.utils.parseEther("200"),
  //     });
  //     const ownerBalBefore = await owner.getBalance();
  //     console.log(ownerBalBefore.toString());
  //     await fastForward(endTime + 1000000);
  //     await SeasonsInstance.connect(owner).closeSeason(2);

  //     const ownerBalAfter = await owner.getBalance();
  //     console.log(ownerBalAfter.toString());
  //   });
  describe("claimArtist function", function () {
    it("only submission owner can call this function", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
        value: ethers.utils.parseEther("1000"),
      });

      const submission = await SeasonsInstance.getSubmission(
        BigNumber.from(124)
      );

      console.log("mint balance", submission[3].toString());
      await expect(
        SeasonsInstance.connect(owner).artistClaim([124], [10])
      ).to.be.revertedWith(
        'OnlyArtist("only submissionOwner can call this function")'
      );
    });
    it("reverts if shutdown is initiated", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(owner).shutdown(true);
      await expect(
        SeasonsInstance.connect(owner).artistClaim([124], [10])
      ).to.be.revertedWith('ContractShutdown("Contract has been shut down")');
    });

    it("reverts if submission is blacklisted", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
        2,
        124
      );
      await expect(
        SeasonsInstance.connect(buyer2).artistClaim([124], [10])
      ).to.be.revertedWith("ProjectBlacklistedInSeason(124, 2)");
    });

    it("reverts if claim balance is 0", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await expect(
        SeasonsInstance.connect(buyer2).artistClaim([124], [10])
      ).to.be.revertedWith("NoTokensToMint()");
    });
    it("reverts if claim balance lower than claim amount", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
        value: ethers.utils.parseEther("1000"),
      });

      await expect(
        SeasonsInstance.connect(buyer2).artistClaim([124], [20])
      ).to.be.revertedWith(
        'IncorrectAmount("Claim balance lower than claim amount")'
      );
    });

    it("mints correct amount of tokens to submission owner", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
        value: ethers.utils.parseEther("1000"),
      });

      await SeasonsInstance.connect(buyer2).artistClaim([124], [10]);

      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(10);
    });

    it.only("emits ArtifactsClaimedByArtist event", async () => {
      // TODO - check timestamp issue
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
        value: ethers.utils.parseEther("1000"),
      });

      let timestamp = await currentTime();

      await expect(SeasonsInstance.connect(buyer2).artistClaim([124], [10]))
        .to.emit(SeasonsInstance, "ArtifactsClaimedByArtist")
        .withArgs(buyer2Address, 124, 10, timestamp);
    });

    it.only("changes the remaining claim balance correctly", async () => {
      // TODO

      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
        value: ethers.utils.parseEther("1000"),
      });
      await SeasonsInstance.connect(buyer2).artistClaim([124], [5]);

      let submisson = await SeasonsInstance.getSubmission(124);

      expect(await submisson[3]).to.equal(5);
    });
  });
  describe("mintArtifacts functions", function () {
    it("msg.value has to be equal to token price", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
          value: ethers.utils.parseEther("10"),
        })
      ).to.be.revertedWith('IncorrectAmount("")');
    });
    it("mints correct tokenID for submission", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(2);
    });

    it("mints the same amounts to 3 different addresses", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(2);
    });
    it("minting one token mints tokens correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [1], {
        value: ethers.utils.parseEther("100"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(buyer2Address, 124)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(1);
    });

    it("users cant mint if a season is closed", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await fastForward(endTime + 1000000);
      await SeasonsInstance.connect(owner).closeSeason(2);
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SeasonAlreadyClosed(2)");
    });
    it("sets correct tokenURI for each token", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "blabla",
        buyer1Address
      );
      await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact([125], [2], {
        value: ethers.utils.parseEther("200"),
      });
      expect(await SeasonsInstance.uri(124)).to.be.equal("");
      expect(await SeasonsInstance.uri(125)).to.be.equal("blabla");
    });

    // TODO - remove this?

    // it.only("mintArtifactProtocol mints the tokens to the protocol wallet", async () => {
    //   await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
    //   await SeasonsInstance.connect(owner).createSubmission(
    //     2,
    //     "",
    //     buyer1Address
    //   );
    //   await SeasonsInstance.connect(owner).createSubmission(
    //     2,
    //     "blabla",
    //     buyer1Address
    //   );

    //   await SeasonsInstance.connect(buyer1).mintArtifact([124], [5], {
    //     value: ethers.utils.parseEther("500"),
    //   });

    //   let totalSales = await SeasonsInstance.connect(owner).getTotalTokenSales(
    //     124
    //   );
    //   console.log("sales", totalSales);

    //   await SeasonsInstance.connect(owner).mintArtifactProtocol(2);
    //   expect(await SeasonsInstance.balanceOf(ownerAddress, 124)).to.equal(5);
    // });

    // TODO - remove this
    // it("sends artistRoyalty properly", async () => {
    //   await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
    //   await SeasonsInstance.connect(owner).createSubmission(
    //     2,
    //     "",
    //     buyer1Address
    //   );

    //   const balanceBefore = await buyer1.getBalance();
    //   console.log("balance before mint", balanceBefore.toString());

    //   await SeasonsInstance.connect(buyer2).mintArtifact([124], [1], {
    //     value: ethers.utils.parseEther("100"),
    //   });

    //   const balanceAfter = await buyer1.getBalance();
    //   console.log("balance after", balanceAfter.toString());
    // });
    it("reverts if season ended already", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await fastForward(endTime + 1000000);

      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SeasonAlreadyClosed(2)");
    });
    it("reverts if wrong submission id is given", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await expect(
        SeasonsInstance.connect(buyer1).mintArtifact([125], [2], {
          value: ethers.utils.parseEther("200"),
        })
      ).to.be.revertedWith("SubmissionDoesntExist()");
    });
    it("buyer receives correct amount and tokenIDs of NFTs after purchase", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
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
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact([125], [3], {
        value: ethers.utils.parseEther("300"),
      });

      await SeasonsInstance.connect(buyer3).mintArtifact([126], [1], {
        value: ethers.utils.parseEther("100"),
      });

      expect(await SeasonsInstance.balanceOf(buyer1Address, 124)).to.equal(2);
      expect(await SeasonsInstance.balanceOf(buyer3Address, 126)).to.equal(1);
      expect(await SeasonsInstance.balanceOf(buyer1Address, 125)).to.equal(3);
    });
    it("saves top artifact buyer correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.getTopBuyerPerArtifact(124)).to.equal(
        buyer2Address
      );
    });
    it("getLatestTokenID returns correct tokenIDs", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      expect(await SeasonsInstance.getLatestTokenID(2)).to.equal(124);
    });
    it("getLatestTokenID reverts if season doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );
      await expect(SeasonsInstance.getLatestTokenID(3)).to.be.revertedWith(
        "SeasonDoesntExist()"
      );
    });

    it("transfers all funds to protocol wallet", async () => {
      // TODO
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
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
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      let balanceBefore = await owner.getBalance();

      console.log("before", balanceBefore);
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      let balanceAfter = await owner.getBalance();
      console.log("bal after", balanceAfter);

      let difference = balanceAfter - balanceBefore;
      console.log("diff", difference);

      let tokenPrice = await SeasonsInstance.getTokenPrice();
      console.log("tokenprice", tokenPrice);
      expect(await difference).to.greaterThanOrEqual(tokenPrice * 2);
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
          2,
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
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });
      await fastForward(endTime + 1000000);
      expect(await SeasonsInstance.connect(owner).closeSeason(2))
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

    // TODO - remove this
    // it("emits ArtistFeePercentageSet event correctly", async () => {
    //   expect(await SeasonsInstance.connect(owner).setArtistFeePercentage(80))
    //     .to.emit(SeasonsInstance, "ArtistFeePercentageSet")
    //     .withArgs(80);
    // });

    it("emits ArtifactMinted  event correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      expect(
        await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
          value: ethers.utils.parseEther("200"),
        })
      )
        .to.emit(SeasonsInstance, "ArtifactMinted")
        .withArgs(buyer2Address, 124, 2);
    });
    it("emits ProtocolArtifactsMinted event correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );
      await SeasonsInstance.connect(buyer1).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });
      await fastForward(endTime + 1000000);
      expect(await SeasonsInstance.connect(owner).closeSeason(2))
        .to.emit(SeasonsInstance, "ProtocolArtifactsMinted")
        .withArgs([124], [2]);
    });

    // it("emits FeesWithdrawn event correctly", async () => {
    //   await SeasonsInstance.connect(owner).setProtocolWalletAddress(
    //     buyer3Address
    //   );
    //   await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
    //   await SeasonsInstance.connect(owner).createSubmission(
    //     2,
    //     "",
    //     buyer1Address
    //   );

    //   await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
    //     value: ethers.utils.parseEther("200"),
    //   });

    //   expect(await SeasonsInstance.connect(owner).withdrawProtocolFees())
    //     .to.emit(SeasonsInstance, "FeesWithdrawn")
    //     .withArgs("");
    // });
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
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(await SeasonsInstance.getTotalTokenSales(124)).to.equal(4);
    });
    it("getTopBuyer returns top buyer per artifact correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer1Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact([124], [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(buyer3).mintArtifact([124], [3], {
        value: ethers.utils.parseEther("300"),
      });

      await SeasonsInstance.connect(buyer1).mintArtifact([124], [5], {
        value: ethers.utils.parseEther("500"),
      });

      expect(await SeasonsInstance.getTopBuyerPerArtifact(124)).to.equal(
        buyer1Address
      );
    });
    it("getTopSubmissionOfSeason returns top submission for season correctly", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

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

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        3,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        3,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact([127], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([128], [3], {
        value: ethers.utils.parseEther("300"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact([124], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([125], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([126], [2], {
        value: ethers.utils.parseEther("200"),
      });

      await SeasonsInstance.connect(owner).calculateTopSubmissionsOfSeason(2);

      await SeasonsInstance.connect(owner).calculateTopSubmissionsOfSeason(3);

      let season1Winner = await SeasonsInstance.connect(
        owner
      ).getTopSubmissionsOfSeason(2);
      console.log("winner", season1Winner.toString());
      expect(await season1Winner[0].toString()).to.equal("124");
      expect(await season1Winner[1].toString()).to.equal("125");
      await SeasonsInstance.getSeason(2);

      const season2Winner = await SeasonsInstance.connect(
        owner
      ).getTopSubmissionsOfSeason(3);
      console.log("season 2 winner", season2Winner[0].toString());
      expect(await season2Winner[0].toString()).to.equal("127");

      const winners = await SeasonsInstance.getSeason(1);
      console.log(winners.toString());
    });
    it("getTopSubmissionsOfSeason reverts if season doesn't exist", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await expect(
        SeasonsInstance.getTopSubmissionsOfSeason(3)
      ).to.be.revertedWith("SeasonDoesntExist()");
    });
    it("getTotalTokensPurchasedPerAddressInSeason returns the total amount of tokens purchased by an address in a season", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

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

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        3,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).createSubmission(
        3,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(buyer2).mintArtifact([127], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([128], [3], {
        value: ethers.utils.parseEther("300"),
      });
      await SeasonsInstance.connect(buyer2).mintArtifact([124], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([125], [4], {
        value: ethers.utils.parseEther("400"),
      });

      await SeasonsInstance.connect(buyer2).mintArtifact([126], [2], {
        value: ethers.utils.parseEther("200"),
      });

      expect(
        await SeasonsInstance.getTotalTokensPurchasedPerAddressInSeason(
          buyer2Address,
          2
        )
      ).to.equal(10);
      expect(
        await SeasonsInstance.getTotalTokensPurchasedPerAddressInSeason(
          buyer2Address,
          3
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
      // });
      it("withdrawing protocol fees works properly", async () => {
        await SeasonsInstance.connect(owner).setProtocolWalletAddress(
          buyer3Address
        );
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer1Address
        );

        await SeasonsInstance.connect(buyer2).mintArtifact([124], [1], {
          value: ethers.utils.parseEther("100"),
        });

        const balanceBefore = await buyer3.getBalance();
        await SeasonsInstance.connect(owner).withdrawProtocolFees();

        const balanceAfter = await buyer3.getBalance();

        expect(balanceAfter).to.equal(ethers.utils.parseEther("1000050"));
      });
      it("gettotalAmountPurchasedPerToken returns the total amount of tokens bought by an address of a single tokenID", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

        await SeasonsInstance.connect(owner).createSubmission(
          3,
          "",
          buyer2Address
        );

        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer2Address
        );

        await SeasonsInstance.connect(buyer2).mintArtifact([124], [4], {
          value: ethers.utils.parseEther("400"),
        });

        await SeasonsInstance.connect(buyer1).mintArtifact([124], [4], {
          value: ethers.utils.parseEther("400"),
        });

        await SeasonsInstance.connect(buyer2).mintArtifact([124], [4], {
          value: ethers.utils.parseEther("400"),
        });

        expect(
          await SeasonsInstance.getTotalAmountPurchasedPerToken(
            buyer2Address,
            124
          )
        ).to.equal(8);
      });
    });
    describe("Artifact Registry Tests", function () {
      it("blacklists a project from a season correctly", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

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

        await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
          2,
          124
        );

        expect(await SeasonsInstance.isBlacklisted(2, 124)).to.equal(true);
        expect(await SeasonsInstance.isBlacklisted(2, 125)).to.equal(false);
      });
      it("reverts blacklist if submisson is already blacklisted in season", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer2Address
        );

        await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
          2,
          124
        );

        await expect(
          SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(2, 124)
        ).to.be.revertedWith("AlreadyBlackListed(124, 2)");
      });
      it("reverts blacklist if submission is not part of the season", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer2Address
        );

        await expect(
          SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(1, 124)
        ).to.be.revertedWith("SubmissionIsNotPartOfSeason(124)");
      });
      it("only owner can call blacklist", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer2Address
        );

        await expect(
          SeasonsInstance.connect(buyer1).blacklistSubmissionFromSeason(1, 124)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("can't mint from blacklisted project", async () => {
        await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

        await SeasonsInstance.connect(owner).createSubmission(
          2,
          "",
          buyer2Address
        );

        await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
          2,
          124
        );

        await expect(
          SeasonsInstance.connect(buyer2).mintArtifact([124], [4], {
            value: ethers.utils.parseEther("400"),
          })
        ).to.be.revertedWith("ProjectBlacklistedInSeason(124, 2)");
      });
    });

    it("resets the total number of sales to 0 for the blaklisted project", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
        2,
        124
      );

      expect(await SeasonsInstance.getTotalTokenSales(124)).to.equal(0);
    });

    it("saves the previous sales into a mapping before 0ing out sales", async () => {
      await SeasonsInstance.connect(owner).createSeason(startTime, endTime);

      await SeasonsInstance.connect(owner).createSubmission(
        2,
        "",
        buyer2Address
      );

      await SeasonsInstance.connect(owner).mintArtifact([124], [5], {
        value: ethers.utils.parseEther("500"),
      });

      await SeasonsInstance.connect(owner).blacklistSubmissionFromSeason(
        2,
        124
      );

      expect(await SeasonsInstance.getTotalTokenSales(124)).to.equal(0);
      expect(
        await SeasonsInstance.getAmountSoldBeforeBlackList(2, 124)
      ).to.be.equal(5);
    });
  });
});
