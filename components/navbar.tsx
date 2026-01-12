'use client';

import Link from "next/link";
import { Menu, Mountain, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo with mountain icon */}
        <div className="flex items-center gap-3 text-xl font-bold tracking-tight">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Mountain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Ledang Hikers
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Mountaineering Portal
            </span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          <div className="mr-6 flex items-center gap-1 rounded-2xl border bg-card p-1.5">
            <NavLinks />
          </div>
          <ModeToggle />
          <Button 
            size="lg" 
            className="rounded-xl gap-2 px-6 shadow-sm hover:shadow transition-shadow"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        </div>

        {/* Mobile Drawer */}
        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button 
                variant="ghost" 
                size="lg"
                className="h-12 w-12 rounded-2xl border"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>

            <DrawerContent className="rounded-t-3xl border-t">
              <DrawerHeader className="border-b pb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Mountain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <DrawerTitle className="text-left text-xl font-bold">
                      Ledang Hikers
                    </DrawerTitle>
                    <span className="text-sm text-muted-foreground">
                      Mountaineering Portal
                    </span>
                  </div>
                </div>
              </DrawerHeader>

              <div className="flex flex-col gap-1 p-6">
                <NavLinks mobile />
              </div>

              <DrawerFooter className="gap-3 px-6 pb-8 pt-6">
                <div className="flex items-center justify-between rounded-2xl border p-4">
                  <span className="text-sm font-medium">Theme</span>
                  <ModeToggle />
                </div>
                <Button 
                  size="lg" 
                  className="rounded-xl gap-2 shadow-sm hover:shadow transition-shadow"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
                <DrawerClose asChild>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="rounded-xl"
                  >
                    Close Menu
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

      </div>
    </nav>
  );
}

// =====================
// Navigation Links
// =====================
function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const baseClass = "flex items-center justify-center font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95";

  if (mobile) {
    return (
      <>
        <Link 
          href="/" 
          className={`${baseClass} rounded-2xl border p-4 text-base hover:bg-accent hover:text-accent-foreground`}
        >
          Home ddd
        </Link>
        <Link 
          href="/map" 
          className={`${baseClass} rounded-2xl border p-4 text-base hover:bg-accent hover:text-accent-foreground`}
        >
          Map
        </Link>
        <Link 
          href="/dashboard" 
          className={`${baseClass} rounded-2xl border p-4 text-base hover:bg-accent hover:text-accent-foreground`}
        >
          Dashboard
        </Link>
        <Link 
          href="/report" 
          className={`${baseClass} rounded-2xl border p-4 text-base hover:bg-accent hover:text-accent-foreground`}
        >
          Report
        </Link>
      </>
    );
  }

  return (
    <>
      <Link 
        href="/home" 
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
      >
        Home
      </Link>
      <Link 
        href="/map" 
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
      >
        Live Map
      </Link>
      <Link 
        href="/dashboard" 
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
      >
        Dashboard
      </Link>
      <Link 
        href="/report" 
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
      >
        Report
      </Link>
    </>
  );
}