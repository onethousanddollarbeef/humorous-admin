import LoginClient from "./LoginClient";

export default function LoginPage({
                                      searchParams,
                                  }: {
    searchParams: { error?: string };
}) {
    return <LoginClient error={searchParams?.error} />;
}