const core = require("@actions/core");
const github = require("@actions/github");
// const yaml = require("js-yaml");

async function run() {
  try {
    const github_token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit((token = github_token));

    // if (!github.context.payload.pull_request) {
    //   throw new Error(`Payload doesn't contain 'pull_request'.`)
    // }

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}
