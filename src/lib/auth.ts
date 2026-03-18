import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import { userTable } from '@/lib/tables';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        session_id: { label: 'Session ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await userTable.findByEmail(credentials.email);
        if (!user) return null;
        if (!bcrypt.compareSync(credentials.password, user.password_hash)) return null;

        // Restore stored session_id, or persist the anonymous one from the login request
        let sessionId = user.session_id;
        if (!sessionId && credentials.session_id) {
          sessionId = credentials.session_id;
          await userTable.setSessionId(user.id, sessionId);
        }

        return { id: String(user.id), email: user.email, name: user.name, role: user.role, session_id: sessionId };
      },
    }),
  ],
  pages: {
    signIn: '/admin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as typeof user & { role: 'admin' | 'event_manager' }).role;
        token.session_id = (user as typeof user & { session_id: string | null }).session_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.session_id = token.session_id;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
