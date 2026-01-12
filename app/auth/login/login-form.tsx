"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { supabase } from "@/lib/supabase";

type LoginFormProps = React.ComponentProps<"form">;

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", email)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Invalid username or password");
      return;
    }

    // Simpan session user
    localStorage.setItem("user", JSON.stringify({
      id: data.id,
      username: data.username,
      role: data.role
    }));

    // Redirect ikut role
    if (data.role === "admin") {
      router.push("/home");
    } else if (data.role === "guider") {
      router.push("/home");
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Login to your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>
        </div>

        {/* Email */}
        <Field>
        <Input
                id="email"
                type="text"
                placeholder="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
        </Field>

        {/* Password */}
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {/* Login Button */}
        <Field>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
