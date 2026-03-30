import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { sql } from "./db";

const ADJECTIVES = [
  "Bold","Brave","Chill","Cool","Daring","Epic","Fierce","Grand",
  "Happy","Keen","Lucky","Mighty","Noble","Quick","Sharp","Slick",
  "Smart","Smooth","Solid","Steady","Swift","Calm","Bright","Witty",
  "Clutch","Prime","Based","Alpha","Crisp","Fresh","Hype","Lit",
  "Ace","Chief","Raw","Real","Zen","True","Peak","Woke",
];
const ANIMALS = [
  "Falcon","Tiger","Wolf","Eagle","Hawk","Lion","Bear","Fox",
  "Shark","Panther","Cobra","Raven","Jaguar","Phoenix","Viper","Otter",
  "Lynx","Puma","Stallion","Mantis","Raptor","Bison","Crane","Drake",
  "Hound","Marlin","Osprey","Rhino","Condor","Gecko","Moose","Oryx",
];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/onboarding",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      // Upsert user in Neon
      const rows = await sql`
        INSERT INTO users (email, name, avatar_url, provider, provider_account_id)
        VALUES (${user.email}, ${user.name}, ${user.image}, ${account.provider}, ${account.providerAccountId})
        ON CONFLICT (provider, provider_account_id) DO UPDATE SET
          email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = now()
        RETURNING id
      `;

      // Ensure profile exists
      if (rows[0]?.id) {
        await sql`
          INSERT INTO profiles (id, username, avatar_url)
          VALUES (${rows[0].id}, ${generateUsername()}, ${user.image})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        // First sign-in: look up user ID from our users table
        const rows = await sql`
          SELECT id FROM users
          WHERE provider = ${account.provider} AND provider_account_id = ${account.providerAccountId}
        `;
        token.userId = rows[0]?.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
