const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require("js-yaml");
const matcher = require("matcher");

const baseBranches = ["master", "main"];
const inPRChainLabel = "In PR Chain";

async function run() {
  try {
    if (!github.context.payload.pull_request) {
      throw new Error(
        `Payload doesn't contain 'pull_request'. Make sure to attach this action only on pull requests.`
      );
    }

    const github_token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit((token = github_token));
    const configPath = core.getInput("configuration-path", { required: true });

    if (!configPath) {
      throw new Error("Configuration Path variable is missing.");
    }

    core.info(`Configuration path is: ${configPath}`);

    // required variables
    const baseBranch = github.context.payload.pull_request.base.ref;
    const title = github.context.payload.pull_request.title;

    core.info(`Pull Request base branch is: ${baseBranch}`);
    core.info(`Pull Request title is: ${title}`);

    const config = await getConfig(
      octokit,
      configPath,
      github.context.repo,
      github.context.payload.pull_request.head.ref
    );
    core.info(`Loaded config: ${config}`);

    const labels = getLabels(config, baseBranch, title);
    core.info(`Adding Labels: ${labels}`);

    if (labels) {
      await octokit.issues.addLabels({
        ...github.context.repo,
        number: github.context.payload.pull_request.number,
        labels,
      });
    } else {
      core.info("No assignable labels were detected.");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getConfig(github, path, { owner, repo }, ref) {
  try {
    const response = await github.repos.getContents({
      owner,
      repo,
      path,
      ref,
    });

    return (
      yaml.safeLoad(Buffer.from(response.data.content, "base64").toString()) ||
      {}
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getLabels(config, baseBranch, title) {
  const labels = Object.entries(config).reduce((labels, [label, patterns]) => {
    if (
      Array.isArray(patterns)
        ? patterns.some((pattern) => matcher.isMatch(title, pattern))
        : matcher.isMatch(title, patterns)
    ) {
      labels.push(label);
    }
  }, []);

  if (!baseBranches.includes(baseBranch)) {
    labels.push(inPRChainLabel);
  }

  return labels;
}

run();
