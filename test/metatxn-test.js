const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("MetaTokenTransfer", function () {
	it("Should let user transfer tokens through a relayer", async function () {
		// Deploy the contracts
		const RandomTokenFactory = await ethers.getContractFactory("RandomToken");
		const randomTokenContract = await RandomTokenFactory.deploy();
		await randomTokenContract.deployed();

		const MetaTokenSenderFactory = await ethers.getContractFactory(
			"TokenSender"
		);
		const tokenSenderContract = await MetaTokenSenderFactory.deploy();
		await tokenSenderContract.deployed();

		const [_, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners();

		const tenThousandTokensWithDecimals = parseEther("10000");
		const userTokenContractInstance = randomTokenContract.connect(userAddress);
		const mintTxn = await userTokenContractInstance.freeMint(tenThousandTokensWithDecimals);
		await mintTxn.wait();

		const approveTxn = await userTokenContractInstance.approve(
			tokenSenderContract.address,
			BigNumber.from(
				"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
			)
		);
		await approveTxn.wait();

		let nonce = 1;

		const transferAmountOfTokens = parseEther("10");
		const messageHash = await tokenSenderContract.getHash(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce
		);
		const signature = await userAddress.signMessage(arrayify(messageHash));

		const relayerSenderContractInstance = tokenSenderContract.connect(relayerAddress);
		const metaTxn = await relayerSenderContractInstance.transfer(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce,
			signature
		);
		await metaTxn.wait();

		let userBalance = await randomTokenContract.balanceOf(
			userAddress.address
		);
		let recipientBalance = await randomTokenContract.balanceOf(recipientAddress.address);

		expect(userBalance.eq(parseEther("9990"))).to.be.true;
		expect(recipientBalance.eq(parseEther("10"))).to.be.true;

		nonce++;

		const messageHash2 = await tokenSenderContract.getHash(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce
		);
		const signature2 = await userAddress.signMessage(arrayify(messageHash2));
		const metaTxn2 = await relayerSenderContractInstance.transfer(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce,
			signature2
		);
		await metaTxn2.wait();

		userBalance = await randomTokenContract.balanceOf(userAddress.address);
		recipientBalance = await randomTokenContract.balanceOf(recipientAddress.address);

		expect(userBalance.eq(parseEther("9980"))).to.be.true;
		expect(recipientBalance.eq(parseEther("20"))).to.be.true;
	});

	it("Should not let signature replay happen", async function () {
		const RandomTokenFactory = await ethers.getContractFactory("RandomToken");
		const randomTokenContract = await RandomTokenFactory.deploy();
		await randomTokenContract.deployed();

		const MetaTokenSenderFactory = await ethers.getContractFactory(
			"TokenSender"
		);
		const tokenSenderContract = await MetaTokenSenderFactory.deploy();
		await tokenSenderContract.deployed();

		const [_, userAddress, relayerAddress, recipientAddress] =
			await ethers.getSigners();

		const tenThousandTokensWithDecimals = parseEther("10000");
		const userTokenContractInstance = randomTokenContract.connect(userAddress);
		const mintTxn = await userTokenContractInstance.freeMint(
			tenThousandTokensWithDecimals
		);
		await mintTxn.wait();

		const approveTxn = await userTokenContractInstance.approve(
			tokenSenderContract.address,
			BigNumber.from(
				// This is uint256's max value (2^256 - 1) in hex
				"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
			)
		);
		await approveTxn.wait();

		let nonce = 1;

		const transferAmountOfTokens = parseEther("10");
		const messageHash = await tokenSenderContract.getHash(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce
		);
		const signature = await userAddress.signMessage(arrayify(messageHash));

		const relayerSenderContractInstance =
			tokenSenderContract.connect(relayerAddress);
		const metaTxn = await relayerSenderContractInstance.transfer(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			nonce,
			signature
		);
		await metaTxn.wait();

		expect(
			relayerSenderContractInstance.transfer(
				userAddress.address,
				transferAmountOfTokens,
				recipientAddress.address,
				randomTokenContract.address,
				nonce,
				signature
			)
		).to.be.revertedWith("Already executed!");
	});
});
