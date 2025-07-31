
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

// All links now point to /dashboard, as it is the main view container.
export const navItems: NavItem[] = [
  {
    title: 'Painel',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Financeiro',
    href: '/dashboard',
    icon: Landmark,
  },
  {
    title: 'Clientes',
    href: '/dashboard',
    icon: Users,
  },
  {
    title: 'Produtos',
    href: '/dashboard',
    icon: Package,
  },
  {
    title: 'Fornecedores',
    href: '/dashboard',
    icon: Truck,
  },
  {
    title: 'Usuários',
    href: '/dashboard',
    icon: UserCog,
    role: 'admin',
  },
  {
    title: 'Ordens de Serviço',
    href: '/dashboard',
    icon: Wrench,
  },
  {
    title: 'Vendas no Balcão',
    href: '/dashboard',
    icon: ShoppingCart,
  },
  {
    title: 'Relatórios',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    title: 'Diagnóstico IA',
    href: '/dashboard',
    icon: BrainCircuit,
  },
  // Settings is no longer a main nav item, moved to user dropdown
];
