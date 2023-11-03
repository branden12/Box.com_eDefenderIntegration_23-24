const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    const secretValueResponse = await secretsManager.getSecretValue({
        SecretId: 'box-config'
    }).promise();

    // Parse the entire secret's value
    const secret = JSON.parse(secretValueResponse.SecretString);

    // Access individual values from the secret
    const clientID = secret.boxAppSettings.clientID;
    const clientSecret = secret.boxAppSettings.clientSecret;
    const publicKeyID = secret.boxAppSettings.appAuth.publicKeyID;
    const privateKey = secret.boxAppSettings.appAuth.privateKey;
    const passphrase = secret.boxAppSettings.appAuth.passphrase;
    const enterpriseID = secret.enterpriseID;

    console.log(clientID, clientSecret, publicKeyID, privateKey, passphrase, enterpriseID);

    

    return {
        statusCode: 200,
        body: JSON.stringify('Success!'),
    };
};
