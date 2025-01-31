const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getSecret(name) {
  const projectId = process.env.PROJECT_ID;
  if (!projectId) {
    throw new Error('PROJECT_ID environment variable is not set');
  }

  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}

module.exports = {
  getSecret
};