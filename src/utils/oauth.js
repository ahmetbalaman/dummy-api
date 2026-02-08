const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    
    return {
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture
    };
  } catch (error) {
    throw new Error('Invalid Google token');
  }
};

exports.verifyAppleToken = async (identityToken) => {
  try {
    const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false
    });

    return {
      providerId: appleIdTokenClaims.sub,
      email: appleIdTokenClaims.email,
      name: appleIdTokenClaims.email?.split('@')[0] || 'Apple User'
    };
  } catch (error) {
    throw new Error('Invalid Apple token');
  }
};
