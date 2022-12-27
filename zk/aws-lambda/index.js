const fs = require("fs");
// AWS DynamoDB library
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

// Semaphore libraries
const { Identity } = require("@semaphore-protocol/identity");
const { createMerkleTree, Group } = require("@semaphore-protocol/group");
const { generateProof } = require("@semaphore-protocol/proof");

const wasmFilePath = `./semaphore.wasm`;
const zkeyFilePath = `./semaphore.zkey`;

async function generateMissionBotProof(attestation) {
  const identity = new Identity();
  const { trapdoor, nullifier, commitment } = identity;
  const group = new Group();

  group.addMember(commitment);

  const externalNullifier = group.root;
  // Attestation is a string used to generate a proof
  const signal = attestation;

  const fullProof = await generateProof(
    identity,
    group,
    externalNullifier,
    signal,
    {
      zkeyFilePath,
      wasmFilePath,
    }
  );

  return fullProof;
}

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = "MissionBotAttestations";

exports.handler = async (event) => {
  const requestJSON = JSON.parse(event.body);

  if (!requestJSON.attestation) {
    const response = {
      statusCode: 400,
      body: "No attestation provided",
    };
    return response;
  }

  if (!requestJSON.identity) {
    const response = {
      statusCode: 400,
      body: "No identity provided",
    };

    return response;
  }

  if (!requestJSON.group) {
    const response = {
      statusCode: 400,
      body: "No group provided",
    };
    return response;
  }

  if (!requestJSON.id) {
    const response = {
      statusCode: 400,
      body: "No id provided",
    };
    return response;
  }

  try {
    const proof = await generateMissionBotProof(requestJSON.attestation);
    const data = await dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id: requestJSON.id,
          identity: requestJSON.identity,
          group: requestJSON.group,
          attestation: requestJSON.attestation,
          proof: JSON.stringify(proof),
        },
      })
    );
  } catch (err) {
    console.log(err);
    const response = {
      statusCode: 500,
      body: "Error generating proof or saving to DynamoDB",
    };
    return response;
  }

  const response = {
    statusCode: 200,
    body: "success",
  };
  return response;
};
