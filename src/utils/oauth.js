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
    console.log('🍎 Verifying Apple token...');
    
    // Timeout ekle - 10 saniye
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Apple token verification timeout')), 10000)
    );
    
    const verifyPromise = appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false
    });
    
    const appleIdTokenClaims = await Promise.race([verifyPromise, timeoutPromise]);
    
    console.log('✅ Apple token verified:', appleIdTokenClaims);

    return {
      providerId: appleIdTokenClaims.sub,
      email: appleIdTokenClaims.email,
      name: appleIdTokenClaims.email?.split('@')[0] || 'Apple User'
    };
  } catch (error) {
    console.error('❌ Apple token verification failed:', error.message);
    throw new Error(`Invalid Apple token: ${error.message}`);
  }
};
