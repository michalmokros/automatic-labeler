const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require("js-yaml");
const _ = require("lodash");

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
    core.info(`Loaded config: ${JSON.stringify(config, null, 2)}`);

    const newLabels = [];
    const defaultLabels = Object.keys(config.labels);
    for (const [key, value] of Object.entries(config.labels)) {
      if (title.match(new RegExp("^" + value, "g"))) {
        newLabels.push(key);
      }
    }

    if (config.base) {
      core.info(
        `Base branch specified, adding chain labels. ${JSON.stringify(
          config.base,
          null,
          2
        )}`
      );
      const { branches: baseBranches, labels: baseLabels } = config.base;
      defaultLabels.push(...baseLabels);

      if (!baseBranches.includes(baseBranch)) {
        baseLabels.forEach((baseLabel) => newLabels.push(baseLabel));
      }
    }

    let currentLabels = await octokit.issues.listLabelsOnIssue({
      issue_number: github.context.payload.pull_request.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    });

    currentLabels = currentLabels.data.map((entry) => entry.name);

    core.info(`Current Labels: ${JSON.stringify(currentLabels, null, 2)}`);
    core.info(`Default Labels: ${JSON.stringify(defaultLabels, null, 2)}`);
    core.info(`New Labels: ${JSON.stringify(newLabels, null, 2)}`);
    const currentDefaultLabels = currentDefaultLabels.filter(
      (currentLabel) => defaultLabels.includes(currentLabel)
    );
    core.info(`Current default Labels: ${JSON.stringify(currentDefaultLabels, null, 2)}`);
    const labelsToRemove = currentDefaultLabels.filter(
      (currentDefaultLabel) => !newLabels.includes(currentDefaultLabel)
    );
    core.info(`Labels to remove: ${JSON.stringify(filteredLabels, null, 2)}`);
    const labelsToAdd =  newLabels.filter(newLabel => !currentDefaultLabels.includes(newLabel))
    core.info(`Adding Labels: ${labelsToAdd}`);

    if (newLabels) {
      await octokit.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        labels: newLabels,
      });
    } else {
      core.info("No assignable labels were detected.");
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

async function getConfig(github, path, { owner, repo }, ref) {
  try {
    const response = await github.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    return (
      yaml.load(Buffer.from(response.data.content, "base64").toString()) || {}
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
