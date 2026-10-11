const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenDEXFactory", function () {
  let owner;
  let user;
  let other;

  let factory;
  let tokenA;
  let tokenB;

  const INITIAL_SUPPLY =
    ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user, other] =
      await ethers.getSigners();

    // =========================================================
    // MOCK TOKEN A
    // =========================================================

    const MockERC20 =
      await ethers.getContractFactory(
        "MockERC20"
      );

    tokenA =
      await MockERC20.deploy(
        "Token A",
        "TKA",
        INITIAL_SUPPLY
      );

    await tokenA.waitForDeployment();

    // =========================================================
    // MOCK TOKEN B
    // =========================================================

    tokenB =
      await MockERC20.deploy(
        "Token B",
        "TKB",
        INITIAL_SUPPLY
      );

    await tokenB.waitForDeployment();

    // =========================================================
    // FACTORY
    // =========================================================

    const NumenDEXFactory =
      await ethers.getContractFactory(
        "NumenDEXFactory"
      );

    factory =
      await NumenDEXFactory.deploy(
        owner.address
      );

    await factory.waitForDeployment();
  });

  // ===========================================================
  // DEPLOYMENT
  // ===========================================================

  describe("Deployment", function () {
    it(
      "feeToSetter deployer olmalı",
      async function () {
        expect(
          await factory.feeToSetter()
        ).to.equal(
          owner.address
        );
      }
    );

    it(
      "başlangıçta feeTo zero address olmalı",
      async function () {
        expect(
          await factory.feeTo()
        ).to.equal(
          ethers.ZeroAddress
        );
      }
    );

    it(
      "başlangıçta pair sayısı sıfır olmalı",
      async function () {
        expect(
          await factory.allPairsLength()
        ).to.equal(0n);
      }
    );
  });

  // ===========================================================
  // CREATE PAIR
  // ===========================================================

  describe("createPair", function () {
    it(
      "iki ERC20 arasında pair oluşturmalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await expect(
          factory.createPair(
            tokenAAddress,
            tokenBAddress
          )
        ).to.not.be.reverted;

        expect(
          await factory.allPairsLength()
        ).to.equal(1n);
      }
    );

    it(
      "getPair her iki yönde aynı pair adresini vermeli",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        const pairAB =
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          );

        const pairBA =
          await factory.getPair(
            tokenBAddress,
            tokenAAddress
          );

        expect(
          pairAB
        ).to.not.equal(
          ethers.ZeroAddress
        );

        expect(
          pairAB
        ).to.equal(
          pairBA
        );
      }
    );

    it(
      "allPairs(0) oluşturulan pair olmalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        const pairAddress =
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          );

        expect(
          await factory.allPairs(0)
        ).to.equal(
          pairAddress
        );
      }
    );

    it(
      "aynı pair ikinci kez oluşturulamamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        await expect(
          factory.createPair(
            tokenAAddress,
            tokenBAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: PAIR_EXISTS"
        );
      }
    );

    it(
      "ters token sırasıyla aynı pair tekrar oluşturulamamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        await expect(
          factory.createPair(
            tokenBAddress,
            tokenAAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: PAIR_EXISTS"
        );
      }
    );

    it(
      "aynı token ile pair oluşturulamamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        await expect(
          factory.createPair(
            tokenAAddress,
            tokenAAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: IDENTICAL_ADDRESSES"
        );
      }
    );

    it(
      "zero address ile pair oluşturulamamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        await expect(
          factory.createPair(
            ethers.ZeroAddress,
            tokenAAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_ADDRESS"
        );
      }
    );

    it(
      "Pair token0 ve token1 adreslerini doğru saklamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        const pairAddress =
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          );

        const pair =
          await ethers.getContractAt(
            "NumenDEXPair",
            pairAddress
          );

        const pairToken0 =
          await pair.token0();

        const pairToken1 =
          await pair.token1();

        const tokenANumeric =
          BigInt(tokenAAddress);

        const tokenBNumeric =
          BigInt(tokenBAddress);

        let expectedToken0;
        let expectedToken1;

        if (
          tokenANumeric <
          tokenBNumeric
        ) {
          expectedToken0 =
            tokenAAddress;

          expectedToken1 =
            tokenBAddress;
        } else {
          expectedToken0 =
            tokenBAddress;

          expectedToken1 =
            tokenAAddress;
        }

        expect(
          pairToken0
        ).to.equal(
          expectedToken0
        );

        expect(
          pairToken1
        ).to.equal(
          expectedToken1
        );
      }
    );

    it(
      "Pair factory adresini doğru saklamalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        await factory.createPair(
          tokenAAddress,
          tokenBAddress
        );

        const pairAddress =
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          );

        const pair =
          await ethers.getContractAt(
            "NumenDEXPair",
            pairAddress
          );

        expect(
          await pair.factory()
        ).to.equal(
          await factory.getAddress()
        );
      }
    );
  });

  // ===========================================================
  // FEE MANAGEMENT
  // ===========================================================

  describe("Fee management", function () {
    it(
      "feeToSetter feeTo adresini değiştirebilmeli",
      async function () {
        await factory.setFeeTo(
          user.address
        );

        expect(
          await factory.feeTo()
        ).to.equal(
          user.address
        );
      }
    );

    it(
      "yetkisiz kullanıcı feeTo değiştirememeli",
      async function () {
        await expect(
          factory
            .connect(user)
            .setFeeTo(
              user.address
            )
        ).to.be.revertedWith(
          "NumenDEX: FORBIDDEN"
        );
      }
    );

    it(
      "feeToSetter değiştirilebilmeli",
      async function () {
        await factory.setFeeToSetter(
          user.address
        );

        expect(
          await factory.feeToSetter()
        ).to.equal(
          user.address
        );
      }
    );

    it(
      "eski feeToSetter yetkisini kaybetmeli",
      async function () {
        await factory.setFeeToSetter(
          user.address
        );

        await expect(
          factory.setFeeTo(
            other.address
          )
        ).to.be.revertedWith(
          "NumenDEX: FORBIDDEN"
        );
      }
    );

    it(
      "yeni feeToSetter feeTo değiştirebilmeli",
      async function () {
        await factory.setFeeToSetter(
          user.address
        );

        await factory
          .connect(user)
          .setFeeTo(
            other.address
          );

        expect(
          await factory.feeTo()
        ).to.equal(
          other.address
        );
      }
    );

    it(
      "feeToSetter zero address yapılamamalı",
      async function () {
        await expect(
          factory.setFeeToSetter(
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_SETTER"
        );
      }
    );
  });
});