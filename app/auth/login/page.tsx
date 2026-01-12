import { Mountain } from "lucide-react";
import { LoginForm } from "./login-form";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* LEFT – Login Section */}
      <div className="flex flex-col gap-6 p-6 md:p-10 bg-background">
        {/* Header */}
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/" 
            className="flex items-center gap-2 font-semibold text-xl text-foreground hover:text-primary transition-colors"
          >
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-md dark:shadow-primary/20">
              <Mountain className="size-5" />
            </div>
            <span className="tracking-tight">Ledang Hikers</span>
          </Link>
        </div>

        {/* Login Content */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue your adventure
              </p>
            </div>
            
            <div className="rounded-xl border bg-card p-6 shadow-lg dark:shadow-xl dark:shadow-black/10">
              <LoginForm />
            </div>

            {/* Footer Links */}
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                New to Ledang Hikers?{" "}
                <a 
                  href="/register" 
                  className="font-semibold text-primary hover:text-primary/90 hover:underline transition-colors"
                >
                  Create an account
                </a>
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  Forgot password?
                </a>
                <span className="text-muted-foreground">•</span>
                <a 
                  href="/contact" 
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  Need help?
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="text-center md:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ledang Hikers. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT – Hero Image Section */}
      <div className="relative hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 dark:from-gray-950 dark:to-black">
        {/* Image with proper fill */}
        <div className="absolute inset-0 overflow-hidden">
         <div className="relative h-full w-full">
  <Image
    src="/image/gunung-ledang (2).jpg"
    alt="Gunung Ledang mountain landscape"
    fill
    priority
    className="object-cover object-center opacity-90 dark:opacity-80"
  />
</div>

          
          {/* Gradient overlays for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        </div>

        {/* Optional text overlay */}
        <div className="relative z-10 flex h-full items-center justify-center px-10">
          <div className="text-center text-white max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm">
              <Mountain className="size-4" />
              <span>Explore the Majesty</span>
            </div>
            <h2 className="mb-4 text-4xl font-bold leading-tight">
              Conquer Mount Ledang
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              Join our community of adventurers and experience one of Malaysia{"'"}s 
              most breathtaking natural wonders. Every hike tells a story.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}