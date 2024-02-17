// describe("claimArtist function", function () {
//   it.only("only submission owner can cal this function", async () => {

//     await SeasonsInstance.connect(owner).createSeason(startTime, endTime);
//     await SeasonsInstance.connect(owner).createSubmission(2, "", buyer2Address);
//    await SeasonsInstance.connect(buyer1).mintArtifact([124], [10], {
//       value: ethers.utils.parseEther("1000"),
//     });
//     await expect(SeasonsInstance.connect(owner).claimArtist(2, 10)).to.be.revertedWith("only submissionOwner can call this function");

//   })

//     it("reverts if shutdown is initiated", async () => {
//     // TODO
//     })

//       it("reverts if project is blacklisted", async () => {
//     // TODO
//       })

//        it("reverts if claim balance is 0", async () => {
//     // TODO
//        })
//          it("reverts if claim balance lower than claim amount", async () => {
//     // TODO
//          })

//       it("mints correct amount of tokens to submission owner", async () => {
//     // TODO
//       })

//       it("emits ArtifactsClaimedByArtist event", async () => {
//     // TODO
//       })

//       it("changes the remaining claim balance correctly", async () => {
//     // TODO
//       })
// })
