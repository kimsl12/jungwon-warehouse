import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/overview"} />;
}
