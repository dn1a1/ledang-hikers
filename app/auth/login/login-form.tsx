"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type LoginFormProps = React.ComponentProps<"div">;

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage("Invalid username or password");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
      })
    );

    if (data.role === "admin" || data.role === "guider") {
      router.push("/home");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="panel-surface gap-0 border-border/70 bg-card/95 py-0 shadow-lg backdrop-blur-sm">
        <CardHeader className="border-b border-border/70 bg-muted/30 text-center">
          <div className="flex flex-col items-center gap-3">
            <Badge variant="outline" className="theme-chip-info mt-4">
              Secure Access
            </Badge>
          </div>
          <CardTitle className="text-xl text-foreground">Welcome back</CardTitle>
          <CardDescription>
            Login with your admin account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="your username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background/80"
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background/80"
                  placeholder="*******"
                />
              </Field>

              {errorMessage && (
                <div className="theme-callout theme-callout-danger">
                  <FieldDescription className="theme-text-danger text-center">
                    {errorMessage}
                  </FieldDescription>
                </div>
              )}

              <Field className="gap-3">
                <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
                  {isSubmitting ? "Signing In..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="#">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      
    </div>
  );
}
