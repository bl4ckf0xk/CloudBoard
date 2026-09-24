import React from 'react';
import { userService } from '@/lib/services';
import { INITIAL_USERS } from '@/lib/services/adapters/local/seedData';
import MemberDetailView from '@/components/dashboard/MemberDetailView';

export const dynamicParams = false;

export async function generateStaticParams() {
  return INITIAL_USERS.map((user) => ({
    id: user.id,
  }));
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await userService.getUserById(id)) || INITIAL_USERS.find((u) => u.id === id) || null;

  return <MemberDetailView initialUser={user} userId={id} />;
}
