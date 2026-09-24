'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User, UserRole } from '@/lib/services/types';
import { userService } from '@/lib/services';
import { INITIAL_USERS } from '@/lib/services/adapters/local/seedData';
import {
  getSessionUser,
  cognitoSignIn,
  cognitoSignOut,
  cognitoForgotPassword,
  cognitoConfirmForgotPassword,
  cognitoRespondToNewPasswordRequired,
  cognitoRefreshToken,
  CognitoUserSession,
  isUserAuthenticated,
  AuthResult,
} from '@/lib/services/adapters/aws/cognitoAuth';
import { logger } from '@/lib/logger';

const isAwsBackend = process.env.NEXT_PUBLIC_DATA_SOURCE === 'aws';

const VALID_ROLES: Set<UserRole> = new Set(['leader', 'dept-head', 'committee', 'volunteer']);

function sanitizeUserRole(rawRole?: string): UserRole {
  if (!rawRole) return 'volunteer';
  const r = rawRole.toLowerCase().trim() as UserRole;
  return VALID_ROLES.has(r) ? r : 'volunteer';
}

const DEFAULT_ANONYMOUS_USER: User = {
  id: 'user-guest',
  name: 'Member',
  email: '',
  avatarInitials: 'MB',
  role: 'volunteer',
  deptId: 'engineering',
  joinDate: new Date().toISOString().split('T')[0],
  totalPoints: 0,
  avatarColor: '#16a34a',
};

interface RoleContextValue {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  refreshUsers: () => Promise<void>;
  getUsersByRole: (role: UserRole) => User[];
  isLeader: boolean;
  isDeptHead: boolean;
  isCommittee: boolean;
  isVolunteer: boolean;
  isCoreTeam: boolean;
  isMember: boolean;
  // Cognito Auth
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  cognitoUser: CognitoUserSession | null;
  signIn: (email: string, pass: string) => Promise<AuthResult>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<{ codeDeliveryDetails?: any }>;
  confirmForgotPassword: (email: string, code: string, newPass: string) => Promise<void>;
  completeNewPasswordChallenge: (email: string, newPass: string, session: string) => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const initialSeed = isAwsBackend ? [] : INITIAL_USERS;
  const defaultUser = initialSeed.find((u) => u.role === 'leader') ?? initialSeed[0] ?? DEFAULT_ANONYMOUS_USER;

  const [allUsers, setAllUsers] = useState<User[]>(initialSeed);
  const [currentUser, setCurrentUserState] = useState<User>(defaultUser);
  const [cognitoUser, setCognitoUser] = useState<CognitoUserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const refreshUsers = useCallback(async () => {
    try {
      const updated = await userService.getAllUsers();
      if (Array.isArray(updated) && updated.length > 0) {
        setAllUsers(updated);
        setCurrentUserState((prev) => {
          const match = updated.find((u) => u.id === prev.id || (u.email && u.email === prev.email));
          return match || prev;
        });
      }
    } catch (err: unknown) {
      logger.error('[RoleProvider] Failed to refresh users:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      try {
        let sessionUser = getSessionUser();
        let authed = isUserAuthenticated();

        // Attempt silent token refresh if session exists
        if (authed) {
          try {
            await cognitoRefreshToken();
            sessionUser = getSessionUser();
            authed = isUserAuthenticated();
          } catch (refreshErr) {
            logger.warn('[RoleProvider] Background token refresh skipped:', refreshErr);
          }
        }

        if (isMounted) {
          setCognitoUser(sessionUser);
          setIsAuthenticated(authed);
        }

        const [users, user] = await Promise.all([
          userService.getAllUsers(),
          userService.getCurrentUser(),
        ]);

        if (isMounted) {
          if (Array.isArray(users) && users.length > 0) {
            setAllUsers(users);
            if (sessionUser) {
              const matchedUser = users.find(
                (u) =>
                  (u.email && u.email.toLowerCase() === sessionUser.email.toLowerCase()) ||
                  u.id === sessionUser.sub
              );
              if (matchedUser) {
                setCurrentUserState(matchedUser);
              } else {
                setCurrentUserState({
                  id: sessionUser.sub || 'cognito-user',
                  name: sessionUser.name || sessionUser.email.split('@')[0],
                  email: sessionUser.email,
                  avatarInitials: (sessionUser.name || sessionUser.email).slice(0, 2).toUpperCase(),
                  role: sanitizeUserRole(sessionUser.dept),
                  deptId: 'engineering',
                  joinDate: new Date().toISOString().split('T')[0],
                  totalPoints: 0,
                  avatarColor: '#16a34a',
                });
              }
            }
          }
          if (user && !sessionUser) {
            setCurrentUserState(user);
          }
        }
      } catch (err: unknown) {
        logger.error('[RoleProvider] Failed to load session:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
  }, []);

  const signIn = useCallback(
    async (email: string, pass: string): Promise<AuthResult> => {
      const result = await cognitoSignIn(email, pass);
      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        return result;
      }
      setCognitoUser(result.user);
      setIsAuthenticated(true);
      await refreshUsers();
      const updated = await userService.getAllUsers();
      const matched = updated.find(
        (u) =>
          (u.email && u.email.toLowerCase() === result.user.email.toLowerCase()) ||
          u.id === result.user.sub
      );
      if (matched) {
        setCurrentUserState(matched);
      } else {
        setCurrentUserState({
          id: result.user.sub || `user-${Date.now()}`,
          name: result.user.name || email.split('@')[0],
          email: result.user.email,
          avatarInitials: email.slice(0, 2).toUpperCase(),
          role: sanitizeUserRole(result.user.dept),
          deptId: 'engineering',
          joinDate: new Date().toISOString().split('T')[0],
          totalPoints: 0,
          avatarColor: '#16a34a',
        });
      }
      return result;
    },
    [refreshUsers]
  );

  const signOut = useCallback(() => {
    cognitoSignOut();
    setCognitoUser(null);
    setIsAuthenticated(false);
    const defaultFallback = allUsers.find((u) => u.role === 'leader') ?? allUsers[0] ?? DEFAULT_ANONYMOUS_USER;
    if (defaultFallback) setCurrentUserState(defaultFallback);
  }, [allUsers]);

  const forgotPassword = useCallback(async (email: string) => {
    return await cognitoForgotPassword(email);
  }, []);

  const confirmForgotPassword = useCallback(async (email: string, code: string, newPass: string) => {
    await cognitoConfirmForgotPassword(email, code, newPass);
  }, []);

  const completeNewPasswordChallenge = useCallback(
    async (email: string, newPass: string, session: string) => {
      const result = await cognitoRespondToNewPasswordRequired(email, newPass, session);
      setCognitoUser(result.user);
      setIsAuthenticated(true);
      await refreshUsers();
      const updated = await userService.getAllUsers();
      const matched = updated.find(
        (u) =>
          (u.email && u.email.toLowerCase() === result.user.email.toLowerCase()) ||
          u.id === result.user.sub
      );
      if (matched) {
        setCurrentUserState(matched);
      }
    },
    [refreshUsers]
  );

  const role = currentUser?.role || 'volunteer';

  const value: RoleContextValue = {
    currentUser,
    setCurrentUser,
    allUsers,
    refreshUsers,
    getUsersByRole: (r: UserRole) => allUsers.filter((u) => u.role === r),
    isLeader: role === 'leader',
    isDeptHead: role === 'dept-head',
    isCommittee: role === 'committee',
    isVolunteer: role === 'volunteer',
    isCoreTeam: role === 'committee' || role === 'dept-head' || role === 'leader',
    isMember: role === 'volunteer',
    isAuthenticated,
    isLoadingAuth,
    cognitoUser,
    signIn,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    completeNewPasswordChallenge,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}

export type { RoleContextValue };
