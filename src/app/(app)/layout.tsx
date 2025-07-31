
"use client";

import type React from 'react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { navItems, type NavItem } from '@/config/nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, ChevronDown, Calculator, Mail, Settings } from 'lucide-react';
import { CalculatorComponent } from '@/components/calculator/calculator-component';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return null; 
  }
  
  const getInitials = (name: string = "Usuário") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const topNavItems = navItems.filter(item => !item.isBottom && (!item.role || item.role === userRole));
  const bottomNavItems = navItems.filter(item => item.isBottom && (!item.role || item.role === userRole));


  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-sidebar-foreground">
            <span className="font-headline">DonPhone</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-grow p-2">
          <SidebarMenu>
            {topNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.title, className: "text-xs" }}
                  className="data-[active=true]:text-sidebar-primary data-[active=true]:bg-sidebar-accent hover:text-sidebar-primary hover:bg-sidebar-accent"
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip={{ children: "Sair", className: "text-xs" }} className="hover:text-sidebar-primary hover:bg-sidebar-accent">
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
           <SidebarTrigger className="md:hidden text-foreground hover:text-primary" />
           <div className="flex-1">
             {/* Breadcrumbs or page title can go here */}
           </div>
           <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={() => setIsCalculatorOpen(true)} aria-label="Abrir Calculadora" className="text-muted-foreground hover:text-primary">
                <Calculator className="h-5 w-5" />
             </Button>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center gap-2 px-2 sm:px-3 text-foreground hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="Avatar do Usuário" data-ai-hint="user avatar" />
                    <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(userRole === 'admin' ? "Administrador" : "Usuário Padrão")}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{userRole === 'admin' ? "Administrador" : "Usuário Padrão"}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4"/>
                    <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSupportDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4"/>
                    <span>Suporte</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
      
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="p-0 max-w-xs border-none bg-transparent shadow-none">
          <CalculatorComponent />
        </DialogContent>
      </Dialog>

      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suporte Técnico</DialogTitle>
            <DialogDescription>
              Precisa de ajuda ou tem alguma dúvida? Entre em contato com o desenvolvedor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm">
              <strong>Desenvolvedor:</strong> Junior Alberti
            </p>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:junioralberti@gmail.com" className="text-sm text-primary hover:underline">
                junioralberti@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path><path d="M19.07 4.93A10 10 0 1 1 4.93 19.07"></path></svg>
              <a
                href="https://wa.me/5549991287685"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                (49) 99128-7685 (WhatsApp)
              </a>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
