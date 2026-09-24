/**
 * lib/services/adapters/aws/cognitoAuth.ts
 * Direct Cognito User Pool authentication helper with secure session storage and refresh handling.
 */

import { setAuthToken, clearAuthToken, getAuthToken } from './awsClient';

const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com`;

const REFRESH_TOKEN_KEY = 'cloudboard_cognito_refresh_token';
const AUTH_USER_KEY = 'cloudboard_cognito_user';

export interface CognitoUserSession {
  sub: string;
  email: string;
  dept?: string;
  name?: string;
  exp: number;
}

export interface AuthResult {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  user: CognitoUserSession;
  challengeName?: string;
  session?: string;
}

function getClientId(): string {
  if (!CLIENT_ID) {
    throw new Error('[Cognito Error] NEXT_PUBLIC_COGNITO_CLIENT_ID is not configured in environment variables.');
  }
  return CLIENT_ID;
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const clientId = getClientId();
  const payload = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email.trim(),
      PASSWORD: password,
    },
  };

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorType = data.__type || data.code || 'AuthError';
    const message = data.message || 'Authentication failed. Please check your credentials.';
    throw new Error(`[Cognito ${errorType}] ${message}`);
  }

  // Handle NEW_PASSWORD_REQUIRED challenge
  if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    return {
      idToken: '',
      accessToken: '',
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: data.Session,
      user: {
        sub: '',
        email: email.trim(),
        exp: 0,
      },
    };
  }

  const authResult = data.AuthenticationResult;
  if (!authResult || !authResult.IdToken) {
    throw new Error('No authentication tokens received from Cognito.');
  }

  const idToken = authResult.IdToken;
  const accessToken = authResult.AccessToken;
  const refreshToken = authResult.RefreshToken;

  // Persist Tokens in SessionStorage
  setAuthToken(idToken);

  if (refreshToken && typeof window !== 'undefined') {
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Parse claims
  const claims = parseJwt(idToken);
  const user: CognitoUserSession = {
    sub: claims?.sub || '',
    email: claims?.email || email,
    dept: claims?.['custom:dept'] || claims?.dept,
    name: claims?.name,
    exp: claims?.exp || 0,
  };

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  return {
    idToken,
    accessToken,
    refreshToken,
    user,
  };
}

/**
 * Silent token renewal using Cognito Refresh Token
 */
export async function cognitoRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) return null;

  try {
    const clientId = getClientId();
    const payload = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };

    const response = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.AuthenticationResult?.IdToken) {
      return null;
    }

    const newIdToken = data.AuthenticationResult.IdToken;
    const newAccessToken = data.AuthenticationResult.AccessToken;
    setAuthToken(newIdToken);

    const claims = parseJwt(newIdToken);
    const existingUser = getSessionUser();
    const updatedUser: CognitoUserSession = {
      sub: claims?.sub || existingUser?.sub || '',
      email: claims?.email || existingUser?.email || '',
      dept: claims?.['custom:dept'] || claims?.dept || existingUser?.dept,
      name: claims?.name || existingUser?.name,
      exp: claims?.exp || 0,
    };

    window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    return newIdToken;
  } catch {
    return null;
  }
}

/**
 * Initiate Forgot Password flow - sends verification code to user's registered email
 */
export async function cognitoForgotPassword(email: string): Promise<{ codeDeliveryDetails?: any }> {
  const clientId = getClientId();
  const payload = {
    ClientId: clientId,
    Username: email.trim(),
  };

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorType = data.__type || data.code || 'ForgotPasswordError';
    const message = data.message || 'Failed to request password reset code.';
    throw new Error(`[Cognito ${errorType}] ${message}`);
  }

  return {
    codeDeliveryDetails: data.CodeDeliveryDetails,
  };
}

/**
 * Confirm Forgot Password with verification code and new password
 */
export async function cognitoConfirmForgotPassword(
  email: string,
  confirmationCode: string,
  newPassword: string
): Promise<void> {
  const clientId = getClientId();
  const payload = {
    ClientId: clientId,
    Username: email.trim(),
    ConfirmationCode: confirmationCode.trim(),
    Password: newPassword,
  };

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorType = data.__type || data.code || 'ConfirmPasswordError';
    const message = data.message || 'Failed to reset password. Please check the code and requirements.';
    throw new Error(`[Cognito ${errorType}] ${message}`);
  }
}

/**
 * Respond to NEW_PASSWORD_REQUIRED challenge
 */
export async function cognitoRespondToNewPasswordRequired(
  email: string,
  newPassword: string,
  session: string
): Promise<AuthResult> {
  const clientId = getClientId();
  const payload = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: clientId,
    ChallengeResponses: {
      USERNAME: email.trim(),
      NEW_PASSWORD: newPassword,
    },
    Session: session,
  };

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorType = data.__type || data.code || 'ChallengeError';
    const message = data.message || 'Failed to set new password.';
    throw new Error(`[Cognito ${errorType}] ${message}`);
  }

  const authResult = data.AuthenticationResult;
  if (!authResult || !authResult.IdToken) {
    throw new Error('No authentication tokens received after password update.');
  }

  const idToken = authResult.IdToken;
  const accessToken = authResult.AccessToken;
  const refreshToken = authResult.RefreshToken;

  setAuthToken(idToken);
  if (refreshToken && typeof window !== 'undefined') {
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  const claims = parseJwt(idToken);
  const user: CognitoUserSession = {
    sub: claims?.sub || '',
    email: claims?.email || email,
    dept: claims?.['custom:dept'] || claims?.dept,
    name: claims?.name,
    exp: claims?.exp || 0,
  };

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  return {
    idToken,
    accessToken,
    refreshToken,
    user,
  };
}

export function getSessionUser(): CognitoUserSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const user: CognitoUserSession = JSON.parse(raw);
    const nowSecs = Math.floor(Date.now() / 1000);
    if (user.exp && user.exp < nowSecs) {
      // Token expired
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function isUserAuthenticated(): boolean {
  const token = getAuthToken();
  const user = getSessionUser();
  return Boolean(token && user);
}

export function cognitoSignOut(): void {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
}
