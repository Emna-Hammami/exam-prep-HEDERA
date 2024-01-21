//Consensus Service
const {
    PrivateKey,
    Client,
    TopicCreateTransaction,
    TopicUpdateTransaction,
    TopicMessageSubmitTransaction,
    TopicInfoQuery
} = require("@hashgraph/sdk");
require('dotenv').config();



async function main() {
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (!myAccountId || !myPrivateKey) {
        throw new Error("MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    const client = Client.forTestnet();
    client.setOperator(myAccountId, myPrivateKey);

    //create adminKey and submitKey
    const adminKey = PrivateKey.generate();
    const submitKey = PrivateKey.generate();

    //create a new topic
    let txResponse = await new TopicCreateTransaction()
            .setAdminKey(adminKey).setSubmitKey(submitKey)
            .setTopicMemo("Hedera Hashgraph Consensus Service").freezeWith(client);

    // Sign and execute
    const sign1 = await txResponse.sign(adminKey);
    const sign2 = await sign1.sign(submitKey);
    const txId = await sign2.execute(client);

    // Query the topic info
    let receipt = await txId.getReceipt(client);
    let topicId = receipt.topicId;
    console.log(`Your topic Id is: ${topicId}`);

    const topicInfo = await new TopicInfoQuery()
            .setTopicId(topicId).execute(client);
    let topicMemo = topicInfo.topicMemo;
    console.log(`Your topic memo is: ${topicMemo}`);
    console.log("--------------------");

    //modify the topic's memo
    let updateTxResponse = await new TopicUpdateTransaction()
            .setTopicId(topicId).setTopicMemo("new memo !").freezeWith(client);

    // Sign and execute
    const sign3 = await updateTxResponse.sign(adminKey);
    const sign4 = await sign3.sign(submitKey);
    const txId1 = await sign4.execute(client);

    // Query the updated topic info
    const updatedTopicInfo = await new TopicInfoQuery()
            .setTopicId(topicId).execute(client);
    console.log("Update:");
    console.log(`Your updated topic memo is : ${updatedTopicInfo.topicMemo}`);
    console.log("----------------");

    //submit a message to the topic
    let submitMsgTx = await new TopicMessageSubmitTransaction({
        topicId: topicId, message: "Hello fam !"
    }).execute(client);
    console.log("Submit Msg Tx:", submitMsgTx);

}
main();
