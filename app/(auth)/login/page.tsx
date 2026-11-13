// TODO: login UI.
// - Mothers: email OR phone number, then the one-time code (authClient.emailOtp / authClient.phoneNumber).
// - Clinic and admin staff: email + password (authClient.signIn.email).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
    </main>
  );
}
