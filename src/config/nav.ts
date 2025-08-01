
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  UserCog,
  Wrench,
  ShoppingCart,
  BarChart3,
  BrainCircuit,
  Landmark,
  Settings,
  Calculator, // Adicionando Calculadora
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  role?: 'admin' | 'user'; 
  isBottom?: boolean; 
}

export const navItems: NavItem[] = [
  {
    title: 'Painel',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Financeiro',
    href: '/expenses',
    icon: Landmark,
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: Users,
  },
  {
    title: 'Produtos',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Fornecedores',
    href: '/providers',
    icon: Truck,
  },
   {
    title: 'Ordens de Serviço',
    href: '/service-orders',
    icon: Wrench,
  },
  {
    title: 'Vendas no Balcão',
    href: '/counter-sales',
    icon: ShoppingCart,
  },
  {
    title: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Diagnóstico IA',
    href: '/ai-diagnostics',
    icon: BrainCircuit,
  },
  {
    title: 'Calculadora',
    href: '/calculadora',
    icon: Calculator,
  },
  {
    title: 'Usuários',
    href: '/users',
    icon: UserCog,
    role: 'admin',
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
    isBottom: true,
  },
];
