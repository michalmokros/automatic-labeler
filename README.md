# Pull Request Labeler
This is a GitHub Action for Automatic Labeling of GitHub Issues and Pull Requests

## Inputs

### `configuration-path`

**Required** The name of the file where configuration is specified. Default location and name: `".github/pull-request-labeler-config.yml"`.

## Example usage

    uses: michalmokros/pull-request-labeler@v1
    with:
      configuration-path: '.github/pull-request-labeler-config.yml'

### Example of configuration-path
    labels:
      feature: 'feat[(|:]'
      fix: 'fix[(|:]'

    base: 
      branches: ['main']
      labels: ['in PR chain']