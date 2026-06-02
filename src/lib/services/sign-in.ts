import { authClient } from "@/lib/auth/auth-client"; //import the auth client

export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard/business",
    errorCallbackURL: "/login",
    newUserCallbackURL: "/dashboard/business",
  });
};

export const signInWithEmailAndPassword = async (email: string, password: string) => {
  return await authClient.signIn.email({
    email,
    password,
  });
};
