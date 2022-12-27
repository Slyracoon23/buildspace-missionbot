const fs = require("fs");
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

  // console.log("Proof:", fullProof);
  return fullProof;
}

// generateMissionBotProof("attestation");
exports.handler = async (event) => {
  const attestation = event.attestation;

  const proof = await generateMissionBotProof(attestation);

  const response = {
    statusCode: 200,
    body: proof,
  };
  return response;
};
