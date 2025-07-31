
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTotalSalesRevenue } from "@/services/salesService";
import { getTotalCompletedServiceOrdersRevenue, getCountOfOpenServiceOrders } from "@/services/serviceOrderService";
import { getClients } from "@/services/clientService";
import type { Client } from "@/lib/schemas/client";
import { navItems } from '@/config/nav';
import { useAuth } from '@/context/auth-context';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';


export default function DashboardPage() {
  const { userRole } = useAuth();
  const [isSettingUpDashboard, setIsSettingUpDashboard] = useState(true);

  const { data: totalSalesRevenue, isLoading: isLoadingSalesRevenue, error: salesRevenueError } = useQuery<number, Error>({
    queryKey: ["totalSalesRevenue"],
    queryFn: getTotalSalesRevenue,
  });

  const { data: totalOsRevenue, isLoading: isLoadingOsRevenue, error: osRevenueError } = useQuery<number, Error>({
    queryKey: ["totalOsRevenue"],
    queryFn: getTotalCompletedServiceOrdersRevenue,
  });

  const { data: clients, isLoading: isLoadingClients, error: clientsError } = useQuery<Client[], Error>({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  const { data: openServiceOrdersCount, isLoading: isLoadingOpenOsCount, error: openOsCountError } = useQuery<number, Error>({
    queryKey: ["openServiceOrdersCount"],
    queryFn: getCountOfOpenServiceOrders,
  });
  
  useEffect(() => {
    const dataLoading = isLoadingSalesRevenue || isLoadingOsRevenue || isLoadingClients || isLoadingOpenOsCount;
    if (!dataLoading) {
      setIsSettingUpDashboard(false);
    }
  }, [isLoadingSalesRevenue, isLoadingOsRevenue, isLoadingClients, isLoadingOpenOsCount]);

  const combinedTotalRevenue = (totalSalesRevenue || 0) + (totalOsRevenue || 0);
  const activeClientsCount = clients?.length || 0;

  const renderStatValue = (value: number | string, isLoading: boolean, isCurrency: boolean = false, error?: Error | null) => {
    if (isLoading || isSettingUpDashboard) return <Skeleton className="h-7 w-24 rounded bg-muted/50" />;
    if (error) return <div className="text-2xl font-bold text-destructive">Erro</div>;
    if (typeof value === 'number' && isCurrency) return <div className="text-2xl font-bold text-foreground">R$ {value.toFixed(2).replace('.', ',')}</div>;
    return <div className="text-2xl font-bold text-foreground">{value}</div>;
  };
  
  const renderStatSubtitle = (isLoading: boolean, error?: Error | null, defaultText: string = "Dados atualizados.") => {
     if (isLoading || isSettingUpDashboard) return <Skeleton className="h-3 w-32 bg-muted/50" />;
     if (error) return <p className="text-xs text-destructive">{error.message}</p>;
     return <p className="text-xs text-muted-foreground">{defaultText}</p>;
  };

  const dashboardNavItems = navItems.filter(item => 
    !item.isBottom && 
    item.href !== '/dashboard' && 
    (item.role ? item.role === userRole : true)
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-semibold text-accent">Painel</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total Bruta
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStatValue(combinedTotalRevenue, isSettingUpDashboard, true, salesRevenueError || osRevenueError)}
            {renderStatSubtitle(isSettingUpDashboard, salesRevenueError || osRevenueError, "Vendas + OS Concluídas/Entregues")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStatValue(activeClientsCount, isSettingUpDashboard, false, clientsError)}
            {renderStatSubtitle(isSettingUpDashboard, clientsError, "Total de clientes cadastrados.")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ordens de Serviço Abertas</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             {renderStatValue(openServiceOrdersCount ?? "0", isSettingUpDashboard, false, openOsCountError)}
             {renderStatSubtitle(isSettingUpDashboard, openOsCountError, "OS em Aberto, Em Andamento ou Aguardando Peça.")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reparos Pendentes</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStatValue(openServiceOrdersCount ?? "0", isSettingUpDashboard, false, openOsCountError)}
            {renderStatSubtitle(isSettingUpDashboard, openOsCountError, "Total de OS com reparo não finalizado.")}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Acesso Rápido aos Módulos</CardTitle>
          <CardDescription className="text-muted-foreground">Navegue rapidamente para as seções principais do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {dashboardNavItems.map((item) => (
             <Link href={item.href} key={item.href}>
                <Card className="hover:shadow-md hover:border-primary/50 transition-all duration-200 h-full bg-card hover:bg-card/90 cursor-pointer">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                    <item.icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-base font-semibold text-card-foreground">{item.title}</CardTitle>
                  </CardHeader>
                </Card>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
