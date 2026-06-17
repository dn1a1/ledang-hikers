import Image from "next/image";
import Link from "next/link";
import { Mountain } from "lucide-react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="absolute inset-0">
        <Image
          src="/image/bg2.png"
          alt="Gunung Ledang background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] dark:bg-background/50" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium text-foreground"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mountain className="size-4" />
          </div>
          Trail Guard
        </Link>
        <LoginForm className="rounded-xl" />
      </div>
    </div>
  );
}
