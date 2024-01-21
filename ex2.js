const {
    Client,
    PrivateKey,
    CustomRoyaltyFee,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenInfoQuery,
    TokenUpdateTransaction,
    AccountBalanceQuery,
    TokenMintTransaction,
    Hbar,
    AccountCreateTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenFeeScheduleUpdateTransaction,
    AccountId
} = require("@hashgraph/sdk");
require("dotenv").config();

async function main() {
    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
    const myPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

    // If we weren't able to grab it, we should throw a new error
    if (!myAccountId || !myPrivateKey) {
        throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    //Create your Hedera Testnet client
    const client = Client.forTestnet();

    //Set your account as the client's operator
    client.setOperator(myAccountId, myPrivateKey);

    //create new keys for the 1st account and create account1 with 1,000 tinybar starting balance
    const account1PrivateKey = PrivateKey.generateED25519();
    const account1PublicKey = account1PrivateKey.publicKey;
    const account1 = await new AccountCreateTransaction().setKey(account1PublicKey)
                        .setInitialBalance(Hbar.fromTinybars(1000)).execute(client);
    const receipt1 = await account1.getReceipt(client);
    console.log(`Account 1 ID is: ${receipt1.accountId}`);
    
    //same thing for the 2nd account
    const account2PrivateKey = PrivateKey.generateED25519();
    const account2PublicKey = account2PrivateKey.publicKey;
    const account2 = await new AccountCreateTransaction().setKey(account2PublicKey)
                        .setInitialBalance(Hbar.fromTinybars(1000)).execute(client);
    const receipt2 = await account2.getReceipt(client);
    console.log(`Account 2 ID is: ${receipt2.accountId}`);

    //create an NFT collection
    const royaltyFee = new CustomRoyaltyFee().setNumerator(1)
            .setDenominator(10).setFeeCollectorAccountId(myAccountId);
    const customFee = [royaltyFee];
    console.log(`Your custom fee is : ${customFee}`);
    const nftCreateTx = await new TokenCreateTransaction()
                    .setTokenName("ExamPreperation")
                    .setTokenSymbol("EP")
                    .setTokenType(TokenType.NonFungibleUnique)
                    .setTokenMemo("best exam prep")
                    .setCustomFees(customFee)
                    .setSupplyType(TokenSupplyType.Finite)
                    .setMaxSupply(200)
                    .setTreasuryAccountId(myAccountId)
                    .setSupplyKey(myPrivateKey)
                    .setAdminKey(myPrivateKey)
                    .setMaxTransactionFee(100000)
                    .freezeWith(client);
    let nftCreateTxSign = await nftCreateTx.sign(myPrivateKey);
    let nftCreateTxSubmit= await nftCreateTxSign.execute(client);
    let nftCreateReceipt = await nftCreateTxSubmit.getReceipt(client);
    let nftId = await nftCreateReceipt.tokenId;
    console.log(`The nft ID is : ${nftId}`);//tokenId

    //query info
    let tokenInfo = await new TokenInfoQuery().setTokenId(nftId).execute(client);
    console.log("NFT info 1.0", JSON.stringify(tokenInfo, null, 4));
    console.log("----------------");

    //edit nft memo
    const updateNFT = await new TokenUpdateTransaction().setTokenId(nftId)
                .setTokenMemo("Dar Blockchain collection").freezeWith(client);
    let updateNFTsign = await updateNFT.sign(myPrivateKey);
    let updateNFTsubmit = await updateNFTsign.execute(client);
    let updateNFTreceipt = await updateNFTsubmit.getReceipt(client);
    let nftId1 = await updateNFTreceipt.tokenId;
    console.log(`The new nft ID is : ${nftId1}`);//tokenId
    let tokenInfo1 = await new TokenInfoQuery().setTokenId(nftId).execute(client);
    console.log("NFT info 2.0", JSON.stringify(tokenInfo1, null, 4));
    console.log("----------------");

    //Mint an NFT on the collection (metadata to be specified are free)
    const metadataString = "NFT1";
    const encoder = new TextEncoder();
    const metadataUint8Array = encoder.encode(metadataString);

    const mintNFT = await new TokenMintTransaction()
                .setTokenId(nftId).setMetadata([metadataUint8Array]).freezeWith(client);

    let mintNFTsign = await mintNFT.sign(myPrivateKey);
    let mintNFTsubmit = await mintNFTsign.execute(client);
    await mintNFTsubmit.getReceipt(client);

    //associate
    let associateTx = await new TokenAssociateTransaction()
                .setAccountId(account1)
                .setTokenIds([nftCreateReceipt.tokenId]).freezeWith(client);
    let associateTxSign = await associateTx.sign(account1PrivateKey);
    let associateTxSubmit = await associateTxSign.execute(client);
    await associateTxSubmit.getReceipt(client);

    //Transfer NFT from account A to account B
    let transferTx = await new TransferTransaction()
                .addNftTransfer(nftCreateReceipt.tokenId, 1, myAccountId, account1).freezeWith(client);

    let transferTxSign = await transferTx.sign(myPrivateKey);
    let transferTxSubmit = await transferTxSign.execute(client);
    await transferTxSubmit.getReceipt(client);

    //Display the balance of the various accounts involved (account A, account B and account defined as receiving royalty fees)
    let balanceQuery = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log("My Account Balance :", balanceQuery.tokens.toString());

    let balanceQuery1 = await new AccountBalanceQuery().setAccountId(account1).execute(client);
    console.log("Account 1 Balance :", balanceQuery1.tokens.toString());

    let balanceQuery2 = await new AccountBalanceQuery().setAccountId(account2).execute(client);
    console.log("Account 2 Balance :", balanceQuery2.tokens.toString());

    console.log("---------------------");

    //Modify custom fees to increase royalty percentage to 10%
    const newRoyaltyFee = new CustomRoyaltyFee()
                .setNumerator(1).setDenominator(5).setFeeCollectorAccountId(myAccountId);

    const newCustomFee = [newRoyaltyFee];
    const nftUpdateFee = await new TokenFeeScheduleUpdateTransaction()
                .setTokenId(nftId).setCustomFees(newCustomFee).freezeWith(client);

    let nftUpdateFeeSign = await nftUpdateFee.sign(myPrivateKey);
    let nftUpdateFeeSubmit = await nftUpdateFeeSign.execute(client);
    await nftUpdateFeeSubmit.getReceipt(client);

    //Mint 2nd NFT on the collection
    const metadataString1 = "NFT2";
    const metadataUint8Array1 = encoder.encode(metadataString1);

    const mintNFT1 = await new TokenMintTransaction()
                .setTokenId(nftId).setMetadata([metadataUint8Array1]).freezeWith(client);

    let mintNFTsign1 = await mintNFT1.sign(myPrivateKey);
    let mintNFTsubmit1 = await mintNFTsign1.execute(client);
    await mintNFTsubmit1.getReceipt(client);

    //associate
    let associateTx1 = await new TokenAssociateTransaction()
                .setAccountId(account2)
                .setTokenIds([nftCreateReceipt.tokenId]).freezeWith(client);
    let associateTxSign1 = await associateTx1.sign(account2PrivateKey);
    let associateTxSubmit1 = await associateTxSign1.execute(client);
    await associateTxSubmit1.getReceipt(client);

    //Transfer NFT from account A to account B
    let transferTx1 = await new TransferTransaction()
                .addNftTransfer(nftId.tokenId, 2, myAccountId, account2).freezeWith(client);
    let transferTxSign1 = await transferTx1.sign(myPrivateKey);
    let transferTxSubmit1 = await transferTxSign1.execute(client);
    await transferTxSubmit1.getReceipt(client);

    //Display the balance of the various accounts involved (account A, account B and account defined as receiving royalty fees)
    let balanceQuery_ = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log("My Account Balance :", balanceQuery_.tokens.toString());

    let balanceQuery1_ = await new AccountBalanceQuery().setAccountId(account1).execute(client);
    console.log("Account 1 Balance :", balanceQuery1_.tokens.toString());

    let balanceQuery2_ = await new AccountBalanceQuery().setAccountId(account2).execute(client);
    console.log("Account 2 Balance :", balanceQuery2_.tokens.toString());

}

main();