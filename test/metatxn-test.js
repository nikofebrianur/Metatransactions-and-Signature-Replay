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

		const transferAmountOfTokens = parseEther("10");
		const messageHash = await tokenSenderContract.getHash(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address
		);
		const signature = await userAddress.signMessage(arrayify(messageHash));

		const relayerSenderContractInstance = tokenSenderContract.connect(relayerAddress);
		const metaTxn = await relayerSenderContractInstance.transfer(
			userAddress.address,
			transferAmountOfTokens,
			recipientAddress.address,
			randomTokenContract.address,
			signature
		);
		await metaTxn.wait();

		const userBalance = await randomTokenContract.balanceOf(
			userAddress.address
		);
		const recipientBalance = await randomTokenContract.balanceOf(recipientAddress.address);

		expect(userBalance.lt(tenThousandTokensWithDecimals)).to.be.true;
		expect(recipientBalance.gt(BigNumber.from(0))).to.be.true;
	});
})