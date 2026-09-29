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
  deptId: 'marketing-design',
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
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const initialSeed = INITIAL_USERS;
  const defaultUser = initialSeed.find((u) => u.role === 'leader') ?? initialSeed[0] ?? DEFAULT_ANONYMOUS_USER;

  const [allUsers, setAllUsers] = useState<User[]>(initialSeed);
  const [currentUser, setCurrentUserState] = useState<User>(defaultUser);
  const [cognitoUser, setCognitoUser] = useState<CognitoUserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!isAwsBackend);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(isAwsBackend);

  const updateUserAvatar = useCallback(async (avatarUrl: string) => {
    try {
      const updated = await userService.updateUserAvatar(currentUser.id, avatarUrl);
      setCurrentUserState((prev) => ({ ...prev, ...updated, avatarUrl }));
      setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, avatarUrl } : u)));
    } catch (err) {
      logger.error('[RoleProvider] Failed to update avatar:', err);
      setCurrentUserState((prev) => ({ ...prev, avatarUrl }));
      setAllUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, avatarUrl } : u)));
    }
  }, [currentUser.id]);

  // Sync avatar updates from other tabs / components
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; avatarUrl: string }>;
      if (customEvent.detail) {
        const { userId, avatarUrl } = customEvent.detail;
        setCurrentUserState((prev) => (prev.id === userId ? { ...prev, avatarUrl } : prev));
        setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, avatarUrl } : u)));
      }
    };
    window.addEventListener('cloudboard-avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('cloudboard-avatar-updated', handleAvatarUpdate);
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const updated = await userService.getAllUsers();
      if (Array.isArray(updated) && updated.length > 0) {
        setAllUsers(updated);
        setCurrentUserState((prev) => {
          const match = updated.find((u) => u.id === prev.id || (u.email && u.email === prev.email));
          if (!match) return prev;
          const fallbackAvatar =
            match.avatarUrl ||
            (typeof window !== 'undefined'
              ? window.localStorage.getItem(`cloudboard_avatar_${match.id}`) ||
                (match.email ? window.localStorage.getItem(`cloudboard_avatar_by_email_${match.email.toLowerCase()}`) : null) ||
                prev.avatarUrl
              : prev.avatarUrl);
          return { ...match, avatarUrl: fallbackAvatar };
        });
      }
    } catch (err: unknown) {
      logger.error('[RoleProvider] Failed to refresh users:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      if (!isAwsBackend) {
        try {
          const [users, user] = await Promise.all([
            userService.getAllUsers(),
            userService.getCurrentUser(),
          ]);
          if (isMounted) {
            if (Array.isArray(users) && users.length > 0) {
              setAllUsers(users);
              const leader = users.find((u) => u.role === 'leader') ?? users[0];
              setCurrentUserState(leader);
            }
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
          }
        } catch (demoErr) {
          logger.warn('[RoleProvider] Demo load error:', demoErr);
          if (isMounted) {
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
          }
        }
        return;
      }
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
                const storedAvatar =
                  matchedUser.avatarUrl ||
                  (typeof window !== 'undefined'
                    ? window.localStorage.getItem(`cloudboard_avatar_${matchedUser.id}`) ||
                      (matchedUser.email
                        ? window.localStorage.getItem(`cloudboard_avatar_by_email_${matchedUser.email.toLowerCase()}`)
                        : null) ||
                      undefined
                    : undefined) ||
                  undefined;
                const safeMatched: User = {
                  ...matchedUser,
                  deptId: matchedUser.role === 'leader' ? ('' as any) : matchedUser.deptId,
                  avatarUrl: storedAvatar,
                };
                setCurrentUserState(safeMatched);
              } else {
                const storedAvatar =
                  (typeof window !== 'undefined'
                    ? window.localStorage.getItem(`cloudboard_avatar_${sessionUser.sub}`) ||
                      window.localStorage.getItem(`cloudboard_avatar_by_email_${sessionUser.email.toLowerCase()}`) ||
                      undefined
                    : undefined) || undefined;
                const userRole = sanitizeUserRole(sessionUser.dept || (sessionUser as any).role);
                setCurrentUserState({
                  id: sessionUser.sub || 'cognito-user',
                  name: sessionUser.name || sessionUser.email.split('@')[0],
                  email: sessionUser.email,
                  avatarInitials: (sessionUser.name || sessionUser.email).slice(0, 2).toUpperCase(),
                  avatarUrl: storedAvatar,
                  role: userRole,
                  deptId: userRole === 'leader' ? ('' as any) : 'marketing-design',
                  joinDate: new Date().toISOString().split('T')[0],
                  totalPoints: 0,
                  avatarColor: '#16a34a',
                });
              }
            }
          }
          if (user && !sessionUser) {
            const storedAvatar =
              user.avatarUrl ||
              (typeof window !== 'undefined'
                ? window.localStorage.getItem(`cloudboard_avatar_${user.id}`) ||
                  (user.email
                    ? window.localStorage.getItem(`cloudboard_avatar_by_email_${user.email.toLowerCase()}`)
                    : null) ||
                  undefined
                : undefined) ||
              undefined;
            const safeUser: User = {
              ...user,
              deptId: user.role === 'leader' ? ('' as any) : user.deptId,
              avatarUrl: storedAvatar,
            };
            setCurrentUserState(safeUser);
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
    const safeUser: User = {
      ...user,
      deptId: user.role === 'leader' ? ('' as any) : user.deptId,
    };
    setCurrentUserState(safeUser);
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
        setCurrentUserState({
          ...matched,
          deptId: matched.role === 'leader' ? ('' as any) : matched.deptId,
        });
      } else {
        const userRole = sanitizeUserRole(result.user.dept || (result.user as any).role);
        setCurrentUserState({
          id: result.user.sub || `user-${Date.now()}`,
          name: result.user.name || email.split('@')[0],
          email: result.user.email,
          avatarInitials: email.slice(0, 2).toUpperCase(),
          role: userRole,
          deptId: userRole === 'leader' ? ('' as any) : 'marketing-design',
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
    if (defaultFallback) {
      setCurrentUserState({
        ...defaultFallback,
        deptId: defaultFallback.role === 'leader' ? ('' as any) : defaultFallback.deptId,
      });
    }
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
    updateUserAvatar,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}

export type { RoleContextValue };
